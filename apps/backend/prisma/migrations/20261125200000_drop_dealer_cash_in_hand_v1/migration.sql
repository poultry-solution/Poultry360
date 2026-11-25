-- Drop v1 Dealer Cash in Hand tables. Backup inspection (2026-11-25)
-- confirmed only demo-seed rows existed in prod; no real user data lost.
-- v2 lives in CashAccount + CashMovement, keyed by Dealer.ownerId userId.

-- DropForeignKey
ALTER TABLE "public"."DealerCashSettings" DROP CONSTRAINT IF EXISTS "DealerCashSettings_dealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerCashMovement" DROP CONSTRAINT IF EXISTS "DealerCashMovement_dealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerCashMovement" DROP CONSTRAINT IF EXISTS "DealerCashMovement_recordedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerCashDayClose" DROP CONSTRAINT IF EXISTS "DealerCashDayClose_dealerId_fkey";

-- DropTable
DROP TABLE IF EXISTS "public"."DealerCashDayClose";

-- DropTable
DROP TABLE IF EXISTS "public"."DealerCashMovement";

-- DropTable
DROP TABLE IF EXISTS "public"."DealerCashSettings";
