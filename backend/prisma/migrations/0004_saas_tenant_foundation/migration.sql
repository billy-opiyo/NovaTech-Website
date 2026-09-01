-- Additive tenant foundation. Existing merchant data is first assigned to the
-- seeded NovaTech tenant; later migrations can make ownership columns required
-- after every writer has been converted to tenant-scoped access.

CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_ANALYST');
CREATE TYPE "MembershipRole" AS ENUM ('STORE_OWNER', 'STORE_ADMIN', 'STORE_MANAGER', 'STORE_SUPPORT', 'STORE_EDITOR');
CREATE TYPE "TenantStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED', 'DELETED');
CREATE TYPE "StorePublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUSPENDED');
CREATE TYPE "DomainType" AS ENUM ('PLATFORM_SUBDOMAIN', 'CUSTOM');
CREATE TYPE "DomainVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'REVOKED');
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED', 'INCOMPLETE', 'UNPAID');

ALTER TABLE "User" ADD COLUMN "platformRole" "PlatformRole";

CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "billingInterval" "BillingInterval",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "entitlementsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "legalName" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIALING',
    "planId" TEXT,
    "trialStartsAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "publicationStatus" "StorePublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "defaultLocale" TEXT NOT NULL DEFAULT 'en-KE',
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "country" TEXT NOT NULL DEFAULT 'KE',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Nairobi',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "themeSettings" JSONB,
    "seoSettings" JSONB,
    "contactSettings" JSONB,
    "homepageSettings" JSONB,
    "commerceSettings" JSONB,
    "draftSettings" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "type" "DomainType" NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "verificationStatus" "DomainVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "sslStatus" TEXT,
    "isCanonical" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "provider" TEXT,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "trialStartsAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "gracePeriodEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageCounter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeatureEntitlement" (
    "id" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "planId" TEXT,
    "tenantId" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "FeatureEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreSettingsVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "settings" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoreSettingsVersion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Category" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Product" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Variant" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CartItem" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "WishlistItem" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "RecentlyViewed" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Order" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Address" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "DeliveryRegion" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Review" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "TicketReply" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AdminLog" ADD COLUMN "tenantId" TEXT;

INSERT INTO "Plan" ("id", "key", "name", "price", "active", "updatedAt")
VALUES ('trial-plan', 'TRIAL', 'Trial', NULL, true, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "Tenant" ("id", "legalName", "status", "planId", "trialStartsAt", "updatedAt")
VALUES ('novatech-tenant', 'NovaTech Store', 'ACTIVE', (SELECT "id" FROM "Plan" WHERE "key" = 'TRIAL'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Store" ("id", "tenantId", "name", "slug", "publicationStatus", "publishedAt", "updatedAt")
VALUES ('novatech-store', 'novatech-tenant', 'NovaTech Store', 'novatech', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Domain" ("id", "tenantId", "storeId", "hostname", "type", "verificationToken", "verificationStatus", "isCanonical", "verifiedAt", "updatedAt")
VALUES ('novatech-domain', 'novatech-tenant', 'novatech-store', 'novatech.novatechstore.co.ke', 'PLATFORM_SUBDOMAIN', 'seeded-novatech-domain', 'VERIFIED', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

UPDATE "Category" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "Product" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "Variant" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "CartItem" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "WishlistItem" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "RecentlyViewed" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "Order" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "Payment" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "OrderItem" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "Address" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "DeliveryRegion" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "Review" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "Coupon" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "Notification" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "SupportTicket" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "TicketReply" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;
UPDATE "AdminLog" SET "tenantId" = 'novatech-tenant' WHERE "tenantId" IS NULL;

CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");
CREATE UNIQUE INDEX "Store_tenantId_key" ON "Store"("tenantId");
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");
CREATE UNIQUE INDEX "Domain_hostname_key" ON "Domain"("hostname");
CREATE UNIQUE INDEX "Domain_verificationToken_key" ON "Domain"("verificationToken");
CREATE UNIQUE INDEX "Membership_tenantId_userId_key" ON "Membership"("tenantId", "userId");
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");
CREATE UNIQUE INDEX "UsageCounter_tenantId_metric_periodStart_key" ON "UsageCounter"("tenantId", "metric", "periodStart");
CREATE UNIQUE INDEX "StoreSettingsVersion_storeId_version_key" ON "StoreSettingsVersion"("storeId", "version");
CREATE INDEX "Tenant_status_createdAt_idx" ON "Tenant"("status", "createdAt");
CREATE INDEX "Domain_tenantId_verificationStatus_idx" ON "Domain"("tenantId", "verificationStatus");
CREATE INDEX "Membership_userId_active_idx" ON "Membership"("userId", "active");
CREATE INDEX "Subscription_tenantId_status_idx" ON "Subscription"("tenantId", "status");
CREATE INDEX "Subscription_provider_providerSubscriptionId_idx" ON "Subscription"("provider", "providerSubscriptionId");
CREATE INDEX "FeatureEntitlement_featureKey_effectiveAt_idx" ON "FeatureEntitlement"("featureKey", "effectiveAt");
CREATE INDEX "FeatureEntitlement_tenantId_featureKey_idx" ON "FeatureEntitlement"("tenantId", "featureKey");

CREATE INDEX "Category_tenantId_slug_idx" ON "Category"("tenantId", "slug");
CREATE INDEX "Product_tenantId_createdAt_idx" ON "Product"("tenantId", "createdAt");
CREATE INDEX "Product_tenantId_slug_idx" ON "Product"("tenantId", "slug");
CREATE INDEX "Product_tenantId_sku_idx" ON "Product"("tenantId", "sku");
CREATE INDEX "Variant_tenantId_sku_idx" ON "Variant"("tenantId", "sku");
CREATE INDEX "CartItem_tenantId_userId_idx" ON "CartItem"("tenantId", "userId");
CREATE UNIQUE INDEX "WishlistItem_tenantId_userId_productId_key" ON "WishlistItem"("tenantId", "userId", "productId");
CREATE INDEX "Order_tenantId_createdAt_idx" ON "Order"("tenantId", "createdAt");
CREATE INDEX "Order_tenantId_status_idx" ON "Order"("tenantId", "status");
CREATE INDEX "Payment_tenantId_status_idx" ON "Payment"("tenantId", "status");
CREATE INDEX "OrderItem_tenantId_orderId_idx" ON "OrderItem"("tenantId", "orderId");
CREATE INDEX "Address_tenantId_userId_idx" ON "Address"("tenantId", "userId");
CREATE INDEX "DeliveryRegion_tenantId_name_idx" ON "DeliveryRegion"("tenantId", "name");
CREATE INDEX "Review_tenantId_moderationStatus_idx" ON "Review"("tenantId", "moderationStatus");
CREATE INDEX "Coupon_tenantId_code_idx" ON "Coupon"("tenantId", "code");
CREATE INDEX "Notification_tenantId_createdAt_idx" ON "Notification"("tenantId", "createdAt");
CREATE INDEX "SupportTicket_tenantId_status_idx" ON "SupportTicket"("tenantId", "status");
CREATE INDEX "TicketReply_tenantId_createdAt_idx" ON "TicketReply"("tenantId", "createdAt");
CREATE INDEX "AdminLog_tenantId_createdAt_idx" ON "AdminLog"("tenantId", "createdAt");

ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Store" ADD CONSTRAINT "Store_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeatureEntitlement" ADD CONSTRAINT "FeatureEntitlement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeatureEntitlement" ADD CONSTRAINT "FeatureEntitlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreSettingsVersion" ADD CONSTRAINT "StoreSettingsVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreSettingsVersion" ADD CONSTRAINT "StoreSettingsVersion_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecentlyViewed" ADD CONSTRAINT "RecentlyViewed_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Address" ADD CONSTRAINT "Address_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryRegion" ADD CONSTRAINT "DeliveryRegion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
