-- Start fresh: drop the handful of COMMUNICATION-category test prompts
-- before recreating the enum without that value (cascades to their
-- PromptVersion rows; any CandidateEmail.promptVersionId pointing at one
-- gets SET NULL by the existing FK, harmless for test data).
DELETE FROM "Prompt" WHERE category = 'COMMUNICATION';

-- AlterTable: PromptVersion loses the email-only subject field (moved to
-- EmailTemplateVersion, which has its own dedicated model now).
ALTER TABLE "PromptVersion" DROP COLUMN "subject";

-- Recreate PromptCategory without COMMUNICATION (Postgres can't drop an
-- enum value directly).
ALTER TYPE "PromptCategory" RENAME TO "PromptCategory_old";
CREATE TYPE "PromptCategory" AS ENUM ('INTERVIEW', 'CANDIDATE', 'ANALYSIS', 'SYSTEM');
ALTER TABLE "Prompt" ALTER COLUMN "category" TYPE "PromptCategory" USING ("category"::text::"PromptCategory");
DROP TYPE "PromptCategory_old";

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplateVersion" (
    "id" TEXT NOT NULL,
    "emailTemplateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "EmailTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVariable" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVariable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_currentVersionId_key" ON "EmailTemplate"("currentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplateVersion_emailTemplateId_version_key" ON "EmailTemplateVersion"("emailTemplateId", "version");

-- CreateIndex
CREATE INDEX "EmailTemplateVersion_emailTemplateId_createdAt_idx" ON "EmailTemplateVersion"("emailTemplateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVariable_key_key" ON "EmailVariable"("key");

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "EmailTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplateVersion" ADD CONSTRAINT "EmailTemplateVersion_emailTemplateId_fkey" FOREIGN KEY ("emailTemplateId") REFERENCES "EmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplateVersion" ADD CONSTRAINT "EmailTemplateVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CandidateEmail: rename promptVersionId -> emailTemplateVersionId, repoint FK
ALTER TABLE "CandidateEmail" DROP CONSTRAINT "CandidateEmail_promptVersionId_fkey";
ALTER TABLE "CandidateEmail" RENAME COLUMN "promptVersionId" TO "emailTemplateVersionId";
ALTER TABLE "CandidateEmail" ADD CONSTRAINT "CandidateEmail_emailTemplateVersionId_fkey" FOREIGN KEY ("emailTemplateVersionId") REFERENCES "EmailTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
