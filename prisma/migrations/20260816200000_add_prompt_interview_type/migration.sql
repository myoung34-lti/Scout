ALTER TABLE "Prompt" ADD COLUMN "interviewType" "InterviewType";

CREATE INDEX "Prompt_interviewType_idx" ON "Prompt"("interviewType");
