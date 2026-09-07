-- Soft delete for candidates, and "removed from job" for applications.
--
-- Purely additive: three nullable columns and their indexes. Nothing is
-- dropped and no existing row changes — every current candidate and
-- application reads as not-deleted and not-removed, which is correct.
--
-- Deliberately a soft delete rather than an archive table: Candidate has
-- eight child relations and the schema has no cascade rules, so a hard
-- delete would have to tear down applications, stage history, interviews,
-- notes, emails, resumes, tags, Ask Scout messages and insights, and a
-- restore would have to rebuild all of them from a snapshot. Keeping the
-- row means restore is one UPDATE and nothing can be silently lost.

ALTER TABLE "Candidate" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Candidate" ADD COLUMN "deletedById" UUID;

ALTER TABLE "Candidate"
  ADD CONSTRAINT "Candidate_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Candidate_deletedAt_idx" ON "Candidate"("deletedAt");

ALTER TABLE "Application" ADD COLUMN "removedAt" TIMESTAMP(3);
CREATE INDEX "Application_removedAt_idx" ON "Application"("removedAt");
