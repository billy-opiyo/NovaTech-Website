-- Store customer communication and appearance preferences on the user record.
ALTER TABLE "User"
ADD COLUMN "marketingEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "orderUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "preferredTheme" TEXT NOT NULL DEFAULT 'dark';
