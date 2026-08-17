ALTER TABLE "Job" ADD COLUMN "greenhouseJobId" BIGINT;
CREATE UNIQUE INDEX "Job_greenhouseJobId_key" ON "Job"("greenhouseJobId");

ALTER TABLE "Candidate" ADD COLUMN "greenhouseCandidateId" BIGINT;
CREATE UNIQUE INDEX "Candidate_greenhouseCandidateId_key" ON "Candidate"("greenhouseCandidateId");

ALTER TABLE "Resume" ADD COLUMN "greenhouseAttachmentId" BIGINT;
CREATE UNIQUE INDEX "Resume_greenhouseAttachmentId_key" ON "Resume"("greenhouseAttachmentId");

ALTER TABLE "Application" ADD COLUMN "greenhouseApplicationId" BIGINT;
CREATE UNIQUE INDEX "Application_greenhouseApplicationId_key" ON "Application"("greenhouseApplicationId");

ALTER TABLE "ActivityNote" ADD COLUMN "greenhouseNoteId" BIGINT;
CREATE UNIQUE INDEX "ActivityNote_greenhouseNoteId_key" ON "ActivityNote"("greenhouseNoteId");
