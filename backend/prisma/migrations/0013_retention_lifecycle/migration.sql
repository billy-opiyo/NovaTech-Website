-- Server-authoritative retention scheduling. Billing and legal records remain
-- attached to Tenant and are intentionally preserved by the retention worker.

ALTER TABLE "Tenant"
  ADD COLUMN "dataRetentionStartsAt" TIMESTAMP(3),
  ADD COLUMN "dataDeletionDueAt" TIMESTAMP(3),
  ADD COLUMN "dataDeletedAt" TIMESTAMP(3);

CREATE INDEX "Tenant_dataDeletionDueAt_dataDeletedAt_idx"
  ON "Tenant"("dataDeletionDueAt", "dataDeletedAt");
