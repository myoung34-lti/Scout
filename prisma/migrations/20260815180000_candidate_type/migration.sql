-- CreateEnum
CREATE TYPE "CandidateType" AS ENUM ('SOFTWARE_ENGINEER', 'SYSTEMS_ENGINEER', 'ANALYST', 'INTERNAL');

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN "candidateType" "CandidateType";
