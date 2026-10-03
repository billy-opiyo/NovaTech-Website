-- Preserve optional, industry-specific per-line options through cart and order.
-- Existing checkout/payment/delivery behavior and existing rows are unchanged.
ALTER TABLE "CartItem" ADD COLUMN "customizations" JSONB;
ALTER TABLE "OrderItem" ADD COLUMN "customizations" JSONB;
