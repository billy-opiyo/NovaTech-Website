-- Login events are tenant-owned when they originate from a merchant host.
-- The column stays nullable so platform-host and unresolved-host events remain
-- auditable without being assigned to a store by guesswork.
ALTER TABLE "LoginEvent" ADD COLUMN "tenantId" TEXT;

-- Backfill only events for users who have exactly one membership. A user with
-- multiple memberships cannot be assigned to one store from historical data.
UPDATE "LoginEvent" AS event
SET "tenantId" = membership."tenantId"
FROM "Membership" AS membership
WHERE event."userId" = membership."userId"
  AND (
    SELECT COUNT(*)
    FROM "Membership" AS candidate
    WHERE candidate."userId" = event."userId"
  ) = 1;

CREATE INDEX "LoginEvent_tenantId_createdAt_idx" ON "LoginEvent"("tenantId", "createdAt");

ALTER TABLE "LoginEvent"
ADD CONSTRAINT "LoginEvent_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
