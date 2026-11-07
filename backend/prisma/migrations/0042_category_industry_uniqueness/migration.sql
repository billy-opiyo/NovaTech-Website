-- Remove legacy global category uniqueness so category names and slugs can be
-- scoped by tenant and industry as declared by the current Prisma schema.
-- These indexes have no corresponding uniqueness in the current schema and
-- block categories that legitimately repeat in different industries.
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_name_key";
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_slug_key";
DROP INDEX IF EXISTS "Category_name_key";
DROP INDEX IF EXISTS "Category_slug_key";
