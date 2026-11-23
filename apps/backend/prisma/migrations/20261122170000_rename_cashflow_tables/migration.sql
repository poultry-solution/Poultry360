-- Rename FarmerCashAccount → CashAccount and FarmerCashMovement → CashMovement.
-- Pre-launch: no live customer rows, so the rename is risk-free. Done now so a
-- future split (dealer/company cashbooks on the same tables) doesn't carry the
-- "farmer" prefix forever.

-- ── Tables ─────────────────────────────────────────────────────────────────
ALTER TABLE "FarmerCashAccount" RENAME TO "CashAccount";
ALTER TABLE "FarmerCashMovement" RENAME TO "CashMovement";

-- ── Primary-key indexes (auto-named) ───────────────────────────────────────
ALTER INDEX "FarmerCashAccount_pkey" RENAME TO "CashAccount_pkey";
ALTER INDEX "FarmerCashMovement_pkey" RENAME TO "CashMovement_pkey";

-- ── Unique constraints / indexes ──────────────────────────────────────────
ALTER INDEX "FarmerCashAccount_userId_name_key" RENAME TO "CashAccount_userId_name_key";

-- ── Secondary indexes ──────────────────────────────────────────────────────
ALTER INDEX "FarmerCashAccount_userId_archivedAt_idx" RENAME TO "CashAccount_userId_archivedAt_idx";
ALTER INDEX "FarmerCashMovement_accountId_bsDate_idx" RENAME TO "CashMovement_accountId_bsDate_idx";
ALTER INDEX "FarmerCashMovement_backfillRunId_idx" RENAME TO "CashMovement_backfillRunId_idx";
ALTER INDEX "FarmerCashMovement_transferId_idx" RENAME TO "CashMovement_transferId_idx";
ALTER INDEX "FarmerCashMovement_userId_bsDate_idx" RENAME TO "CashMovement_userId_bsDate_idx";

-- ── Foreign-key constraints ────────────────────────────────────────────────
ALTER TABLE "CashAccount" RENAME CONSTRAINT "FarmerCashAccount_userId_fkey" TO "CashAccount_userId_fkey";
ALTER TABLE "CashMovement" RENAME CONSTRAINT "FarmerCashMovement_accountId_fkey" TO "CashMovement_accountId_fkey";
ALTER TABLE "CashMovement" RENAME CONSTRAINT "FarmerCashMovement_recordedById_fkey" TO "CashMovement_recordedById_fkey";
ALTER TABLE "CashMovement" RENAME CONSTRAINT "FarmerCashMovement_userId_fkey" TO "CashMovement_userId_fkey";

-- ── Partial unique indexes (hand-written in the v1 migration — drop + recreate) ─
DROP INDEX "FarmerCashAccount_userId_cash_singleton";
CREATE UNIQUE INDEX "CashAccount_userId_cash_singleton"
  ON "CashAccount"("userId")
  WHERE "type" = 'CASH' AND "archivedAt" IS NULL;

-- sourceType is now NOT NULL in the schema, so the WHERE clause only needs
-- to filter on sourceId (manual movements leave it null; auto-posted rows set it).
DROP INDEX "FarmerCashMovement_source_unique";
CREATE UNIQUE INDEX "CashMovement_source_unique"
  ON "CashMovement"("userId", "sourceType", "sourceId")
  WHERE "sourceId" IS NOT NULL;
