CREATE TYPE "SupportTicketSource" AS ENUM ('STOREFRONT_CONTACT', 'PLATFORM_CONTACT');

ALTER TABLE "SupportTicket"
ADD COLUMN "source" "SupportTicketSource" NOT NULL DEFAULT 'STOREFRONT_CONTACT';

CREATE INDEX "SupportTicket_source_status_createdAt_idx"
ON "SupportTicket"("source", "status", "createdAt");
