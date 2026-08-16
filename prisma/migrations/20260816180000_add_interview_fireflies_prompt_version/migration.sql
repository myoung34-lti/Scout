ALTER TABLE "Interview" ADD COLUMN "firefliesPromptVersionId" TEXT;

ALTER TABLE "Interview" ADD CONSTRAINT "Interview_firefliesPromptVersionId_fkey"
  FOREIGN KEY ("firefliesPromptVersionId") REFERENCES "PromptVersion"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
