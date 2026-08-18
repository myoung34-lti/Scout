'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { STAGE_LABELS, rejectionReasonText } from '@/lib/pipeline'
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
  rejectionReason?: RejectionReason,
  customRejectionReason?: string
) {
  const user = await requireSession()

  const application = await prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: { job: true },
  })

  if (application.stage === toStage) return

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: {
        stage: toStage,
        rejectionReason: toStage === 'REJECTED' ? (rejectionReason ?? null) : null,
        customRejectionReason:
          toStage === 'REJECTED' && rejectionReason === 'OTHER'
            ? (customRejectionReason ?? null)
            : null,
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
    ...(toStage === 'REJECTED'
      ? [
          prisma.activityNote.create({
            data: {
              candidateId: application.candidateId,
              applicationId,
              authorId: user.id,
              body: `Rejected from ${application.job.internalName}${
                rejectionReason
                  ? ` (${rejectionReasonText(rejectionReason, customRejectionReason ?? null)})`
                  : ''
              }`,
            },
          }),
        ]
      : []),
  ])

  revalidatePath(`/jobs/${application.jobId}`)
  revalidatePath('/pipeline')
  revalidatePath(`/candidates/${application.candidateId}`)
}

// Reactivates a rejected application — restores whichever stage it was in
// right before rejection (from the StageHistory row rejection itself wrote),
// falling back to Applied if that's somehow unavailable.
export async function revertRejection(applicationId: string) {
  const user = await requireSession()

  const application = await prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: { job: true },
  })

  if (application.stage !== 'REJECTED') return

  const lastRejection = await prisma.stageHistory.findFirst({
    where: { applicationId, toStage: 'REJECTED' },
    orderBy: { changedAt: 'desc' },
  })
  const restoredStage = lastRejection?.fromStage ?? 'APPLIED'

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: {
        stage: restoredStage,
        rejectionReason: null,
        customRejectionReason: null,
        rejectedAt: null,
      },
    }),
    prisma.stageHistory.create({
      data: {
        applicationId,
        fromStage: 'REJECTED',
        toStage: restoredStage,
        changedById: user.id,
      },
    }),
    prisma.activityNote.create({
      data: {
        candidateId: application.candidateId,
        applicationId,
        authorId: user.id,
        body: `Reactivated for ${application.job.internalName} — moved back to ${STAGE_LABELS[restoredStage]}`,
      },
    }),
  ])

  revalidatePath(`/jobs/${application.jobId}`)
  revalidatePath('/pipeline')
  revalidatePath(`/candidates/${application.candidateId}`)
}
