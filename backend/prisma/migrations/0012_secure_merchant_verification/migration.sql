-- Secure merchant verification intake. Sensitive details are encrypted by the
-- application before storage; document objects use private storage keys.

CREATE TYPE "MerchantBusinessType" AS ENUM ('INDIVIDUAL', 'REGISTERED_BUSINESS');
CREATE TYPE "MerchantTaxStatus" AS ENUM ('REGISTERED', 'NOT_REGISTERED', 'NOT_APPLICABLE', 'UNDER_REVIEW');
CREATE TYPE "MerchantLocationType" AS ENUM ('PHYSICAL_LOCATION', 'ONLINE_ONLY');
CREATE TYPE "MerchantSettlementAccountType" AS ENUM ('PAYBILL', 'TILL', 'OTHER');
CREATE TYPE "MerchantVerificationEvidenceType" AS ENUM ('GOVERNMENT_ID', 'BUSINESS_REGISTRATION', 'KRA_PIN', 'LOCATION_PROOF', 'MPESA_OWNERSHIP', 'OWNER_DECLARATION');
CREATE TYPE "MerchantVerificationEvidenceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "MerchantVerificationProfile" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "businessType" "MerchantBusinessType" NOT NULL,
  "taxStatus" "MerchantTaxStatus" NOT NULL,
  "locationType" "MerchantLocationType" NOT NULL,
  "settlementAccountType" "MerchantSettlementAccountType" NOT NULL,
  "sensitiveDetailsCiphertext" TEXT NOT NULL,
  "phoneVerifiedAt" TIMESTAMP(3),
  "phoneOtpHash" TEXT,
  "phoneOtpSalt" TEXT,
  "phoneOtpExpiresAt" TIMESTAMP(3),
  "phoneOtpAttempts" INTEGER NOT NULL DEFAULT 0,
  "phoneOtpSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MerchantVerificationProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MerchantVerificationEvidence" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "MerchantVerificationEvidenceType" NOT NULL,
  "status" "MerchantVerificationEvidenceStatus" NOT NULL DEFAULT 'PENDING',
  "objectKey" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MerchantVerificationEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MerchantVerificationProfile_tenantId_key" ON "MerchantVerificationProfile"("tenantId");
CREATE INDEX "MerchantVerificationProfile_phoneVerifiedAt_idx" ON "MerchantVerificationProfile"("phoneVerifiedAt");
CREATE UNIQUE INDEX "MerchantVerificationEvidence_objectKey_key" ON "MerchantVerificationEvidence"("objectKey");
CREATE INDEX "MerchantVerificationEvidence_tenantId_status_idx" ON "MerchantVerificationEvidence"("tenantId", "status");
CREATE INDEX "MerchantVerificationEvidence_tenantId_type_idx" ON "MerchantVerificationEvidence"("tenantId", "type");

ALTER TABLE "MerchantVerificationProfile"
  ADD CONSTRAINT "MerchantVerificationProfile_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MerchantVerificationEvidence"
  ADD CONSTRAINT "MerchantVerificationEvidence_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MerchantVerificationEvidence_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MerchantVerificationEvidence_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
