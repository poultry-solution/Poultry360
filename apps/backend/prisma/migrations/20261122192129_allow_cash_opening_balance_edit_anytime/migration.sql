-- AlterTable
ALTER TABLE "public"."CashAccount" ADD COLUMN     "openingBalanceSetAt" TIMESTAMP(3);

-- Grandfather CASH accounts whose opening balance is already non-zero: those
-- farmers have deliberately set their starting cash via the existing UI, so
-- the first-run banner shouldn't re-appear for them after this migration.
-- BANK accounts don't drive the banner so they stay NULL (harmless).
UPDATE "public"."CashAccount"
   SET "openingBalanceSetAt" = "createdAt"
 WHERE "type" = 'CASH'
   AND "openingBalance" > 0;
