import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

// Creates an Application in the APPLIED stage plus its initial StageHistory
// row. Shared by candidate creation and the future talent-pool pull-forward
// flow. Runs inside the caller's transaction when one is provided.
export async function createApplication(
  tx: Prisma.TransactionClient | typeof prisma,
  {
    candidateId,
    jobId,
    changedById,
  }: { candidateId: string; jobId: string; changedById: string }
) {
  const application = await tx.application.create({
    data: { candidateId, jobId },
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
