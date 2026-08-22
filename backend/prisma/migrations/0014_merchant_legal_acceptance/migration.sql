-- Versioned merchant acceptance is preserved as a legal/billing record.
-- It is intentionally not removed by the merchant workspace retention sweep.

CREATE TYPE "MerchantLegalAcceptanceContext" AS ENUM ('TRIAL_START', 'SELLING');

CREATE TABLE "MerchantLegalAcceptance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "acceptedById" TEXT NOT NULL,
    "context" "MerchantLegalAcceptanceContext" NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "privacyVersion" TEXT NOT NULL,
    "agreementVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantLegalAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MerchantLegalAcceptance_tenantId_context_acceptedAt_idx"
    ON "MerchantLegalAcceptance"("tenantId", "context", "acceptedAt");

ALTER TABLE "MerchantLegalAcceptance"
    ADD CONSTRAINT "MerchantLegalAcceptance_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MerchantLegalAcceptance"
    ADD CONSTRAINT "MerchantLegalAcceptance_acceptedById_fkey"
    FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
