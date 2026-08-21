-- Merchant verification lifecycle. Sensitive identity, tax, and payment evidence
-- is intentionally not stored by this migration; secure collection is a separate gate.

CREATE TYPE "MerchantVerificationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

ALTER TABLE "Tenant"
  ADD COLUMN "verificationStatus" "MerchantVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "verificationSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "verificationReviewedAt" TIMESTAMP(3),
  ADD COLUMN "verificationReviewerId" TEXT,
  ADD COLUMN "verificationNotes" TEXT;

CREATE INDEX "Tenant_verificationStatus_idx" ON "Tenant"("verificationStatus");

ALTER TABLE "Tenant"
  ADD CONSTRAINT "Tenant_verificationReviewerId_fkey"
  FOREIGN KEY ("verificationReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Tenant"
SET "verificationStatus" = 'APPROVED', "verificationReviewedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'novatech-tenant';
