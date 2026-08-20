-- Align the original seeded tenant/store presentation with the Nurava Tech
-- brand after the platform-domain configuration changed. Internal IDs and
-- the existing store slug remain stable for compatibility.
UPDATE "Tenant"
SET "legalName" = 'Nurava Tech', "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'novatech-tenant';

UPDATE "Store"
SET "name" = 'Nurava Tech', "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'novatech-store'
  AND "tenantId" = 'novatech-tenant';

UPDATE "Domain"
SET "hostname" = 'novatech.nuravatech.com', "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'novatech-domain'
  AND "tenantId" = 'novatech-tenant'
  AND "storeId" = 'novatech-store';
