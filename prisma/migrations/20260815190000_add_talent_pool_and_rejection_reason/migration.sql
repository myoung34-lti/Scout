-- Additive only: candidate-level Talent Pool fields + rejection reason.
-- Does not touch existing PipelineStage values yet.

CREATE TYPE "RejectionReason" AS ENUM (
  'COMMUNICATION',
  'CORE_VALUE_MISMATCH',
  'LACK_OF_TECHNICAL_SKILLS',
  'POSITION_FILLED',
  'POSITION_CLOSED'
);

ALTER TABLE "Candidate"
  ADD COLUMN "inTalentPool" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "talentPoolAddedAt" TIMESTAMP(3),
  ADD COLUMN "talentPoolAddedById" UUID;

ALTER TABLE "Candidate"
  ADD CONSTRAINT "Candidate_talentPoolAddedById_fkey"
  FOREIGN KEY ("talentPoolAddedById") REFERENCES "User"("id");

CREATE INDEX "Candidate_inTalentPool_idx" ON "Candidate"("inTalentPool");

ALTER TABLE "Application"
  ADD COLUMN "rejectionReason" "RejectionReason";
