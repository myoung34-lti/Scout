-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SCHEDULED', 'SENDING', 'SENT', 'CANCELED', 'FAILED');

-- AlterTable
ALTER TABLE "CandidateEmail"
  ADD COLUMN "status" "EmailStatus" NOT NULL DEFAULT 'SENT',
  ADD COLUMN "scheduledFor" TIMESTAMP(3),
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Backfill: every existing row represents an already-sent email, sent at
-- the time it was created.
UPDATE "CandidateEmail" SET "sentAt" = "createdAt", "updatedAt" = "createdAt";

-- Now that every row has a value, enforce NOT NULL on updatedAt (sentAt and
-- failureReason stay nullable — genuinely absent for scheduled/never-sent
-- rows going forward).
ALTER TABLE "CandidateEmail" ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateIndex
CREATE INDEX "CandidateEmail_status_scheduledFor_idx" ON "CandidateEmail"("status", "scheduledFor");
