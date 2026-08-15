-- Backfill: for any Application currently sitting in the old TALENT_POOL
-- stage, promote the candidate to inTalentPool=true (timestamped/attributed
-- to whoever made that transition per StageHistory), then close the
-- application out as REJECTED. Historical StageHistory rows that reference
-- TALENT_POOL are relabeled to REJECTED so the enum value can be dropped
-- cleanly in the next migration.

UPDATE "Candidate" c
SET "inTalentPool" = true,
    "talentPoolAddedAt" = sub."changedAt",
    "talentPoolAddedById" = sub."changedById"
FROM (
  SELECT DISTINCT ON (a."candidateId")
    a."candidateId", sh."changedAt", sh."changedById"
  FROM "Application" a
  JOIN "StageHistory" sh ON sh."applicationId" = a.id AND sh."toStage" = 'TALENT_POOL'
  WHERE a.stage = 'TALENT_POOL'
  ORDER BY a."candidateId", sh."changedAt" ASC
) sub
WHERE c.id = sub."candidateId";

UPDATE "Application" SET stage = 'REJECTED' WHERE stage = 'TALENT_POOL';

UPDATE "StageHistory" SET "toStage" = 'REJECTED' WHERE "toStage" = 'TALENT_POOL';
UPDATE "StageHistory" SET "fromStage" = 'REJECTED' WHERE "fromStage" = 'TALENT_POOL';
