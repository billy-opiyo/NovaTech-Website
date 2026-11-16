CREATE TABLE "PlatformBillingPolicy" (
    "id" TEXT NOT NULL DEFAULT 'platform-billing-policy',
    "pilotDays" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformBillingPolicy_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PlatformBillingPolicy" ADD CONSTRAINT "PlatformBillingPolicy_pilotDays_check" CHECK ("pilotDays" >= 1 AND "pilotDays" <= 3650);
