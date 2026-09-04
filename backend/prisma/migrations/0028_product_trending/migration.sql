ALTER TABLE "Product" ADD COLUMN "isTrending" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Product_tenantId_isTrending_idx" ON "Product"("tenantId", "isTrending");
