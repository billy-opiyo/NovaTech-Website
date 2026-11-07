-- First-class platform store ownership and commerce operations.
-- Additive only: existing stores remain merchant-owned and existing catalog/order rows remain intact.

CREATE TYPE "TenantKind" AS ENUM ('MERCHANT', 'PLATFORM');
CREATE TYPE "StoreOwnerType" AS ENUM ('MERCHANT', 'PLATFORM');
CREATE TYPE "SupplierAvailability" AS ENUM ('AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'ON_REQUEST', 'DISCONTINUED');
CREATE TYPE "SupplierFulfillmentStatus" AS ENUM ('PENDING', 'READY_TO_FORWARD', 'FORWARDED', 'ACCEPTED', 'REJECTED', 'DISPATCHED', 'DELIVERED', 'RETURN_REQUESTED', 'REFUND_REVIEW', 'CLOSED');
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');
CREATE TYPE "PaymentPurpose" AS ENUM ('PRODUCT_SALE', 'SAAS_SETUP_FEE', 'SAAS_SUBSCRIPTION', 'SAAS_ADDON', 'SAAS_RENEWAL');
CREATE TYPE "PlatformStorePaymentProvider" AS ENUM ('MPESA', 'STRIPE');

ALTER TABLE "Tenant" ADD COLUMN "kind" "TenantKind" NOT NULL DEFAULT 'MERCHANT';
ALTER TABLE "Store" ADD COLUMN "ownerType" "StoreOwnerType" NOT NULL DEFAULT 'MERCHANT';
ALTER TABLE "Store" ADD COLUMN "platformOwnerKey" TEXT;
CREATE UNIQUE INDEX "Store_platformOwnerKey_key" ON "Store"("platformOwnerKey");
ALTER TABLE "Store" ADD CONSTRAINT "Store_platform_owner_identity_check"
  CHECK (("ownerType" = 'PLATFORM' AND "platformOwnerKey" IS NOT NULL) OR ("ownerType" = 'MERCHANT' AND "platformOwnerKey" IS NULL));

CREATE OR REPLACE FUNCTION "enforce_store_owner_kind"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE tenant_kind "TenantKind";
BEGIN
  SELECT "kind" INTO tenant_kind FROM "Tenant" WHERE "id" = NEW."tenantId";
  IF tenant_kind IS NULL OR
     (NEW."ownerType" = 'PLATFORM' AND tenant_kind <> 'PLATFORM') OR
     (NEW."ownerType" = 'MERCHANT' AND tenant_kind <> 'MERCHANT') THEN
    RAISE EXCEPTION 'Store owner type must match the owning tenant kind' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Store_owner_kind_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "ownerType" ON "Store"
FOR EACH ROW EXECUTE FUNCTION "enforce_store_owner_kind"();

CREATE OR REPLACE FUNCTION "enforce_tenant_store_owner_kind"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE store_owner "StoreOwnerType";
BEGIN
  SELECT "ownerType" INTO store_owner FROM "Store" WHERE "tenantId" = NEW."id";
  IF store_owner IS NOT NULL AND
     ((NEW."kind" = 'PLATFORM' AND store_owner <> 'PLATFORM') OR
      (NEW."kind" = 'MERCHANT' AND store_owner <> 'MERCHANT')) THEN
    RAISE EXCEPTION 'Tenant kind must match the owned store type' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Tenant_store_owner_kind_consistency"
BEFORE UPDATE OF "kind" ON "Tenant"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_store_owner_kind"();

ALTER TABLE "Category" ADD COLUMN "industryId" TEXT;
ALTER TABLE "Category" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
UPDATE "Category" c SET "industryId" = s."industryId" FROM "Store" s WHERE c."storeId" = s."id" AND c."industryId" IS NULL;
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_tenantId_name_key";
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_tenantId_slug_key";
CREATE UNIQUE INDEX "Category_tenantId_industryId_name_key" ON "Category"("tenantId", "industryId", "name");
CREATE UNIQUE INDEX "Category_tenantId_industryId_slug_key" ON "Category"("tenantId", "industryId", "slug");
CREATE INDEX "Category_industryId_storeId_idx" ON "Category"("industryId", "storeId");
CREATE INDEX "Category_storeId_active_idx" ON "Category"("storeId", "active");
ALTER TABLE "Category" ADD CONSTRAINT "Category_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order" ADD COLUMN "storeId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "storeId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "purpose" "PaymentPurpose" NOT NULL DEFAULT 'PRODUCT_SALE';
ALTER TABLE "Transaction" ADD COLUMN "storeId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "purpose" "PaymentPurpose" NOT NULL DEFAULT 'PRODUCT_SALE';
ALTER TABLE "Product" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
UPDATE "Payment" SET "purpose" = CASE
  WHEN "kind" = 'SETUP_FEE' THEN 'SAAS_SETUP_FEE'::"PaymentPurpose"
  WHEN "kind" = 'SUBSCRIPTION' THEN 'SAAS_SUBSCRIPTION'::"PaymentPurpose"
  WHEN "kind" = 'ADDON' THEN 'SAAS_ADDON'::"PaymentPurpose"
  WHEN "kind" = 'RENEWAL' THEN 'SAAS_RENEWAL'::"PaymentPurpose"
  ELSE 'PRODUCT_SALE'::"PaymentPurpose"
END;
UPDATE "Transaction" t SET "purpose" = p."purpose" FROM "Payment" p WHERE t."paymentId" = p."id";
UPDATE "Order" o SET "storeId" = s."id" FROM "Store" s WHERE s."tenantId" = o."tenantId";
UPDATE "Payment" p SET "storeId" = o."storeId" FROM "Order" o WHERE p."orderId" = o."id";
UPDATE "Transaction" t SET "storeId" = o."storeId" FROM "Order" o WHERE t."orderId" = o."id";
CREATE INDEX "Order_storeId_createdAt_idx" ON "Order"("storeId", "createdAt");
CREATE INDEX "Payment_storeId_purpose_createdAt_idx" ON "Payment"("storeId", "purpose", "createdAt");
CREATE INDEX "Transaction_storeId_createdAt_idx" ON "Transaction"("storeId", "createdAt");
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PlatformStorePaymentConfiguration" (
  "id" TEXT NOT NULL DEFAULT 'platform-store',
  "provider" "PlatformStorePaymentProvider" NOT NULL,
  "accountType" TEXT,
  "accountNumber" TEXT,
  "accountName" TEXT,
  "credentialsCiphertext" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "authorizedAt" TIMESTAMP(3),
  "authorizedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformStorePaymentConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Supplier_storeId_name_key" ON "Supplier"("storeId", "name");
CREATE INDEX "Supplier_storeId_active_idx" ON "Supplier"("storeId", "active");
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SupplierProduct" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "supplierReference" TEXT NOT NULL,
  "supplierCost" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "availability" "SupplierAvailability" NOT NULL DEFAULT 'ON_REQUEST',
  "estimatedDeliveryMinDays" INTEGER,
  "estimatedDeliveryMaxDays" INTEGER,
  "deliveryNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplierProduct_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupplierProduct_productId_key" ON "SupplierProduct"("productId");
CREATE UNIQUE INDEX "SupplierProduct_supplierId_supplierReference_key" ON "SupplierProduct"("supplierId", "supplierReference");
CREATE INDEX "SupplierProduct_storeId_availability_idx" ON "SupplierProduct"("storeId", "availability");
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SupplierFulfillment" (
  "id" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "status" "SupplierFulfillmentStatus" NOT NULL DEFAULT 'PENDING',
  "supplierReference" TEXT NOT NULL,
  "supplierOrderReference" TEXT,
  "supplierCost" DOUBLE PRECISION NOT NULL,
  "deliveryCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "idempotencyKey" TEXT NOT NULL,
  "notes" TEXT,
  "forwardedAt" TIMESTAMP(3),
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplierFulfillment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupplierFulfillment_orderItemId_key" ON "SupplierFulfillment"("orderItemId");
CREATE UNIQUE INDEX "SupplierFulfillment_idempotencyKey_key" ON "SupplierFulfillment"("idempotencyKey");
CREATE INDEX "SupplierFulfillment_supplierId_status_createdAt_idx" ON "SupplierFulfillment"("supplierId", "status", "createdAt");
ALTER TABLE "SupplierFulfillment" ADD CONSTRAINT "SupplierFulfillment_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierFulfillment" ADD CONSTRAINT "SupplierFulfillment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Refund" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "paymentId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT NOT NULL,
  "providerReference" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "processedById" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");
CREATE INDEX "Refund_storeId_status_createdAt_idx" ON "Refund"("storeId", "status", "createdAt");
CREATE INDEX "Refund_tenantId_createdAt_idx" ON "Refund"("tenantId", "createdAt");
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
