-- CreateTable
CREATE TABLE "CandidateInsight" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "currentRoleCompany" TEXT,
    "desiredCompensation" TEXT,
    "whatTheyWantNext" TEXT,
    "motivationForChange" TEXT,
    "onsiteRemotePreference" TEXT,
    "locationRelocation" TEXT,
    "technicalInterests" TEXT,
    "personalInterests" TEXT,
    "personalDetails" TEXT,
    "concernsOpenQuestions" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "generatedById" UUID NOT NULL,

    CONSTRAINT "CandidateInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidateInsight_candidateId_key" ON "CandidateInsight"("candidateId");

-- AddForeignKey
ALTER TABLE "CandidateInsight" ADD CONSTRAINT "CandidateInsight_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateInsight" ADD CONSTRAINT "CandidateInsight_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
