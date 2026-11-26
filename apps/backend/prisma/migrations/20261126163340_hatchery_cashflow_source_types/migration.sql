-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."CashSourceType" ADD VALUE 'HATCHERY_PARTY_PAYMENT';
ALTER TYPE "public"."CashSourceType" ADD VALUE 'HATCHERY_SUPPLIER_PAYMENT';
ALTER TYPE "public"."CashSourceType" ADD VALUE 'HATCHERY_BATCH_EXPENSE';

-- AlterEnum
ALTER TYPE "public"."StaffPermission" ADD VALUE 'HATCHERY_VIEW_CASH_HISTORY';
