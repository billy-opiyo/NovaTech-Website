CREATE TABLE "PlatformInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformInvitation_tokenHash_key" ON "PlatformInvitation"("tokenHash");
CREATE INDEX "PlatformInvitation_email_acceptedAt_idx" ON "PlatformInvitation"("email", "acceptedAt");

ALTER TABLE "PlatformInvitation" ADD CONSTRAINT "PlatformInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
