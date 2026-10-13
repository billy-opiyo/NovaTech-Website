ALTER TABLE "PlatformMpesaDestination"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false;

-- Preserve the currently selected destination as active after migration.
UPDATE "PlatformMpesaDestination"
SET "isActive" = true
WHERE "version" = (
  SELECT MAX("version")
  FROM "PlatformMpesaDestination"
);

CREATE INDEX "PlatformMpesaDestination_accountType_isActive_version_idx"
ON "PlatformMpesaDestination"("accountType", "isActive", "version");
