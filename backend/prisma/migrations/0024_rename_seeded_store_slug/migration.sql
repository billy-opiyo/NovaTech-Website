-- The seeded store is presented as Nurava Tech, so its public platform slug
-- should use the current brand while retaining the legacy internal IDs.
UPDATE "Store"
SET "slug" = 'nuravatech', "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'novatech-store'
  AND "tenantId" = 'novatech-tenant'
  AND "slug" = 'novatech';

UPDATE "Domain"
SET "hostname" = 'nuravatech.nuravatech.com', "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'novatech-domain'
  AND "tenantId" = 'novatech-tenant'
  AND "storeId" = 'novatech-store'
  AND "hostname" IN ('novatech.nuravatech.com', 'novatech.novatechstore.co.ke');
