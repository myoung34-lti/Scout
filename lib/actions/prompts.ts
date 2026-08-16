'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { promptSchema } from '@/lib/validation/prompt'
import type { PromptCategory } from '@prisma/client'

export type PromptSearchFilters = {
  query?: string
  category?: PromptCategory
  status?: 'active' | 'inactive'
}

export async function searchPrompts(filters: PromptSearchFilters) {
  await requireSession()

  const { query, category, status } = filters

  return prisma.prompt.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { key: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
      ...(status ? { isActive: status === 'active' } : {}),
    },
    include: { currentVersion: true },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getPrompt(promptId: string) {
  await requireSession()

  return prisma.prompt.findUnique({
    where: { id: promptId },
    include: {
      currentVersion: true,
      versions: {
        include: { createdBy: true },
        orderBy: { version: 'desc' },
      },
      createdBy: true,
      updatedBy: true,
    },
  })
}

type PromptFormState = {
  errors?: Record<string, string[] | undefined>
} | undefined

export async function createPrompt(
  _prevState: PromptFormState,
  formData: FormData
): Promise<PromptFormState> {
  const user = await requireSession()

  const parsed = promptSchema.safeParse({
    key: formData.get('key'),
    name: formData.get('name'),
    description: formData.get('description'),
    category: formData.get('category'),
    content: formData.get('content'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const existing = await prisma.prompt.findUnique({
    where: { key: parsed.data.key },
    select: { id: true },
  })
  if (existing) {
    return { errors: { key: ['That key is already in use'] } }
  }

  const { key, name, description, category, content } = parsed.data

  const prompt = await prisma.$transaction(async (tx) => {
    const created = await tx.prompt.create({
      data: {
        key,
        name,
        description,
        category,
        createdById: user.id,
        updatedById: user.id,
      },
    })
    const version = await tx.promptVersion.create({
      data: { promptId: created.id, version: 1, content, createdById: user.id },
    })
    return tx.prompt.update({
      where: { id: created.id },
      data: { currentVersionId: version.id },
    })
  })

  revalidatePath('/prompts')
  redirect(`/prompts/${prompt.id}`)
}

export async function saveEditedPrompt(
  promptId: string,
  _prevState: PromptFormState,
  formData: FormData
): Promise<PromptFormState> {
  const user = await requireSession()

  const parsed = promptSchema
    .omit({ key: true })
    .safeParse({
      name: formData.get('name'),
      description: formData.get('description'),
      category: formData.get('category'),
      content: formData.get('content'),
    })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { name, description, category, content } = parsed.data

  const current = await prisma.prompt.findUniqueOrThrow({
    where: { id: promptId },
    include: { currentVersion: true },
  })
  const nextVersionNumber = (current.currentVersion?.version ?? 0) + 1

  await prisma.$transaction(async (tx) => {
    const version = await tx.promptVersion.create({
      data: { promptId, version: nextVersionNumber, content, createdById: user.id },
    })
    await tx.prompt.update({
      where: { id: promptId },
      data: {
        name,
        description,
        category,
        currentVersionId: version.id,
        updatedById: user.id,
      },
    })
  })

  revalidatePath('/prompts')
  revalidatePath(`/prompts/${promptId}`)
  redirect(`/prompts/${promptId}`)
}

// Restoring an old version never rewrites history — it copies that
// version's content into a brand new version at the top of the stack.
export async function restoreVersion(promptId: string, versionId: string) {
  const user = await requireSession()

  const [prompt, versionToRestore] = await Promise.all([
    prisma.prompt.findUniqueOrThrow({
      where: { id: promptId },
      include: { currentVersion: true },
    }),
    prisma.promptVersion.findUniqueOrThrow({ where: { id: versionId } }),
  ])

  if (versionToRestore.promptId !== promptId) {
    throw new Error('Version does not belong to this prompt')
  }

  const nextVersionNumber = (prompt.currentVersion?.version ?? 0) + 1

  await prisma.$transaction(async (tx) => {
    const version = await tx.promptVersion.create({
      data: {
        promptId,
        version: nextVersionNumber,
        content: versionToRestore.content,
        createdById: user.id,
      },
    })
    await tx.prompt.update({
      where: { id: promptId },
      data: { currentVersionId: version.id, updatedById: user.id },
    })
  })

  revalidatePath('/prompts')
  revalidatePath(`/prompts/${promptId}`)
}

export async function duplicatePrompt(promptId: string) {
  const user = await requireSession()

  const source = await prisma.prompt.findUniqueOrThrow({
    where: { id: promptId },
    include: { currentVersion: true },
  })

  let key = `${source.key}_copy`
  let suffix = 2
  while (await prisma.prompt.findUnique({ where: { key }, select: { id: true } })) {
    key = `${source.key}_copy_${suffix}`
    suffix += 1
  }

  const duplicate = await prisma.$transaction(async (tx) => {
    const created = await tx.prompt.create({
      data: {
        key,
        name: `${source.name} (Copy)`,
        description: source.description,
        category: source.category,
        isActive: false,
        createdById: user.id,
        updatedById: user.id,
      },
    })
    const version = await tx.promptVersion.create({
      data: {
        promptId: created.id,
        version: 1,
        content: source.currentVersion?.content ?? '',
        createdById: user.id,
      },
    })
    return tx.prompt.update({
      where: { id: created.id },
      data: { currentVersionId: version.id },
    })
  })

  revalidatePath('/prompts')
  redirect(`/prompts/${duplicate.id}`)
}

// Deliberately separate from saveEditedPrompt — the key is code-facing and
// should only change via an explicit, guarded action, never as a side
// effect of an ordinary content edit.
export async function updatePromptKey(
  promptId: string,
  key: string
): Promise<{ error: string } | { ok: true }> {
  const user = await requireSession()

  const parsed = promptSchema.shape.key.safeParse(key)
  if (!parsed.success) {
    const message: string = parsed.error.issues[0]?.message ?? 'Invalid key'
    return { error: message }
  }

  const existing = await prisma.prompt.findUnique({
    where: { key: parsed.data },
    select: { id: true },
  })
  if (existing && existing.id !== promptId) {
    return { error: 'That key is already in use' }
  }

  await prisma.prompt.update({
    where: { id: promptId },
    data: { key: parsed.data, updatedById: user.id },
  })

  revalidatePath('/prompts')
  revalidatePath(`/prompts/${promptId}`)
  return { ok: true as const }
}

export async function setPromptActive(promptId: string, isActive: boolean) {
  const user = await requireSession()

  await prisma.prompt.update({
    where: { id: promptId },
    data: { isActive, updatedById: user.id },
  })

  revalidatePath('/prompts')
  revalidatePath(`/prompts/${promptId}`)
}
