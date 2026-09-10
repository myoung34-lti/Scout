-- Stores the resume-scan output alongside the resume it came from, so the
-- overwrite preview and the apply step share a single parse.
ALTER TABLE "Resume" ADD COLUMN "parsedFields" JSONB;
