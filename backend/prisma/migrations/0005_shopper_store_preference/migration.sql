-- Remember the last storefront selected by a shopper without using the value
-- as an authorization boundary. Store and commerce access remain host-scoped.
ALTER TABLE "User" ADD COLUMN "preferredStoreId" TEXT;

CREATE INDEX "User_preferredStoreId_idx" ON "User"("preferredStoreId");

ALTER TABLE "User"
ADD CONSTRAINT "User_preferredStoreId_fkey"
FOREIGN KEY ("preferredStoreId") REFERENCES "Store"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
