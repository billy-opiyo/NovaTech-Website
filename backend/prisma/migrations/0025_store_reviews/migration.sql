-- Allow moderated reviews about the store itself. Product reviews retain
-- their existing product relation; homepage reviews use a NULL productId.
ALTER TABLE "Review" ALTER COLUMN "productId" DROP NOT NULL;
