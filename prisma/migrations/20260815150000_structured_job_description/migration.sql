-- AlterTable: add new structured fields
ALTER TABLE "Job" ADD COLUMN "isRemote" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "isHybrid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "whoWereLookingFor" TEXT;
ALTER TABLE "Job" ADD COLUMN "primaryResponsibilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Job" ADD COLUMN "mustHaves" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Job" ADD COLUMN "otherInformation" TEXT;

-- Preserve any existing free-text description into the new "otherInformation" field
UPDATE "Job" SET "otherInformation" = "description" WHERE "description" IS NOT NULL AND "description" != '';

-- Drop the old single free-text description column
ALTER TABLE "Job" DROP COLUMN "description";
