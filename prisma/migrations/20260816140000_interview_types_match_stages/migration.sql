-- Rebuild InterviewType to match 1:1 with the interview-related pipeline
-- stages: adds EXECUTIVE and CLIENT, drops OTHER. Postgres can't drop a
-- single enum value, so the type is recreated. Safe: no row currently uses
-- OTHER (confirmed via a groupBy count before writing this migration).

ALTER TYPE "InterviewType" RENAME TO "InterviewType_old";

CREATE TYPE "InterviewType" AS ENUM ('INTRO', 'BEHAVIORAL', 'TECHNICAL', 'EXECUTIVE', 'CLIENT');

ALTER TABLE "Interview"
  ALTER COLUMN "type" TYPE "InterviewType" USING ("type"::text::"InterviewType");

DROP TYPE "InterviewType_old";
