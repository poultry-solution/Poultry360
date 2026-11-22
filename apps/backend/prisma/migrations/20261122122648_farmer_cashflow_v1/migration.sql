-- Farmer cashflow (cash book) v1 — Approach A.
--
-- The original FarmerCashSettings / FarmerCashMovement / FarmerCashDayClose
-- held one-off trial data only (confirmed with the user). We wipe those rows
-- up front so the NOT NULL columns added to FarmerCashMovement below apply
-- cleanly.
DELETE FROM "public"."FarmerCashMovement";
DELETE FROM "public"."FarmerCashDayClose";
DELETE FROM "public"."FarmerCashSettings";

-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('CASH', 'BANK');

-- CreateEnum
CREATE TYPE "public"."CashCategory" AS ENUM ('CASH_IN', 'CASH_OUT', 'SALE_RECEIPT', 'EXPENSE', 'PAYMENT_TO_DEALER', 'OWNER_INVEST', 'OWNER_DRAW', 'LOAN_RECEIVED', 'LOAN_REPAYMENT', 'TRANSFER', 'OPENING_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "public"."CashSourceType" AS ENUM ('MANUAL', 'SALE_PAYMENT', 'CUSTOMER_RECEIPT', 'EXPENSE', 'TRANSFER', 'OPENING_ADJUSTMENT');

-- AlterTable
ALTER TABLE "public"."FarmerCashMovement" ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "backfillRunId" TEXT,
ADD COLUMN     "category" "public"."CashCategory" NOT NULL,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceType" "public"."CashSourceType" NOT NULL,
ADD COLUMN     "transferId" TEXT;

-- AlterTable
ALTER TABLE "public"."FarmerCashSettings" ADD COLUMN     "reconciledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."FarmerCashAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."AccountType" NOT NULL,
    "name" TEXT NOT NULL,
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "openingBsDate" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerCashAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FarmerCashAccount_userId_archivedAt_idx" ON "public"."FarmerCashAccount"("userId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerCashAccount_userId_name_key" ON "public"."FarmerCashAccount"("userId", "name");

-- CreateIndex
CREATE INDEX "FarmerCashMovement_accountId_bsDate_idx" ON "public"."FarmerCashMovement"("accountId", "bsDate");

-- CreateIndex
CREATE INDEX "FarmerCashMovement_transferId_idx" ON "public"."FarmerCashMovement"("transferId");

-- CreateIndex
CREATE INDEX "FarmerCashMovement_backfillRunId_idx" ON "public"."FarmerCashMovement"("backfillRunId");

-- AddForeignKey
ALTER TABLE "public"."FarmerCashMovement" ADD CONSTRAINT "FarmerCashMovement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."FarmerCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerCashAccount" ADD CONSTRAINT "FarmerCashAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique indexes Prisma can't model in schema.
-- (1) Exactly one non-archived CASH account per farmer.
CREATE UNIQUE INDEX "FarmerCashAccount_userId_cash_singleton"
  ON "public"."FarmerCashAccount"("userId")
  WHERE "type" = 'CASH' AND "archivedAt" IS NULL;

-- (2) Idempotency for auto-posted movements — the backfill script and the
--     source-event hooks both upsert on (userId, sourceType, sourceId).
--     Manual rows have sourceId = NULL and are not constrained.
CREATE UNIQUE INDEX "FarmerCashMovement_source_unique"
  ON "public"."FarmerCashMovement"("userId", "sourceType", "sourceId")
  WHERE "sourceType" IS NOT NULL AND "sourceId" IS NOT NULL;
