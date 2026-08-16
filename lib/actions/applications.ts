import { prisma } from '@/lib/db'
import type { Prisma, PipelineStage } from '@prisma/client'

// Creates an Application, defaulting to the APPLIED stage, plus its initial
// StageHistory row. Shared by candidate creation and the future talent-pool
// pull-forward flow. Runs inside the caller's transaction when one is
// provided. An initial `stage` lets intake skip straight to e.g. Screening
// when the candidate didn't come in through the normal top-of-funnel flow.
export async function createApplication(
  tx: Prisma.TransactionClient | typeof prisma,
  {
    candidateId,
    jobId,
    changedById,
    stage,
  }: { candidateId: string; jobId: string; changedById: string; stage?: PipelineStage }
) {
  const application = await tx.application.create({
    data: { candidateId, jobId, ...(stage ? { stage } : {}) },
  })

  await tx.stageHistory.create({
    data: {
      applicationId: application.id,
      fromStage: null,
      toStage: application.stage,
      changedById,
    },
  })

  const job = await tx.job.findUniqueOrThrow({
    where: { id: jobId },
    select: { internalName: true },
  })
  await tx.activityNote.create({
    data: {
      candidateId,
      applicationId: application.id,
      authorId: changedById,
      body: `Added to ${job.internalName}`,
    },
  })

  return application
}
