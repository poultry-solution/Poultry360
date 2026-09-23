-- Allow account-owned staff identities to work for any supported account role.
-- Existing Dealer staff retain their account owner, credentials, permissions,
-- and active sessions while moving to the generic relationship.
ALTER TYPE "StaffPermission" ADD VALUE IF NOT EXISTS 'HATCHERY_MANAGE_OPERATIONS';
ALTER TYPE "StaffPermission" ADD VALUE IF NOT EXISTS 'HATCHERY_VIEW_ANALYTICS';
ALTER TYPE "StaffPermission" ADD VALUE IF NOT EXISTS 'HATCHERY_VIEW_STAFF_MANAGEMENT';

ALTER TABLE "StaffUser" ADD COLUMN "accountRole" "UserRole";
UPDATE "StaffUser" SET "accountRole" = 'DEALER' WHERE "accountRole" IS NULL;
ALTER TABLE "StaffUser" ALTER COLUMN "accountRole" SET NOT NULL;

ALTER TABLE "StaffUser" DROP CONSTRAINT IF EXISTS "StaffUser_dealerId_fkey";
DROP INDEX IF EXISTS "StaffUser_dealerId_isActive_idx";
DROP INDEX IF EXISTS "StaffUser_dealerId_idx";
ALTER TABLE "StaffUser" DROP COLUMN "dealerId";

CREATE INDEX "StaffUser_ownerId_accountRole_idx" ON "StaffUser"("ownerId", "accountRole");
CREATE INDEX "StaffUser_ownerId_accountRole_isActive_idx" ON "StaffUser"("ownerId", "accountRole", "isActive");
