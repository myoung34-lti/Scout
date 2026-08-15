'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function listTags() {
  await requireSession()
  const tags = await prisma.tag.findMany({ orderBy: { displayLabel: 'asc' } })
  return tags.map((t) => t.displayLabel)
}

export async function listTagOptions() {
  await requireSession()
  return prisma.tag.findMany({
    select: { id: true, displayLabel: true },
    orderBy: { displayLabel: 'asc' },
  })
}

export async function addTagToCandidate(candidateId: string, rawLabel: string) {
  await requireSession()

  const displayLabel = rawLabel.trim()
  if (!displayLabel) return

  const label = displayLabel.toLowerCase()

  const tag = await prisma.tag.upsert({
    where: { label },
    update: {},
    create: { label, displayLabel },
  })

  await prisma.candidateTag.upsert({
    where: { candidateId_tagId: { candidateId, tagId: tag.id } },
    update: {},
    create: { candidateId, tagId: tag.id },
  })

  revalidatePath(`/candidates/${candidateId}`)
  revalidatePath('/candidates')
  revalidatePath('/pipeline')
  revalidatePath('/jobs/[jobId]', 'page')
}

export async function removeTagFromCandidate(
  candidateId: string,
  tagId: string
) {
  await requireSession()

  await prisma.candidateTag.delete({
    where: { candidateId_tagId: { candidateId, tagId } },
  })

  revalidatePath(`/candidates/${candidateId}`)
  revalidatePath('/candidates')
  revalidatePath('/pipeline')
  revalidatePath('/jobs/[jobId]', 'page')
}
