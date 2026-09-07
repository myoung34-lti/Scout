-- Assign a recruiter and a sourcer to a job.
--
-- Purely additive: two nullable columns plus their foreign keys and indexes.
-- Nothing is dropped or rewritten, no existing row changes, and code that
-- predates these columns keeps working because Prisma selects columns
-- explicitly rather than with SELECT *. Rolling the application back simply
-- leaves two unused columns behind.

ALTER TABLE "Job" ADD COLUMN "recruiterId" UUID;
ALTER TABLE "Job" ADD COLUMN "sourcerId" UUID;

ALTER TABLE "Job"
  ADD CONSTRAINT "Job_recruiterId_fkey"
  FOREIGN KEY ("recruiterId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Job"
  ADD CONSTRAINT "Job_sourcerId_fkey"
  FOREIGN KEY ("sourcerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Job_recruiterId_idx" ON "Job"("recruiterId");
CREATE INDEX "Job_sourcerId_idx" ON "Job"("sourcerId");
