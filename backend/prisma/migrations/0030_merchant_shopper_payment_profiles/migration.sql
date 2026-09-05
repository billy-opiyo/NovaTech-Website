-- Per-merchant M-Pesa shopper collection routes. Provider credentials are
-- encrypted by the application and are never exposed to storefront clients.
CREATE TYPE "MerchantShopperPaymentStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

CREATE TABLE "MerchantShopperPaymentProfile" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "accountType" "MerchantSettlementAccountType" NOT NULL,
  "shortcode" TEXT NOT NULL,
  "credentialsCiphertext" TEXT NOT NULL,
  "status" "MerchantShopperPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MerchantShopperPaymentProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MerchantShopperPaymentProfile_tenantId_key" ON "MerchantShopperPaymentProfile"("tenantId");
CREATE INDEX "MerchantShopperPaymentProfile_status_idx" ON "MerchantShopperPaymentProfile"("status");

ALTER TABLE "MerchantShopperPaymentProfile"
  ADD CONSTRAINT "MerchantShopperPaymentProfile_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
