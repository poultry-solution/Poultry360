-- Remove the unused Company "managed by" link (company managers were never used).
-- Stop here if any link still exists, so no data is lost.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."_CompanyManagedBy") THEN
    RAISE EXCEPTION 'Company manager links still exist. Remove them before this migration.';
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "public"."_CompanyManagedBy" DROP CONSTRAINT "_CompanyManagedBy_A_fkey";
ALTER TABLE "public"."_CompanyManagedBy" DROP CONSTRAINT "_CompanyManagedBy_B_fkey";

-- DropTable
DROP TABLE "public"."_CompanyManagedBy";
