'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { emailVariableSchema } from '@/lib/validation/email-variable'

export async function createEmailVariable(
  data: unknown
): Promise<{ error: string } | { ok: true }> {
  await requireSession()

  const parsed = emailVariableSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid variable' }
  }

  const existing = await prisma.emailVariable.findUnique({
    where: { key: parsed.data.key },
    select: { id: true },
  })
  if (existing) {
    return { error: 'That key is already in use' }
  }

  await prisma.emailVariable.create({ data: parsed.data })

  revalidatePath('/admin')
  return { ok: true as const }
}

export async function updateEmailVariable(
  id: string,
  data: { label: string; value: string }
): Promise<{ error: string } | { ok: true }> {
  await requireSession()

  const parsed = emailVariableSchema.omit({ key: true }).safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid variable' }
  }

  await prisma.emailVariable.update({ where: { id }, data: parsed.data })

  revalidatePath('/admin')
  return { ok: true as const }
}

export async function deleteEmailVariable(id: string): Promise<void> {
  await requireSession()

  await prisma.emailVariable.delete({ where: { id } })

  revalidatePath('/admin')
}
