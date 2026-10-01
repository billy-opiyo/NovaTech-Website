ALTER TABLE "MerchantShopperPaymentProfile"
ADD COLUMN "accountName" TEXT;

UPDATE "MerchantShopperPaymentProfile" AS payment_profile
SET "accountName" = COALESCE(tenant."legalName", store."name", 'Merchant')
FROM "Tenant" AS tenant
LEFT JOIN "Store" AS store ON store."tenantId" = tenant."id"
WHERE payment_profile."tenantId" = tenant."id"
  AND payment_profile."accountName" IS NULL;

-- In light-onboarding mode existing payment profiles no longer need review.
UPDATE "MerchantShopperPaymentProfile"
SET "status" = 'CONFIGURED'
WHERE "status" = 'PENDING';

-- Legacy verification rejection was the only code path that suspended a
-- shopper-payment profile. Convert those KYC-only suspensions to configured;
-- actual tenant/store suspensions remain separately enforced.
UPDATE "MerchantShopperPaymentProfile" AS payment_profile
SET "status" = 'CONFIGURED', "verifiedAt" = NULL
FROM "Tenant" AS tenant
WHERE payment_profile."tenantId" = tenant."id"
  AND payment_profile."status" = 'SUSPENDED'
  AND tenant."verificationStatus" = 'REJECTED';
