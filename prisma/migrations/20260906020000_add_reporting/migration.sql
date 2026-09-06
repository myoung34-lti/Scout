-- CreateTable
CREATE TABLE "SavedReport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visualization" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID NOT NULL,

    CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reporting-critical indexes (additive only, no data changes)
CREATE INDEX "Candidate_createdAt_idx" ON "Candidate"("createdAt");

CREATE INDEX "Application_stage_idx" ON "Application"("stage");
CREATE INDEX "Application_hiredAt_idx" ON "Application"("hiredAt");
CREATE INDEX "Application_rejectedAt_idx" ON "Application"("rejectedAt");
CREATE INDEX "Application_appliedAt_idx" ON "Application"("appliedAt");

CREATE INDEX "StageHistory_changedAt_idx" ON "StageHistory"("changedAt");
CREATE INDEX "StageHistory_changedById_idx" ON "StageHistory"("changedById");

CREATE INDEX "Interview_interviewerId_completedAt_idx" ON "Interview"("interviewerId", "completedAt");
CREATE INDEX "Interview_status_completedAt_idx" ON "Interview"("status", "completedAt");
