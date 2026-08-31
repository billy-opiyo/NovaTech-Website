-- Replace legacy global catalog uniqueness with tenant-scoped uniqueness.
-- Abort safely if an existing tenant already contains duplicate values.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Category" WHERE "tenantId" IS NOT NULL GROUP BY "tenantId", "name" HAVING COUNT(*) > 1)
    OR EXISTS (SELECT 1 FROM "Category" WHERE "tenantId" IS NOT NULL GROUP BY "tenantId", "slug" HAVING COUNT(*) > 1)
    OR EXISTS (SELECT 1 FROM "Product" WHERE "tenantId" IS NOT NULL GROUP BY "tenantId", "slug" HAVING COUNT(*) > 1)
    OR EXISTS (SELECT 1 FROM "Product" WHERE "tenantId" IS NOT NULL GROUP BY "tenantId", "sku" HAVING COUNT(*) > 1)
    OR EXISTS (SELECT 1 FROM "Variant" WHERE "tenantId" IS NOT NULL AND "sku" IS NOT NULL GROUP BY "tenantId", "sku" HAVING COUNT(*) > 1)
  THEN
    RAISE EXCEPTION 'Duplicate tenant-scoped catalog identifiers must be resolved before migration 0022';
  END IF;
END $$;

ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_name_key";
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_slug_key";
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_slug_key";
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_sku_key";
ALTER TABLE "Variant" DROP CONSTRAINT IF EXISTS "Variant_sku_key";

ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_name_key" UNIQUE ("tenantId", "name");
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_slug_key" UNIQUE ("tenantId", "slug");
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_slug_key" UNIQUE ("tenantId", "slug");
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_sku_key" UNIQUE ("tenantId", "sku");
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_tenantId_sku_key" UNIQUE ("tenantId", "sku");
