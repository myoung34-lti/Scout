CREATE TYPE "InterviewType" AS ENUM ('INTRO', 'TECHNICAL', 'BEHAVIORAL', 'OTHER');
CREATE TYPE "InterviewStatus" AS ENUM ('DRAFT', 'COMPLETED');
CREATE TYPE "InterviewRecommendation" AS ENUM ('STRONG_NO', 'NO', 'MAYBE', 'YES', 'STRONG_YES');

CREATE TABLE "Interview" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "applicationId" TEXT,
  "interviewerId" UUID NOT NULL,
  "type" "InterviewType" NOT NULL,
  "status" "InterviewStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "firefliesSummary" TEXT,
  "recommendation" "InterviewRecommendation",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Interview_candidateId_createdAt_idx" ON "Interview"("candidateId", "createdAt");

ALTER TABLE "Interview" ADD CONSTRAINT "Interview_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_interviewerId_fkey"
  FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
