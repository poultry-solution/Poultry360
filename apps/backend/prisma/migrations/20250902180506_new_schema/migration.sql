/*
  Warnings:

  - You are about to drop the column `currentChicks` on the `Batch` table. All the data in the column will be lost.
  - You are about to drop the column `sectorId` on the `Batch` table. All the data in the column will be lost.
  - You are about to drop the column `balance` on the `Dealer` table. All the data in the column will be lost.
  - You are about to drop the column `sectorId` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `balance` on the `Hatchery` table. All the data in the column will be lost.
  - You are about to drop the column `balance` on the `MedicineSupplier` table. All the data in the column will be lost.
  - You are about to drop the column `balanceDue` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `receivedAmount` on the `Sale` table. All the data in the column will be lost.
  - The `status` column on the `Vaccination` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `BatchAnalytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DealerTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExpenseCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FarmAnalytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FarmSector` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HatcheryTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LifetimeData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MedicineTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesCategory` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,categoryId,name]` on the table `InventoryItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `InventoryItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."VaccinationStatus" AS ENUM ('PENDING', 'COMPLETED', 'MISSED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."CategoryType" AS ENUM ('EXPENSE', 'SALES', 'INVENTORY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."TransactionType" ADD VALUE 'RECEIPT';
ALTER TYPE "public"."TransactionType" ADD VALUE 'OPENING_BALANCE';

-- DropForeignKey
ALTER TABLE "public"."Batch" DROP CONSTRAINT "Batch_sectorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerTransaction" DROP CONSTRAINT "DealerTransaction_dealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Expense" DROP CONSTRAINT "Expense_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Expense" DROP CONSTRAINT "Expense_sectorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExpenseCategory" DROP CONSTRAINT "ExpenseCategory_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmSector" DROP CONSTRAINT "FarmSector_farmId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HatcheryTransaction" DROP CONSTRAINT "HatcheryTransaction_hatcheryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InventoryCategory" DROP CONSTRAINT "InventoryCategory_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InventoryItem" DROP CONSTRAINT "InventoryItem_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MedicineTransaction" DROP CONSTRAINT "MedicineTransaction_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Sale" DROP CONSTRAINT "Sale_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SalesCategory" DROP CONSTRAINT "SalesCategory_userId_fkey";

-- DropIndex
DROP INDEX "public"."Expense_sectorId_idx";

-- DropIndex
DROP INDEX "public"."InventoryItem_categoryId_name_key";

-- DropIndex
DROP INDEX "public"."InventoryUsage_expenseId_idx";

-- AlterTable
ALTER TABLE "public"."Batch" DROP COLUMN "currentChicks",
DROP COLUMN "sectorId";

-- AlterTable
ALTER TABLE "public"."Dealer" DROP COLUMN "balance";

-- AlterTable
ALTER TABLE "public"."Expense" DROP COLUMN "sectorId";

-- AlterTable
ALTER TABLE "public"."Hatchery" DROP COLUMN "balance";

-- AlterTable
ALTER TABLE "public"."InventoryItem" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."MedicineSupplier" DROP COLUMN "balance";

-- AlterTable
ALTER TABLE "public"."Sale" DROP COLUMN "balanceDue",
DROP COLUMN "receivedAmount",
ADD COLUMN     "dueAmount" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Vaccination" DROP COLUMN "status",
ADD COLUMN     "status" "public"."VaccinationStatus" NOT NULL DEFAULT 'PENDING';

-- DropTable
DROP TABLE "public"."BatchAnalytics";

-- DropTable
DROP TABLE "public"."DealerTransaction";

-- DropTable
DROP TABLE "public"."ExpenseCategory";

-- DropTable
DROP TABLE "public"."FarmAnalytics";

-- DropTable
DROP TABLE "public"."FarmSector";

-- DropTable
DROP TABLE "public"."HatcheryTransaction";

-- DropTable
DROP TABLE "public"."InventoryCategory";

-- DropTable
DROP TABLE "public"."LifetimeData";

-- DropTable
DROP TABLE "public"."MedicineTransaction";

-- DropTable
DROP TABLE "public"."SalesCategory";

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."CategoryType" NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalePayment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "saleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EntityTransaction" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER,
    "itemName" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_userId_type_idx" ON "public"."Category"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_type_name_key" ON "public"."Category"("userId", "type", "name");

-- CreateIndex
CREATE INDEX "SalePayment_saleId_date_idx" ON "public"."SalePayment"("saleId", "date");

-- CreateIndex
CREATE INDEX "EntityTransaction_entityType_entityId_date_idx" ON "public"."EntityTransaction"("entityType", "entityId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_userId_categoryId_name_key" ON "public"."InventoryItem"("userId", "categoryId", "name");

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
