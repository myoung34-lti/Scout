-- A job can be staffed by several recruiters and several sourcers, so the
-- single recruiterId/sourcerId columns added in the previous migration are
-- replaced by a join table.
--
-- The dropped columns were verified empty immediately before this ran (0 of
-- 39 jobs had either set), and the INSERTs below carry over anything that did
-- exist, so no assignment can be lost even if one were created in between.

CREATE TYPE "JobAssignmentRole" AS ENUM ('RECRUITER', 'SOURCER');

CREATE TABLE "JobAssignment" (
  "id"        TEXT NOT NULL,
  "jobId"     TEXT NOT NULL,
  "userId"    UUID NOT NULL,
  "role"      "JobAssignmentRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobAssignment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "JobAssignment"
  ADD CONSTRAINT "JobAssignment_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobAssignment"
  ADD CONSTRAINT "JobAssignment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "JobAssignment_jobId_userId_role_key"
  ON "JobAssignment"("jobId", "userId", "role");
CREATE INDEX "JobAssignment_userId_role_idx" ON "JobAssignment"("userId", "role");
CREATE INDEX "JobAssignment_jobId_idx" ON "JobAssignment"("jobId");

-- Carry over any single-seat assignments before the columns go.
INSERT INTO "JobAssignment" ("id", "jobId", "userId", "role")
SELECT gen_random_uuid()::text, "id", "recruiterId", 'RECRUITER'
FROM "Job" WHERE "recruiterId" IS NOT NULL;

INSERT INTO "JobAssignment" ("id", "jobId", "userId", "role")
SELECT gen_random_uuid()::text, "id", "sourcerId", 'SOURCER'
FROM "Job" WHERE "sourcerId" IS NOT NULL;

ALTER TABLE "Job" DROP CONSTRAINT "Job_recruiterId_fkey";
ALTER TABLE "Job" DROP CONSTRAINT "Job_sourcerId_fkey";
DROP INDEX "Job_recruiterId_idx";
DROP INDEX "Job_sourcerId_idx";
ALTER TABLE "Job" DROP COLUMN "recruiterId";
ALTER TABLE "Job" DROP COLUMN "sourcerId";
