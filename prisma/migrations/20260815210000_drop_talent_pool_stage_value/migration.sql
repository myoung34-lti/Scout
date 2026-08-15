-- DESTRUCTIVE: Postgres cannot drop a single enum value, so the type is
-- rebuilt without TALENT_POOL. Safe only after the backfill migration has
-- confirmed no row still references it.

-- The partial unique index's WHERE predicate references the old enum type;
-- it has to go before the column type changes and gets rebuilt after.
DROP INDEX "Application_candidateId_jobId_active_unique";

ALTER TYPE "PipelineStage" RENAME TO "PipelineStage_old";

CREATE TYPE "PipelineStage" AS ENUM (
  'APPLIED',
  'SCREENING',
  'INTRODUCTORY_CALL',
  'BEHAVIORAL_INTERVIEW',
  'TECHNICAL_INTERVIEW',
  'EXECUTIVE_INTERVIEW',
  'CLIENT_INTERVIEW',
  'OFFER',
  'HIRED',
  'REJECTED'
);

ALTER TABLE "Application"
  ALTER COLUMN "stage" DROP DEFAULT,
  ALTER COLUMN "stage" TYPE "PipelineStage" USING ("stage"::text::"PipelineStage"),
  ALTER COLUMN "stage" SET DEFAULT 'APPLIED';

ALTER TABLE "StageHistory"
  ALTER COLUMN "fromStage" TYPE "PipelineStage" USING ("fromStage"::text::"PipelineStage"),
  ALTER COLUMN "toStage" TYPE "PipelineStage" USING ("toStage"::text::"PipelineStage");

ALTER TABLE "ActivityNote"
  ALTER COLUMN "stage" TYPE "PipelineStage" USING ("stage"::text::"PipelineStage");

DROP TYPE "PipelineStage_old";

CREATE UNIQUE INDEX "Application_candidateId_jobId_active_unique"
ON "Application" ("candidateId", "jobId")
WHERE stage NOT IN ('HIRED', 'REJECTED');
