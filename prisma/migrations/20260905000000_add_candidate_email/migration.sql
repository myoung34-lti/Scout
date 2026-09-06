-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleRefreshToken" TEXT,
ADD COLUMN     "signature" TEXT;

-- AlterTable
ALTER TABLE "PromptVersion" ADD COLUMN     "subject" TEXT;

-- CreateTable
CREATE TABLE "CandidateEmail" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT,
    "senderId" UUID NOT NULL,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "promptVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CandidateEmail_candidateId_createdAt_idx" ON "CandidateEmail"("candidateId", "createdAt");

-- AddForeignKey
ALTER TABLE "CandidateEmail" ADD CONSTRAINT "CandidateEmail_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEmail" ADD CONSTRAINT "CandidateEmail_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEmail" ADD CONSTRAINT "CandidateEmail_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEmail" ADD CONSTRAINT "CandidateEmail_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
