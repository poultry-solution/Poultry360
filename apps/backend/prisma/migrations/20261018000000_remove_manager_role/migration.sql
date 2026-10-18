-- Remove the MANAGER user role.
-- MANAGER was never surfaced in any onboarding/UI flow, so prod has zero rows
-- carrying it; the junction tables wiring farm/dealer "managers" to users are
-- consequently empty as well. Mirrors the DOCTOR removal pattern in
-- 20261015120000_remove_chat_and_doctor.

-- Stop here if any manager account is still left (the enum change below would fail).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."User" WHERE "role"::text = 'MANAGER')
     OR EXISTS (SELECT 1 FROM "public"."StaffUser" WHERE "accountRole"::text = 'MANAGER') THEN
    RAISE EXCEPTION 'MANAGER accounts still exist. Remove them before this migration.';
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "public"."_FarmManagers" DROP CONSTRAINT "_FarmManagers_A_fkey";
ALTER TABLE "public"."_FarmManagers" DROP CONSTRAINT "_FarmManagers_B_fkey";
ALTER TABLE "public"."_DealerManagers" DROP CONSTRAINT "_DealerManagers_A_fkey";
ALTER TABLE "public"."_DealerManagers" DROP CONSTRAINT "_DealerManagers_B_fkey";

-- DropTable
DROP TABLE "public"."_FarmManagers";
DROP TABLE "public"."_DealerManagers";

-- AlterEnum
BEGIN;
CREATE TYPE "public"."UserRole_new" AS ENUM ('OWNER', 'DEALER', 'COMPANY', 'HATCHERY', 'SUPER_ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."User" ALTER COLUMN "role" TYPE "public"."UserRole_new" USING ("role"::text::"public"."UserRole_new");
ALTER TABLE "public"."StaffUser" ALTER COLUMN "accountRole" TYPE "public"."UserRole_new" USING ("accountRole"::text::"public"."UserRole_new");
ALTER TYPE "public"."UserRole" RENAME TO "UserRole_old";
ALTER TYPE "public"."UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "public"."User" ALTER COLUMN "role" SET DEFAULT 'OWNER';
COMMIT;
