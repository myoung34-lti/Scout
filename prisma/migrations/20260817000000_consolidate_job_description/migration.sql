ALTER TABLE "Job" ADD COLUMN "description" TEXT;

-- Consolidate the 4 old fields into one before dropping them, so any
-- existing rows (including real imported jobs) don't lose content.
UPDATE "Job" SET "description" = NULLIF(
  TRIM(
    CONCAT(
      COALESCE("whoWereLookingFor" || E'\n\n', ''),
      CASE WHEN array_length("primaryResponsibilities", 1) > 0
        THEN 'Primary Responsibilities' || E'\n' || array_to_string(
          ARRAY(SELECT '- ' || x FROM unnest("primaryResponsibilities") AS x), E'\n'
        ) || E'\n\n'
        ELSE ''
      END,
      CASE WHEN array_length("mustHaves", 1) > 0
        THEN 'Must-Haves' || E'\n' || array_to_string(
          ARRAY(SELECT '- ' || x FROM unnest("mustHaves") AS x), E'\n'
        ) || E'\n\n'
        ELSE ''
      END,
      COALESCE("otherInformation", '')
    )
  ),
  ''
);

ALTER TABLE "Job" DROP COLUMN "whoWereLookingFor";
ALTER TABLE "Job" DROP COLUMN "primaryResponsibilities";
ALTER TABLE "Job" DROP COLUMN "mustHaves";
ALTER TABLE "Job" DROP COLUMN "otherInformation";
