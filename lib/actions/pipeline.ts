'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { VISIBLE_APPLICATION } from '@/lib/candidate-visibility'
import { STAGE_LABELS, rejectionReasonText } from '@/lib/pipeline'
import type { PipelineStage, RejectionReason } from '@prisma/client'

export async function getBoardApplications(jobId: string) {
  await requireSession()
  return prisma.application.findMany({
    where: { jobId, ...VISIBLE_APPLICATION },
    include: { candidate: true, job: true },
    orderBy: { createdAt: 'asc' },
  })
}

// The jobs the signed-in user is the recruiter on. Returned as ids rather
// than applications so the board can scope itself client-side, the same way
// its job filter already does, instead of a round trip per toggle.
export async function getMyRecruiterJobIds(): Promise<string[]> {
  const user = await requireSession()
  const jobs = await prisma.job.findMany({
    where: { assignments: { some: { userId: user.id, role: 'RECRUITER' } } },
    select: { id: true },
  })
  return jobs.map((j) => j.id)
}

// Cross-job master board: every application still in process across all
// open/on-hold positions. Closed jobs are excluded — their candidates are no
// longer actively "in process."
export async function getAllBoardApplications() {
  await requireSession()
  return prisma.application.findMany({
    where: { job: { status: { in: ['OPEN', 'ON_HOLD'] } }, ...VISIBLE_APPLICATION },
    include: { candidate: true, job: true },
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
