/*
  Warnings:

  - You are about to drop the column `backfillRunId` on the `CashMovement` table. All the data in the column will be lost.
  - You are about to drop the column `reconciledAt` on the `FarmerCashSettings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."CashMovement_backfillRunId_idx";

-- AlterTable
ALTER TABLE "public"."CashMovement" DROP COLUMN "backfillRunId";

-- AlterTable
ALTER TABLE "public"."FarmerCashSettings" DROP COLUMN "reconciledAt";
