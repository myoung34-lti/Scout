-- Signature now comes live from the user's own Gmail "Send mail as"
-- settings (via the Gmail API) instead of a Scout-owned copy that could
-- drift out of sync.
ALTER TABLE "User" DROP COLUMN "signature";
