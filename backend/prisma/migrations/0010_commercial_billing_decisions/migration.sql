-- Apply the approved initial commercial catalog and support next-renewal plan changes.

ALTER TABLE "Subscription" ADD COLUMN "pendingPlanId" TEXT;

CREATE INDEX "Subscription_pendingPlanId_idx" ON "Subscription"("pendingPlanId");

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_pendingPlanId_fkey"
  FOREIGN KEY ("pendingPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Plan"
SET
  "price" = 1500,
  "currency" = 'KES',
  "billingInterval" = 'MONTH',
  "setupFeeAmount" = 5000,
  "transactionFeePercent" = 0,
  "entitlementsJson" = '{"productLimit":50,"staffAccounts":3,"storageGb":2,"analyticsLevel":"basic","customDomain":false,"whatsappNotifications":false}'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'STARTER';

UPDATE "Plan"
SET
  "price" = 3500,
  "currency" = 'KES',
  "billingInterval" = 'MONTH',
  "setupFeeAmount" = 5000,
  "transactionFeePercent" = 0,
  "entitlementsJson" = '{"productLimit":250,"staffAccounts":15,"storageGb":10,"analyticsLevel":"advanced","customDomain":true,"whatsappNotifications":false}'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'BUSINESS';

UPDATE "Plan"
SET
  "price" = 8500,
  "currency" = 'KES',
  "billingInterval" = 'MONTH',
  "setupFeeAmount" = 1500,
  "transactionFeePercent" = 0,
  "entitlementsJson" = '{"productLimit":1000,"staffAccounts":100,"storageGb":50,"analyticsLevel":"advanced","customDomain":true,"customDomainCount":5,"whatsappNotifications":false}'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'ENTERPRISE';

UPDATE "Addon"
SET "active" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" IN ('whatsapp-notifications', 'advanced-analytics', 'extra-staff');
