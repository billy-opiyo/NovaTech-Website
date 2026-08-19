-- Additive SaaS billing system. Existing shopper payments remain ORDER payments.

CREATE TYPE "BillingRecordStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'WAIVED');
CREATE TYPE "InvoiceKind" AS ENUM ('SETUP_FEE', 'SUBSCRIPTION', 'ADDON', 'RENEWAL');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE', 'FAILED', 'CANCELLED');
CREATE TYPE "BillingPaymentKind" AS ENUM ('ORDER', 'SETUP_FEE', 'SUBSCRIPTION', 'ADDON', 'RENEWAL');
CREATE TYPE "AddonSubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'INCOMPLETE');

ALTER TABLE "Plan"
  ADD COLUMN "setupFeeAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "transactionFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "stripePriceId" TEXT;
CREATE UNIQUE INDEX "Plan_stripePriceId_key" ON "Plan"("stripePriceId");

INSERT INTO "Plan" ("id", "key", "name", "price", "currency", "billingInterval", "setupFeeAmount", "transactionFeePercent", "active", "entitlementsJson", "updatedAt")
VALUES
  ('starter-plan', 'STARTER', 'Starter', 2500, 'KES', 'MONTH', 2500, 2.5, true, '{"staffAccounts":3,"analytics":false,"whatsappNotifications":true}', CURRENT_TIMESTAMP),
  ('business-plan', 'BUSINESS', 'Business', 7500, 'KES', 'MONTH', 2500, 1.5, true, '{"staffAccounts":15,"analytics":true,"whatsappNotifications":true}', CURRENT_TIMESTAMP),
  ('enterprise-plan', 'ENTERPRISE', 'Enterprise', 25000, 'KES', 'YEAR', 0, 0.5, true, '{"staffAccounts":100,"analytics":true,"whatsappNotifications":true}', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

ALTER TABLE "Subscription" ADD COLUMN "providerCheckoutSessionId" TEXT;

CREATE TABLE "BillingCustomer" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ownerUserId" TEXT,
  "stripeCustomerId" TEXT,
  "defaultPaymentMethodId" TEXT,
  "mpesaPhone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingRecord" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ownerUserId" TEXT,
  "setupFeeAmount" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "setupFeeStatus" "BillingRecordStatus" NOT NULL DEFAULT 'PENDING',
  "setupFeePaidAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Addon" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTH',
  "stripePriceId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Addon_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Addon" ("id", "key", "name", "description", "price", "currency", "billingInterval", "active", "updatedAt")
VALUES
  ('addon-whatsapp', 'whatsapp-notifications', 'WhatsApp notifications', 'Automated order and customer notifications.', 1000, 'KES', 'MONTH', true, CURRENT_TIMESTAMP),
  ('addon-analytics', 'advanced-analytics', 'Advanced analytics', 'Extended reports and operational insights.', 2500, 'KES', 'MONTH', true, CURRENT_TIMESTAMP),
  ('addon-staff', 'extra-staff', 'Extra staff accounts', 'Additional team seats beyond the plan allowance.', 1500, 'KES', 'MONTH', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

CREATE TABLE "AddonSubscription" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "addonId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "status" "AddonSubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
  "provider" TEXT,
  "providerSubscriptionItemId" TEXT,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AddonSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "kind" "InvoiceKind" NOT NULL DEFAULT 'SUBSCRIPTION',
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "provider" TEXT,
  "providerInvoiceId" TEXT,
  "number" TEXT,
  "subtotal" INTEGER NOT NULL,
  "addonTotal" INTEGER NOT NULL DEFAULT 0,
  "setupFeeAmount" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "hostedInvoiceUrl" TEXT,
  "invoicePdfUrl" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT,
  "paymentId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "grossAmount" DOUBLE PRECISION NOT NULL,
  "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Payment"
  ADD COLUMN "invoiceId" TEXT,
  ADD COLUMN "subscriptionId" TEXT,
  ADD COLUMN "billingRecordId" TEXT,
  ADD COLUMN "kind" "BillingPaymentKind" NOT NULL DEFAULT 'ORDER',
  ADD COLUMN "failureCode" TEXT,
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "providerCustomerId" TEXT;

CREATE UNIQUE INDEX "BillingCustomer_tenantId_key" ON "BillingCustomer"("tenantId");
CREATE UNIQUE INDEX "BillingCustomer_stripeCustomerId_key" ON "BillingCustomer"("stripeCustomerId");
CREATE UNIQUE INDEX "BillingRecord_tenantId_key" ON "BillingRecord"("tenantId");
CREATE UNIQUE INDEX "Addon_key_key" ON "Addon"("key");
CREATE UNIQUE INDEX "Addon_stripePriceId_key" ON "Addon"("stripePriceId");
CREATE UNIQUE INDEX "AddonSubscription_tenantId_addonId_key" ON "AddonSubscription"("tenantId", "addonId");
CREATE UNIQUE INDEX "Invoice_providerInvoiceId_key" ON "Invoice"("providerInvoiceId");
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE UNIQUE INDEX "Transaction_paymentId_key" ON "Transaction"("paymentId");
CREATE INDEX "AddonSubscription_tenantId_status_idx" ON "AddonSubscription"("tenantId", "status");
CREATE INDEX "Invoice_tenantId_status_createdAt_idx" ON "Invoice"("tenantId", "status", "createdAt");
CREATE INDEX "Invoice_tenantId_kind_idx" ON "Invoice"("tenantId", "kind");
CREATE INDEX "Transaction_tenantId_createdAt_idx" ON "Transaction"("tenantId", "createdAt");
CREATE INDEX "Transaction_tenantId_status_idx" ON "Transaction"("tenantId", "status");
CREATE INDEX "Payment_tenantId_kind_createdAt_idx" ON "Payment"("tenantId", "kind", "createdAt");

ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AddonSubscription" ADD CONSTRAINT "AddonSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AddonSubscription" ADD CONSTRAINT "AddonSubscription_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "Addon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AddonSubscription" ADD CONSTRAINT "AddonSubscription_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_billingRecordId_fkey" FOREIGN KEY ("billingRecordId") REFERENCES "BillingRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
