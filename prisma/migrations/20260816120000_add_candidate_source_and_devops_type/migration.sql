-- Add DevOps Engineer as a selectable candidate type
ALTER TYPE "CandidateType" ADD VALUE 'DEVOPS_ENGINEER';

-- New candidate source enum + column
CREATE TYPE "CandidateSource" AS ENUM ('LINKEDIN', 'REFERRAL', 'APPLIED', 'CAREER_FAIR');

ALTER TABLE "Candidate" ADD COLUMN "source" "CandidateSource";
