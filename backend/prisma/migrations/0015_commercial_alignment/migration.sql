ALTER TABLE "User" ALTER COLUMN "marketingEmails" SET DEFAULT false;

UPDATE "User"
SET "marketingEmails" = false;

CREATE TABLE "NewsletterSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "unsubscribedAt" TIMESTAMP(3),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsletterSubscription_tenantId_email_key" ON "NewsletterSubscription"("tenantId", "email");
CREATE INDEX "NewsletterSubscription_tenantId_unsubscribedAt_idx" ON "NewsletterSubscription"("tenantId", "unsubscribedAt");

ALTER TABLE "NewsletterSubscription"
ADD CONSTRAINT "NewsletterSubscription_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StorageAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'STORE_ASSET',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorageAsset_objectKey_key" ON "StorageAsset"("objectKey");
CREATE INDEX "StorageAsset_tenantId_createdAt_idx" ON "StorageAsset"("tenantId", "createdAt");
CREATE INDEX "StorageAsset_storeId_createdAt_idx" ON "StorageAsset"("storeId", "createdAt");

ALTER TABLE "StorageAsset"
ADD CONSTRAINT "StorageAsset_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StorageAsset"
ADD CONSTRAINT "StorageAsset_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
