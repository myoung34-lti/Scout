'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { VISIBLE_APPLICATION } from '@/lib/candidate-visibility'
import {
  STAGE_LABELS,
  rejectionReasonText,
  nextActiveStage,
  TERMINAL_STAGES,
} from '@/lib/pipeline'
import type { PipelineStage, RejectionReason } from '@prisma/client'

export async function getBoardApplications(jobId: string) {
  await requireSession()
  return prisma.application.findMany({
    where: { jobId, ...VISIBLE_APPLICATION },
    include: { candidate: true, job: true },
    orderBy: { createdAt: 'asc' },
  })
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

type TransitionTarget = {
  id: string
  stage: PipelineStage
  jobId: string
  candidateId: string
  job: { internalName: string }
}

// The single-application move, shared by the one-at-a-time transition and the
// bulk action below so the two can't drift apart on stage history, hiredAt /
// rejectedAt stamping or the rejection note.
async function applyTransition(
  userId: string,
  application: TransitionTarget,
  toStage: PipelineStage,
  rejectionReason?: RejectionReason,
  customRejectionReason?: string
) {
  const applicationId = application.id

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
        changedById: userId,
      },
    }),
    ...(toStage === 'REJECTED'
      ? [
          prisma.activityNote.create({
            data: {
              candidateId: application.candidateId,
              applicationId,
              authorId: userId,
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
    include: { job: { select: { internalName: true } } },
  })

  if (application.stage === toStage) return

  await applyTransition(user.id, application, toStage, rejectionReason, customRejectionReason)

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

// ---------------------------------------------------------------------------
// Bulk stage actions from the candidates list
// ---------------------------------------------------------------------------

export type BulkStageAction = 'ADVANCE' | 'REJECT' | 'REJECT_TO_TALENT_POOL'

export type BulkStageResult = {
  moved: number
  /** Named, with the reason — a silent partial success is worse than none. */
  skipped: { name: string; reason: string }[]
}

/**
 * Applies one stage action to many candidates' current applications.
 *
 * Takes candidate ids rather than application ids: the list shows one Status
 * per candidate — their current application — and that is what the reader is
 * selecting. Resolving it here, rather than trusting an id from the client,
 * also means a row that went stale in an open tab can't move an application
 * the reader never saw.
 *
 * Runs sequentially, not in one transaction: 50 candidates would blow past
 * Prisma's interactive-transaction timeout, and a partial success that is
 * reported precisely is more useful here than an all-or-nothing rollback.
 */
export async function bulkStageAction(
  candidateIds: string[],
  action: BulkStageAction,
  rejectionReason?: RejectionReason,
  customRejectionReason?: string
): Promise<BulkStageResult> {
  const user = await requireSession()

  if (candidateIds.length === 0) return { moved: 0, skipped: [] }
  if (candidateIds.length > 200) {
    throw new Error('Too many candidates selected.')
  }

  const candidates = await prisma.candidate.findMany({
    where: { id: { in: candidateIds }, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      inTalentPool: true,
      applications: {
        where: { removedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          stage: true,
          jobId: true,
          candidateId: true,
          job: { select: { internalName: true } },
        },
      },
    },
  })

  const skipped: BulkStageResult['skipped'] = []
  let moved = 0

  for (const candidate of candidates) {
    const name = `${candidate.firstName} ${candidate.lastName}`
    // findRelevantApplication's rule, narrowed to what this action can act on:
    // the newest application that is still live. A candidate whose only
    // applications are already Hired or Rejected has nothing to move.
    const application = candidate.applications.find(
      (a) => !TERMINAL_STAGES.includes(a.stage)
    )

    if (!application) {
      skipped.push({
        name,
        reason: candidate.applications.length
          ? 'already hired or rejected'
          : 'not on a job',
      })
      continue
    }

    let toStage: PipelineStage
    if (action === 'ADVANCE') {
      const next = nextActiveStage(application.stage)
      if (!next) {
        // Only reachable at Offer — see nextActiveStage. Marking someone hired
        // is deliberately not a bulk operation.
        skipped.push({ name, reason: `at ${STAGE_LABELS[application.stage]} — hire them individually` })
        continue
      }
      toStage = next
    } else {
      toStage = 'REJECTED'
    }

    await applyTransition(user.id, application, toStage, rejectionReason, customRejectionReason)

    if (action === 'REJECT_TO_TALENT_POOL' && !candidate.inTalentPool) {
      await prisma.$transaction([
        prisma.candidate.update({
          where: { id: candidate.id },
          data: {
            inTalentPool: true,
            talentPoolAddedAt: new Date(),
            talentPoolAddedById: user.id,
          },
        }),
        prisma.activityNote.create({
          data: { candidateId: candidate.id, authorId: user.id, body: 'Added to Talent Pool' },
        }),
      ])
    }

    moved++
  }

  // A candidate id that matched nothing above was deleted or never existed.
  for (const id of candidateIds) {
    if (!candidates.some((c) => c.id === id)) {
      skipped.push({ name: 'A selected candidate', reason: 'no longer available' })
    }
  }

  revalidatePath('/candidates')
  revalidatePath('/pipeline')
  revalidatePath('/talent-pool')
  revalidatePath('/home')
  return { moved, skipped }
}
