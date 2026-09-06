'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { emailTemplateSchema } from '@/lib/validation/email-template'

export type EmailTemplateSearchFilters = {
  query?: string
  status?: 'active' | 'inactive'
}

export async function searchEmailTemplates(filters: EmailTemplateSearchFilters) {
  await requireSession()

  const { query, status } = filters

  return prisma.emailTemplate.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(status ? { isActive: status === 'active' } : {}),
    },
    include: { currentVersion: true },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getEmailTemplate(templateId: string) {
  await requireSession()

  return prisma.emailTemplate.findUnique({
    where: { id: templateId },
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

type EmailTemplateFormState = {
  errors?: Record<string, string[] | undefined>
} | undefined

export async function createEmailTemplate(
  _prevState: EmailTemplateFormState,
  formData: FormData
): Promise<EmailTemplateFormState> {
  const user = await requireSession()

  const parsed = emailTemplateSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    subject: formData.get('subject'),
    bodyHtml: formData.get('bodyHtml'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { name, description, subject, bodyHtml } = parsed.data

  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.emailTemplate.create({
      data: { name, description, createdById: user.id, updatedById: user.id },
    })
    const version = await tx.emailTemplateVersion.create({
      data: { emailTemplateId: created.id, version: 1, subject, bodyHtml, createdById: user.id },
    })
    return tx.emailTemplate.update({
      where: { id: created.id },
      data: { currentVersionId: version.id },
    })
  })

  revalidatePath('/email-templates')
  redirect(`/email-templates/${template.id}`)
}

export async function saveEditedEmailTemplate(
  templateId: string,
  _prevState: EmailTemplateFormState,
  formData: FormData
): Promise<EmailTemplateFormState> {
  const user = await requireSession()

  const parsed = emailTemplateSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    subject: formData.get('subject'),
    bodyHtml: formData.get('bodyHtml'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { name, description, subject, bodyHtml } = parsed.data

  const current = await prisma.emailTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: { currentVersion: true },
  })
  const nextVersionNumber = (current.currentVersion?.version ?? 0) + 1

  await prisma.$transaction(async (tx) => {
    const version = await tx.emailTemplateVersion.create({
      data: {
        emailTemplateId: templateId,
        version: nextVersionNumber,
        subject,
        bodyHtml,
        createdById: user.id,
      },
    })
    await tx.emailTemplate.update({
      where: { id: templateId },
      data: { name, description, currentVersionId: version.id, updatedById: user.id },
    })
  })

  revalidatePath('/email-templates')
  revalidatePath(`/email-templates/${templateId}`)
  redirect(`/email-templates/${templateId}`)
}

// Restoring an old version never rewrites history — it copies that
// version's content into a brand new version at the top of the stack.
export async function restoreVersion(templateId: string, versionId: string) {
  const user = await requireSession()

  const [template, versionToRestore] = await Promise.all([
    prisma.emailTemplate.findUniqueOrThrow({
      where: { id: templateId },
      include: { currentVersion: true },
    }),
    prisma.emailTemplateVersion.findUniqueOrThrow({ where: { id: versionId } }),
  ])

  if (versionToRestore.emailTemplateId !== templateId) {
    throw new Error('Version does not belong to this template')
  }

  const nextVersionNumber = (template.currentVersion?.version ?? 0) + 1

  await prisma.$transaction(async (tx) => {
    const version = await tx.emailTemplateVersion.create({
      data: {
        emailTemplateId: templateId,
        version: nextVersionNumber,
        subject: versionToRestore.subject,
        bodyHtml: versionToRestore.bodyHtml,
        createdById: user.id,
      },
    })
    await tx.emailTemplate.update({
      where: { id: templateId },
      data: { currentVersionId: version.id, updatedById: user.id },
    })
  })

  revalidatePath('/email-templates')
  revalidatePath(`/email-templates/${templateId}`)
}

export async function duplicateEmailTemplate(templateId: string) {
  const user = await requireSession()

  const source = await prisma.emailTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: { currentVersion: true },
  })

  const duplicate = await prisma.$transaction(async (tx) => {
    const created = await tx.emailTemplate.create({
      data: {
        name: `${source.name} (Copy)`,
        description: source.description,
        isActive: false,
        createdById: user.id,
        updatedById: user.id,
      },
    })
    const version = await tx.emailTemplateVersion.create({
      data: {
        emailTemplateId: created.id,
        version: 1,
        subject: source.currentVersion?.subject ?? '',
        bodyHtml: source.currentVersion?.bodyHtml ?? '',
        createdById: user.id,
      },
    })
    return tx.emailTemplate.update({
      where: { id: created.id },
      data: { currentVersionId: version.id },
    })
  })

  revalidatePath('/email-templates')
  redirect(`/email-templates/${duplicate.id}`)
}

export async function setEmailTemplateActive(templateId: string, isActive: boolean) {
  const user = await requireSession()

  await prisma.emailTemplate.update({
    where: { id: templateId },
    data: { isActive, updatedById: user.id },
  })

  revalidatePath('/email-templates')
  revalidatePath(`/email-templates/${templateId}`)
}
