-- Additive multi-industry commerce foundation.
-- Existing catalog, account, order, and tenant rows are retained and backfilled
-- to the Electronics configuration below.

CREATE TYPE "ProductAttributeType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DROPDOWN', 'MULTI_SELECT');

CREATE TABLE "Industry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "defaultThemeId" TEXT,
    "homepagePreset" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Industry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industryId" TEXT,
    "colors" JSONB NOT NULL,
    "typography" JSONB NOT NULL,
    "heroLayout" TEXT,
    "bannerStyle" TEXT,
    "productGridStyle" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IndustryCategoryTemplate" (
    "id" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "IndustryCategoryTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreType" (
    "id" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoreType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductAttributeDefinition" (
    "id" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "ProductAttributeType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductAttributeDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductAttributeValue" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "displayValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Store" ADD COLUMN "industryId" TEXT;
ALTER TABLE "Store" ADD COLUMN "storeTypeId" TEXT;
ALTER TABLE "Category" ADD COLUMN "storeId" TEXT;
ALTER TABLE "Product" ADD COLUMN "storeId" TEXT;

CREATE UNIQUE INDEX "Industry_slug_key" ON "Industry"("slug");
CREATE UNIQUE INDEX "Theme_slug_key" ON "Theme"("slug");
CREATE INDEX "Industry_active_name_idx" ON "Industry"("active", "name");
CREATE UNIQUE INDEX "StoreType_industryId_slug_key" ON "StoreType"("industryId", "slug");
CREATE INDEX "StoreType_industryId_active_idx" ON "StoreType"("industryId", "active");
CREATE INDEX "Theme_industryId_active_idx" ON "Theme"("industryId", "active");
CREATE UNIQUE INDEX "IndustryCategoryTemplate_industryId_slug_key" ON "IndustryCategoryTemplate"("industryId", "slug");
CREATE INDEX "IndustryCategoryTemplate_industryId_active_displayOrder_idx" ON "IndustryCategoryTemplate"("industryId", "active", "displayOrder");
CREATE UNIQUE INDEX "ProductAttributeDefinition_industryId_key_key" ON "ProductAttributeDefinition"("industryId", "key");
CREATE INDEX "ProductAttributeDefinition_industryId_active_displayOrder_idx" ON "ProductAttributeDefinition"("industryId", "active", "displayOrder");
CREATE UNIQUE INDEX "ProductAttributeValue_productId_definitionId_key" ON "ProductAttributeValue"("productId", "definitionId");
CREATE INDEX "ProductAttributeValue_definitionId_idx" ON "ProductAttributeValue"("definitionId");
CREATE INDEX "Store_industryId_idx" ON "Store"("industryId");
CREATE INDEX "Store_storeTypeId_idx" ON "Store"("storeTypeId");
CREATE INDEX "Category_storeId_slug_idx" ON "Category"("storeId", "slug");
CREATE INDEX "Product_storeId_createdAt_idx" ON "Product"("storeId", "createdAt");

INSERT INTO "Industry" ("id", "name", "slug", "description", "icon", "active", "homepagePreset", "updatedAt") VALUES
('industry-electronics', 'Electronics', 'electronics', 'Phones, computers, accessories, and consumer technology.', 'cpu', true, '{"heroTitle":"Upgrade Your Tech","heroHighlight":"With Genuine Deals","heroDescription":"Shop the latest phones, laptops, and accessories with warranty and fast delivery.","heroPrimaryLabel":"Shop Phones","heroPrimaryHref":"/category/phones","heroSecondaryLabel":"Today''s Deals","heroSecondaryHref":"/deals","categoryTitle":"Shop by Category","featuredTitle":"Featured Products"}'::jsonb, CURRENT_TIMESTAMP),
('industry-furniture', 'Furniture', 'furniture', 'Furniture and home pieces for comfortable, beautiful spaces.', 'sofa', true, '{"heroTitle":"Make Room for Better Living","heroHighlight":"Made for Your Home","heroDescription":"Settle into thoughtful furniture, warm natural finishes, and lasting pieces for every corner of home.","heroImage":"https://images.unsplash.com/photo-1709746837880-f96b4f588ce5?auto=format&fit=crop&w=2200&q=85","heroImageAlt":"Warm, wood-finished living room with considered furniture","heroPrimaryLabel":"Find Your Room","heroPrimaryHref":"/products","heroSecondaryLabel":"Explore Furniture","heroSecondaryHref":"/products","categoryTitle":"Find Your Room","featuredTitle":"Furniture to Live With"}'::jsonb, CURRENT_TIMESTAMP),
('industry-cakes', 'Cake Shop', 'cakes', 'Fresh cakes and celebration treats for every occasion.', 'cake', true, '{"heroTitle":"Make Every Gathering Sweeter","heroHighlight":"Baked for Your Moments","heroDescription":"Choose a beautiful centrepiece, your favourite flavour, and the finishing touches. We bake celebration cakes to order and deliver the joy to your door.","heroImage":"https://images.unsplash.com/photo-1762267660021-8f501db38ee1?auto=format&fit=crop&w=2200&q=85","heroImageAlt":"Chocolate cakes displayed in a bakery case","heroPrimaryLabel":"Choose Your Cake","heroPrimaryHref":"/products","heroSecondaryLabel":"Explore Occasions","heroSecondaryHref":"/products","categoryTitle":"Something for Every Celebration","featuredTitle":"Fresh from the Cake Studio"}'::jsonb, CURRENT_TIMESTAMP);

INSERT INTO "Theme" ("id", "name", "slug", "industryId", "colors", "typography", "heroLayout", "bannerStyle", "productGridStyle", "updatedAt") VALUES
('theme-electronics', 'Electronics Theme', 'electronics-theme', 'industry-electronics', '{"primary":"#0070f3","primaryDark":"#005bb5","accent":"#f97316","background":"#dbe6f4","surface":"#eaf1f8","text":"#102858"}'::jsonb, '{"body":"Inter","heading":"Inter"}'::jsonb, 'split', 'gradient', 'cards', CURRENT_TIMESTAMP),
('theme-furniture', 'Furniture Theme', 'furniture-theme', 'industry-furniture', '{"primary":"#75543b","primaryLight":"#e4c19b","primaryDark":"#573d2d","accent":"#b98b5e","background":"#f4eee5","surface":"#fffaf2","text":"#35291f","muted":"#6e5d4d","border":"#dfd1bf","darkBackground":"#211b17","darkSurface":"#302720","darkText":"#f8efe3","darkMuted":"#d1c0ab","darkBorder":"#554638"}'::jsonb, '{"body":"inter","heading":"georgia"}'::jsonb, 'editorial', 'soft', 'editorial', CURRENT_TIMESTAMP),
('theme-cakes', 'Cake Theme', 'cake-theme', 'industry-cakes', '{"primary":"#704331","primaryLight":"#e6bc99","primaryDark":"#523124","accent":"#c79258","background":"#f8f0e4","surface":"#fffaf2","text":"#38261f","muted":"#725d50","border":"#e3d2bd","darkBackground":"#211916","darkSurface":"#30231e","darkText":"#fff4e6","darkMuted":"#d7c0aa","darkBorder":"#59443a"}'::jsonb, '{"body":"inter","heading":"georgia"}'::jsonb, 'centered', 'festive', 'soft-cards', CURRENT_TIMESTAMP);

UPDATE "Industry" SET "defaultThemeId" = 'theme-electronics' WHERE "id" = 'industry-electronics';
UPDATE "Industry" SET "defaultThemeId" = 'theme-furniture' WHERE "id" = 'industry-furniture';
UPDATE "Industry" SET "defaultThemeId" = 'theme-cakes' WHERE "id" = 'industry-cakes';

INSERT INTO "IndustryCategoryTemplate" ("id", "industryId", "name", "slug", "description", "imageUrl", "displayOrder", "active") VALUES
('category-template-electronics-phones', 'industry-electronics', 'Phones', 'phones', 'Smartphones from trusted brands.', NULL, 1, true),
('category-template-electronics-laptops', 'industry-electronics', 'Laptops', 'laptops', 'Laptops for work, gaming, and creativity.', NULL, 2, true),
('category-template-electronics-tablets', 'industry-electronics', 'Tablets', 'tablets', 'Versatile tablets for everyone.', NULL, 3, true),
('category-template-electronics-accessories', 'industry-electronics', 'Accessories', 'accessories', 'Essential accessories for your devices.', NULL, 4, true),
('category-template-furniture-beds', 'industry-furniture', 'Beds', 'beds', 'Beds and bedroom furniture.', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80', 1, true),
('category-template-furniture-sofas', 'industry-furniture', 'Sofas', 'sofas', 'Comfortable sofas and seating.', 'https://images.unsplash.com/photo-1709746837880-f96b4f588ce5?auto=format&fit=crop&w=1000&q=80', 2, true),
('category-template-furniture-dining-tables', 'industry-furniture', 'Dining Tables', 'dining-tables', 'Dining tables for every home.', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80', 3, true),
('category-template-cakes-birthday', 'industry-cakes', 'Birthday Cakes', 'birthday-cakes', 'Cakes for birthday celebrations.', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80', 1, true),
('category-template-cakes-wedding', 'industry-cakes', 'Wedding Cakes', 'wedding-cakes', 'Wedding cakes and tiered designs.', 'https://images.unsplash.com/photo-1519655272701-6c23d7e9ad40?auto=format&fit=crop&w=1000&q=80', 2, true),
('category-template-cakes-cupcakes', 'industry-cakes', 'Cupcakes', 'cupcakes', 'Cupcakes for sharing and gifting.', 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=1000&q=80', 3, true);

INSERT INTO "StoreType" ("id", "industryId", "name", "slug", "description", "updatedAt") VALUES
('store-type-electronics-retail', 'industry-electronics', 'Retail Store', 'retail', 'Direct-to-consumer electronics retail.', CURRENT_TIMESTAMP),
('store-type-furniture-retail', 'industry-furniture', 'Furniture Store', 'retail', 'Furniture and home goods retail.', CURRENT_TIMESTAMP),
('store-type-cakes-bakery', 'industry-cakes', 'Bakery', 'bakery', 'Made-to-order cakes and bakery products.', CURRENT_TIMESTAMP);

INSERT INTO "ProductAttributeDefinition" ("id", "industryId", "name", "key", "type", "required", "options", "displayOrder", "active", "updatedAt") VALUES
('attribute-electronics-ram', 'industry-electronics', 'RAM', 'ram', 'TEXT', false, ARRAY[]::TEXT[], 1, true, CURRENT_TIMESTAMP),
('attribute-electronics-storage', 'industry-electronics', 'Storage', 'storage', 'TEXT', false, ARRAY[]::TEXT[], 2, true, CURRENT_TIMESTAMP),
('attribute-electronics-processor', 'industry-electronics', 'Processor', 'processor', 'TEXT', false, ARRAY[]::TEXT[], 3, true, CURRENT_TIMESTAMP),
('attribute-furniture-material', 'industry-furniture', 'Material', 'material', 'TEXT', false, ARRAY[]::TEXT[], 1, true, CURRENT_TIMESTAMP),
('attribute-furniture-width', 'industry-furniture', 'Width', 'width', 'NUMBER', false, ARRAY[]::TEXT[], 2, true, CURRENT_TIMESTAMP),
('attribute-furniture-height', 'industry-furniture', 'Height', 'height', 'NUMBER', false, ARRAY[]::TEXT[], 3, true, CURRENT_TIMESTAMP),
('attribute-furniture-color', 'industry-furniture', 'Color', 'color', 'TEXT', false, ARRAY[]::TEXT[], 4, true, CURRENT_TIMESTAMP),
('attribute-cakes-flavor', 'industry-cakes', 'Flavor', 'flavor', 'DROPDOWN', true, ARRAY['Vanilla', 'Chocolate', 'Red Velvet', 'Fruit']::TEXT[], 1, true, CURRENT_TIMESTAMP),
('attribute-cakes-weight', 'industry-cakes', 'Weight', 'weight', 'NUMBER', true, ARRAY[]::TEXT[], 2, true, CURRENT_TIMESTAMP),
('attribute-cakes-layers', 'industry-cakes', 'Layers', 'layers', 'NUMBER', false, ARRAY[]::TEXT[], 3, true, CURRENT_TIMESTAMP);

-- Lift the three common electronics specifications into typed, addressable
-- attributes while retaining the original Product.specs JSON unchanged.
INSERT INTO "ProductAttributeValue" ("id", "productId", "definitionId", "value", "displayValue", "updatedAt")
SELECT 'legacy-spec-' || product."id" || '-' || definition."key",
       product."id",
       definition."id",
       spec."value",
       trim('"' FROM spec."value"::text),
       CURRENT_TIMESTAMP
FROM "Product" AS product
CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(product."specs") = 'object' THEN product."specs" ELSE '{}'::jsonb END) AS spec("key", "value")
JOIN "ProductAttributeDefinition" AS definition
  ON definition."industryId" = 'industry-electronics'
 AND lower(definition."name") = lower(spec."key")
WHERE product."tenantId" IS NOT NULL;

UPDATE "Store" SET "industryId" = 'industry-electronics', "storeTypeId" = 'store-type-electronics-retail' WHERE "industryId" IS NULL;
UPDATE "Category" AS category SET "storeId" = store."id"
FROM "Store" AS store
WHERE category."tenantId" = store."tenantId" AND category."storeId" IS NULL;
UPDATE "Product" AS product SET "storeId" = store."id"
FROM "Store" AS store
WHERE product."tenantId" = store."tenantId" AND product."storeId" IS NULL;

ALTER TABLE "Industry" ADD CONSTRAINT "Industry_defaultThemeId_fkey" FOREIGN KEY ("defaultThemeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoreType" ADD CONSTRAINT "StoreType_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IndustryCategoryTemplate" ADD CONSTRAINT "IndustryCategoryTemplate_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAttributeDefinition" ADD CONSTRAINT "ProductAttributeDefinition_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "ProductAttributeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Store" ADD CONSTRAINT "Store_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Store" ADD CONSTRAINT "Store_storeTypeId_fkey" FOREIGN KEY ("storeTypeId") REFERENCES "StoreType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
