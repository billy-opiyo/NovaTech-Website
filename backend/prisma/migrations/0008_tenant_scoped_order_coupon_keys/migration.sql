-- Keep shopper idempotency keys and coupon codes isolated per tenant.
DROP INDEX IF EXISTS "Order_idempotencyKey_key";
CREATE UNIQUE INDEX "Order_tenantId_idempotencyKey_key" ON "Order"("tenantId", "idempotencyKey");

DROP INDEX IF EXISTS "Coupon_code_key";
CREATE UNIQUE INDEX "Coupon_tenantId_code_key" ON "Coupon"("tenantId", "code");
