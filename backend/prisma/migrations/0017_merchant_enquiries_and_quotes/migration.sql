CREATE TYPE "MerchantEnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST', 'SPAM');
CREATE TYPE "MerchantEnquiryContactMethod" AS ENUM ('WHATSAPP', 'EMAIL');
CREATE TYPE "MerchantQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "MerchantEnquiry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "message" TEXT,
    "contactMethod" "MerchantEnquiryContactMethod" NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'CHECKOUT_HANDOFF',
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "items" JSONB NOT NULL,
    "estimatedTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "MerchantEnquiryStatus" NOT NULL DEFAULT 'NEW',
    "assignedToId" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "quotedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MerchantEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MerchantQuote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "status" "MerchantQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "lines" JSONB NOT NULL,
    "terms" TEXT,
    "expiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MerchantQuote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MerchantQuote_quoteNumber_key" ON "MerchantQuote"("quoteNumber");
CREATE INDEX "MerchantEnquiry_tenantId_status_createdAt_idx" ON "MerchantEnquiry"("tenantId", "status", "createdAt");
CREATE INDEX "MerchantEnquiry_storeId_createdAt_idx" ON "MerchantEnquiry"("storeId", "createdAt");
CREATE INDEX "MerchantEnquiry_tenantId_customerEmail_idx" ON "MerchantEnquiry"("tenantId", "customerEmail");
CREATE INDEX "MerchantQuote_tenantId_status_createdAt_idx" ON "MerchantQuote"("tenantId", "status", "createdAt");
CREATE INDEX "MerchantQuote_enquiryId_createdAt_idx" ON "MerchantQuote"("enquiryId", "createdAt");

ALTER TABLE "MerchantEnquiry" ADD CONSTRAINT "MerchantEnquiry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MerchantEnquiry" ADD CONSTRAINT "MerchantEnquiry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MerchantEnquiry" ADD CONSTRAINT "MerchantEnquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MerchantQuote" ADD CONSTRAINT "MerchantQuote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MerchantQuote" ADD CONSTRAINT "MerchantQuote_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "MerchantEnquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MerchantQuote" ADD CONSTRAINT "MerchantQuote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
