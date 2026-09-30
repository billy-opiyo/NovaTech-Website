CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "BlogPost" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "scopeKey" TEXT NOT NULL DEFAULT 'platform',
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "coverImageUrl" TEXT,
  "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BlogPost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BlogPost_scope_consistency_check" CHECK (("tenantId" IS NULL AND "scopeKey" = 'platform') OR ("tenantId" IS NOT NULL AND "scopeKey" = "tenantId"))
);

-- Platform slugs and merchant slugs have separate unique namespaces.
CREATE UNIQUE INDEX "BlogPost_scopeKey_slug_key" ON "BlogPost"("scopeKey", "slug");
CREATE INDEX "BlogPost_tenantId_status_publishedAt_idx" ON "BlogPost"("tenantId", "status", "publishedAt");
