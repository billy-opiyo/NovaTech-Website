ALTER TABLE "VerificationToken"
  ADD COLUMN "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deliveredAt" TIMESTAMP(3),
  ADD COLUMN "deliveryError" TEXT;
