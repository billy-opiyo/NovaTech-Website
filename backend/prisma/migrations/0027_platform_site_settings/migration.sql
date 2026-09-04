CREATE TABLE "PlatformSiteSettings" (
    "id" TEXT NOT NULL,
    "draftSettings" JSONB,
    "publishedSettings" JSONB,
    "version" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformSiteSettings_pkey" PRIMARY KEY ("id")
);
