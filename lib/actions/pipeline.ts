'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import type { PipelineStage, RejectionReason } from '@prisma/client'

const candidateWithTags = {
  include: { tags: { include: { tag: true } } },
} as const

export async function getBoardApplications(jobId: string) {
  await requireSession()
  return prisma.application.findMany({
    where: { jobId },
    include: { candidate: candidateWithTags, job: true },
    orderBy: { createdAt: 'asc' },
  })
}

// Cross-job master board: every application still in process across all
// open/on-hold positions. Closed jobs are excluded — their candidates are no
// longer actively "in process."
export async function getAllBoardApplications() {
  await requireSession()
  return prisma.application.findMany({
    where: { job: { status: { in: ['OPEN', 'ON_HOLD'] } } },
    include: { candidate: candidateWithTags, job: true },
    orderBy: { createdAt: 'asc' },
  })
}

export async function transitionStage(
  applicationId: string,
  toStage: PipelineStage,
  rejectionReason?: RejectionReason
) {
  const user = await requireSession()

  const application = await prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
  })

  if (application.stage === toStage) return

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: {
        stage: toStage,
        rejectionReason: toStage === 'REJECTED' ? (rejectionReason ?? null) : null,
        ...(toStage === 'HIRED' ? { hiredAt: new Date() } : {}),
        ...(toStage === 'REJECTED' ? { rejectedAt: new Date() } : {}),
      },
    }),
    prisma.stageHistory.create({
      data: {
        applicationId,
        fromStage: application.stage,
        toStage,
        changedById: user.id,
      },
    }),
  ])

  revalidatePath(`/jobs/${application.jobId}`)
  revalidatePath('/pipeline')
  revalidatePath(`/candidates/${application.candidateId}`)
}
