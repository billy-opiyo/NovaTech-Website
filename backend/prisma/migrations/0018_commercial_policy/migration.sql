-- Encode the agreed SaaS tax, service-credit, and record-retention policy.

ALTER TABLE "Invoice"
  ADD COLUMN "grossTotal" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "taxableAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "taxAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "creditAmount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Invoice" SET "grossTotal" = "total" WHERE "grossTotal" = 0;

ALTER TABLE "MerchantEnquiry"
  ADD COLUMN "closedAt" TIMESTAMP(3),
  ADD COLUMN "dataRetentionDueAt" TIMESTAMP(3);

ALTER TABLE "MerchantVerificationEvidence"
  ADD COLUMN "retentionDueAt" TIMESTAMP(3);

CREATE TYPE "BillingCreditStatus" AS ENUM ('AVAILABLE', 'EXHAUSTED', 'VOID');
CREATE TYPE "InvoiceCreditApplicationStatus" AS ENUM ('RESERVED', 'APPLIED', 'RELEASED');

CREATE TABLE "BillingCredit" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "remainingAmount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "status" "BillingCreditStatus" NOT NULL DEFAULT 'AVAILABLE',
  "reason" TEXT NOT NULL,
  "outageStartedAt" TIMESTAMP(3),
  "outageEndedAt" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingCredit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceCreditApplication" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "creditId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "InvoiceCreditApplicationStatus" NOT NULL DEFAULT 'RESERVED',
  "appliedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoiceCreditApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingCredit_sourceKey_key" ON "BillingCredit"("sourceKey");
CREATE INDEX "BillingCredit_tenantId_status_issuedAt_idx" ON "BillingCredit"("tenantId", "status", "issuedAt");
CREATE UNIQUE INDEX "InvoiceCreditApplication_invoiceId_creditId_key" ON "InvoiceCreditApplication"("invoiceId", "creditId");
CREATE INDEX "InvoiceCreditApplication_creditId_status_idx" ON "InvoiceCreditApplication"("creditId", "status");

ALTER TABLE "BillingCredit"
  ADD CONSTRAINT "BillingCredit_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvoiceCreditApplication"
  ADD CONSTRAINT "InvoiceCreditApplication_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "InvoiceCreditApplication_creditId_fkey"
  FOREIGN KEY ("creditId") REFERENCES "BillingCredit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
