ALTER TABLE "Membership"
ADD COLUMN "extraPermissions" JSONB;

ALTER TABLE "User"
ADD COLUMN "platformOperationGrants" JSONB;
