CREATE TABLE "PlatformMpesaDestination" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "accountType" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "passkeyCiphertext" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformMpesaDestination_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PlatformMpesaDestination_accountType_check" CHECK ("accountType" IN ('PAYBILL', 'TILL', 'PHONE'))
);

CREATE UNIQUE INDEX "PlatformMpesaDestination_version_key" ON "PlatformMpesaDestination"("version");
CREATE INDEX "PlatformMpesaDestination_createdAt_idx" ON "PlatformMpesaDestination"("createdAt");
