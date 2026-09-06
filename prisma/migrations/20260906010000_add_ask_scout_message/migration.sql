-- CreateTable
CREATE TABLE "AskScoutMessage" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "askedById" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AskScoutMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AskScoutMessage_candidateId_createdAt_idx" ON "AskScoutMessage"("candidateId", "createdAt");

-- AddForeignKey
ALTER TABLE "AskScoutMessage" ADD CONSTRAINT "AskScoutMessage_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AskScoutMessage" ADD CONSTRAINT "AskScoutMessage_askedById_fkey" FOREIGN KEY ("askedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
