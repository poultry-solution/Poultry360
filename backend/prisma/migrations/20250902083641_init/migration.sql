/*
  Warnings:

  - You are about to drop the column `contactNo` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `contactNo` on the `Dealer` table. All the data in the column will be lost.
  - You are about to drop the column `dealerName` on the `Dealer` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Dealer` table. All the data in the column will be lost.
  - You are about to drop the column `lotCapacity` on the `Farm` table. All the data in the column will be lost.
  - You are about to drop the column `lotSize` on the `Farm` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `Farm` table. All the data in the column will be lost.
  - You are about to drop the column `contactNo` on the `Hatchery` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Hatchery` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `Hatchery` table. All the data in the column will be lost.
  - You are about to drop the column `farmId` on the `Mortality` table. All the data in the column will be lost.
  - You are about to drop the column `lotId` on the `Mortality` table. All the data in the column will be lost.
  - You are about to drop the column `lotId` on the `Sale` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(10,2)`.
  - You are about to drop the column `phoneNo` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Address` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FarmLot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FarmPerformance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HatcherySupply` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryConsumption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryPurchase` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LotPerformance` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,name]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,name]` on the table `Dealer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,name]` on the table `Hatchery` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `phone` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contact` to the `Dealer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Dealer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `capacity` to the `Farm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `Farm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Farm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contact` to the `Hatchery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Hatchery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batchId` to the `Mortality` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitPrice` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('OWNER', 'MANAGER');

-- CreateEnum
CREATE TYPE "public"."BatchStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('PURCHASE', 'SALE', 'PAYMENT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('LOW_INVENTORY', 'VACCINATION_DUE', 'BATCH_COMPLETION', 'PAYMENT_DUE', 'MORTALITY_ALERT');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('PENDING', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');

-- DropForeignKey
ALTER TABLE "public"."Address" DROP CONSTRAINT "Address_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Farm" DROP CONSTRAINT "Farm_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmLot" DROP CONSTRAINT "FarmLot_farmId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmPerformance" DROP CONSTRAINT "FarmPerformance_farmId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Hatchery" DROP CONSTRAINT "Hatchery_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HatcherySupply" DROP CONSTRAINT "HatcherySupply_farmId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HatcherySupply" DROP CONSTRAINT "HatcherySupply_hatcheryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HatcherySupply" DROP CONSTRAINT "HatcherySupply_lotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InventoryConsumption" DROP CONSTRAINT "InventoryConsumption_farmId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InventoryConsumption" DROP CONSTRAINT "InventoryConsumption_lotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InventoryConsumption" DROP CONSTRAINT "InventoryConsumption_purchaseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InventoryPurchase" DROP CONSTRAINT "InventoryPurchase_dealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InventoryPurchase" DROP CONSTRAINT "InventoryPurchase_farmId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LotPerformance" DROP CONSTRAINT "LotPerformance_lotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Mortality" DROP CONSTRAINT "Mortality_farmId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Mortality" DROP CONSTRAINT "Mortality_lotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Sale" DROP CONSTRAINT "Sale_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Sale" DROP CONSTRAINT "Sale_farmId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Sale" DROP CONSTRAINT "Sale_lotId_fkey";

-- DropIndex
DROP INDEX "public"."Sale_farmId_idx";

-- DropIndex
DROP INDEX "public"."Sale_lotId_idx";

-- AlterTable
ALTER TABLE "public"."Customer" DROP COLUMN "contactNo",
DROP COLUMN "customerName",
DROP COLUMN "location",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Dealer" DROP COLUMN "contactNo",
DROP COLUMN "dealerName",
DROP COLUMN "location",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "contact" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Farm" DROP COLUMN "lotCapacity",
DROP COLUMN "lotSize",
DROP COLUMN "ownerId",
ADD COLUMN     "capacity" INTEGER NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Hatchery" DROP COLUMN "contactNo",
DROP COLUMN "location",
DROP COLUMN "ownerId",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "contact" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Mortality" DROP COLUMN "farmId",
DROP COLUMN "lotId",
ADD COLUMN     "batchId" TEXT NOT NULL,
ALTER COLUMN "date" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Sale" DROP COLUMN "lotId",
ADD COLUMN     "balanceDue" DECIMAL(10,2),
ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isCredit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quantity" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "receivedAmount" DECIMAL(10,2),
ADD COLUMN     "unitPrice" DECIMAL(10,2) NOT NULL,
ALTER COLUMN "date" DROP DEFAULT,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "customerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "phoneNo",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "role" "public"."UserRole" NOT NULL DEFAULT 'OWNER';

-- DropTable
DROP TABLE "public"."Address";

-- DropTable
DROP TABLE "public"."FarmLot";

-- DropTable
DROP TABLE "public"."FarmPerformance";

-- DropTable
DROP TABLE "public"."HatcherySupply";

-- DropTable
DROP TABLE "public"."InventoryConsumption";

-- DropTable
DROP TABLE "public"."InventoryPurchase";

-- DropTable
DROP TABLE "public"."LotPerformance";

-- DropEnum
DROP TYPE "public"."Product";

-- DropEnum
DROP TYPE "public"."Unit";

-- CreateTable
CREATE TABLE "public"."Batch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "public"."BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "initialChicks" INTEGER NOT NULL,
    "currentChicks" INTEGER NOT NULL,
    "initialChickWeight" DECIMAL(6,2) NOT NULL DEFAULT 0.045,
    "farmId" TEXT NOT NULL,
    "sectorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalesCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Expense" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(10,2),
    "unitPrice" DECIMAL(10,2),
    "farmId" TEXT NOT NULL,
    "batchId" TEXT,
    "sectorId" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currentStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "minStock" DECIMAL(10,2),
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryTransaction" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryUsage" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2),
    "totalAmount" DECIMAL(10,2),
    "notes" TEXT,
    "itemId" TEXT NOT NULL,
    "expenseId" TEXT,
    "batchId" TEXT,
    "farmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerTransaction" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "dealerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HatcheryTransaction" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "hatcheryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatcheryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MedicineSupplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "address" TEXT,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MedicineTransaction" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "medicineName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "supplierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FarmSector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "farmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmSector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomerTransaction" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Vaccination" (
    "id" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeedConsumption" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "feedType" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BirdWeight" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "avgWeight" DECIMAL(6,2) NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BirdWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "data" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "action" "public"."AuditAction" NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BatchAnalytics" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "farmName" TEXT NOT NULL,
    "totalExpenses" DECIMAL(12,2) NOT NULL,
    "totalSales" DECIMAL(12,2) NOT NULL,
    "grossProfit" DECIMAL(12,2) NOT NULL,
    "netProfit" DECIMAL(12,2) NOT NULL,
    "initialChicks" INTEGER NOT NULL,
    "finalChicks" INTEGER NOT NULL,
    "mortalityCount" INTEGER NOT NULL,
    "mortalityRate" DECIMAL(5,2) NOT NULL,
    "initialChickWeight" DECIMAL(6,2) NOT NULL,
    "finalBirdWeight" DECIMAL(6,2) NOT NULL,
    "totalWeightGain" DECIMAL(8,2) NOT NULL,
    "totalFeedUsed" DECIMAL(10,2) NOT NULL,
    "feedCost" DECIMAL(12,2) NOT NULL,
    "fcr" DECIMAL(6,3),
    "costPerBird" DECIMAL(8,2) NOT NULL,
    "revenuePerBird" DECIMAL(8,2) NOT NULL,
    "profitPerBird" DECIMAL(8,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FarmAnalytics" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "farmName" TEXT NOT NULL,
    "totalBatches" INTEGER NOT NULL,
    "completedBatches" INTEGER NOT NULL,
    "activeBatches" INTEGER NOT NULL,
    "totalExpenses" DECIMAL(14,2) NOT NULL,
    "totalSales" DECIMAL(14,2) NOT NULL,
    "totalProfit" DECIMAL(14,2) NOT NULL,
    "totalChicks" INTEGER NOT NULL,
    "totalMortality" INTEGER NOT NULL,
    "avgMortalityRate" DECIMAL(5,2) NOT NULL,
    "totalFeedUsed" DECIMAL(12,2) NOT NULL,
    "totalFeedCost" DECIMAL(14,2) NOT NULL,
    "avgFCR" DECIMAL(6,3),
    "avgCostPerBird" DECIMAL(8,2) NOT NULL,
    "avgRevenuePerBird" DECIMAL(8,2) NOT NULL,
    "avgProfitPerBird" DECIMAL(8,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LifetimeData" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "totalFarms" INTEGER NOT NULL,
    "totalBatches" INTEGER NOT NULL,
    "totalChicks" INTEGER NOT NULL,
    "totalMortality" INTEGER NOT NULL,
    "totalExpenses" DECIMAL(16,2) NOT NULL,
    "totalSales" DECIMAL(16,2) NOT NULL,
    "totalProfit" DECIMAL(16,2) NOT NULL,
    "avgMortalityRate" DECIMAL(5,2) NOT NULL,
    "avgProfitPerBatch" DECIMAL(12,2) NOT NULL,
    "avgProfitPerBird" DECIMAL(8,2) NOT NULL,
    "firstBatchDate" TIMESTAMP(3),
    "lastBatchDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifetimeData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Batch_farmId_startDate_idx" ON "public"."Batch"("farmId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_farmId_batchNumber_key" ON "public"."Batch"("farmId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_userId_name_key" ON "public"."ExpenseCategory"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCategory_userId_name_key" ON "public"."SalesCategory"("userId", "name");

-- CreateIndex
CREATE INDEX "Expense_farmId_date_idx" ON "public"."Expense"("farmId", "date");

-- CreateIndex
CREATE INDEX "Expense_batchId_idx" ON "public"."Expense"("batchId");

-- CreateIndex
CREATE INDEX "Expense_sectorId_idx" ON "public"."Expense"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCategory_userId_name_key" ON "public"."InventoryCategory"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_categoryId_name_key" ON "public"."InventoryItem"("categoryId", "name");

-- CreateIndex
CREATE INDEX "InventoryTransaction_itemId_date_idx" ON "public"."InventoryTransaction"("itemId", "date");

-- CreateIndex
CREATE INDEX "InventoryUsage_farmId_date_idx" ON "public"."InventoryUsage"("farmId", "date");

-- CreateIndex
CREATE INDEX "InventoryUsage_batchId_idx" ON "public"."InventoryUsage"("batchId");

-- CreateIndex
CREATE INDEX "InventoryUsage_expenseId_idx" ON "public"."InventoryUsage"("expenseId");

-- CreateIndex
CREATE INDEX "InventoryUsage_itemId_idx" ON "public"."InventoryUsage"("itemId");

-- CreateIndex
CREATE INDEX "DealerTransaction_dealerId_date_idx" ON "public"."DealerTransaction"("dealerId", "date");

-- CreateIndex
CREATE INDEX "HatcheryTransaction_hatcheryId_date_idx" ON "public"."HatcheryTransaction"("hatcheryId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineSupplier_userId_name_key" ON "public"."MedicineSupplier"("userId", "name");

-- CreateIndex
CREATE INDEX "MedicineTransaction_supplierId_date_idx" ON "public"."MedicineTransaction"("supplierId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FarmSector_farmId_name_key" ON "public"."FarmSector"("farmId", "name");

-- CreateIndex
CREATE INDEX "CustomerTransaction_customerId_date_idx" ON "public"."CustomerTransaction"("customerId", "date");

-- CreateIndex
CREATE INDEX "Vaccination_batchId_scheduledDate_idx" ON "public"."Vaccination"("batchId", "scheduledDate");

-- CreateIndex
CREATE INDEX "FeedConsumption_batchId_date_idx" ON "public"."FeedConsumption"("batchId", "date");

-- CreateIndex
CREATE INDEX "BirdWeight_batchId_date_idx" ON "public"."BirdWeight"("batchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BatchAnalytics_batchId_key" ON "public"."BatchAnalytics"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "FarmAnalytics_farmId_key" ON "public"."FarmAnalytics"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "LifetimeData_userId_key" ON "public"."LifetimeData"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_name_key" ON "public"."Customer"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Dealer_userId_name_key" ON "public"."Dealer"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Hatchery_userId_name_key" ON "public"."Hatchery"("userId", "name");

-- CreateIndex
CREATE INDEX "Mortality_batchId_date_idx" ON "public"."Mortality"("batchId", "date");

-- CreateIndex
CREATE INDEX "Sale_farmId_date_idx" ON "public"."Sale"("farmId", "date");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Farm" ADD CONSTRAINT "Farm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Batch" ADD CONSTRAINT "Batch_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Batch" ADD CONSTRAINT "Batch_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "public"."FarmSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalesCategory" ADD CONSTRAINT "SalesCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "public"."FarmSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."SalesCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryCategory" ADD CONSTRAINT "InventoryCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."InventoryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryUsage" ADD CONSTRAINT "InventoryUsage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryUsage" ADD CONSTRAINT "InventoryUsage_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryUsage" ADD CONSTRAINT "InventoryUsage_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryUsage" ADD CONSTRAINT "InventoryUsage_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dealer" ADD CONSTRAINT "Dealer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerTransaction" ADD CONSTRAINT "DealerTransaction_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Hatchery" ADD CONSTRAINT "Hatchery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HatcheryTransaction" ADD CONSTRAINT "HatcheryTransaction_hatcheryId_fkey" FOREIGN KEY ("hatcheryId") REFERENCES "public"."Hatchery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicineSupplier" ADD CONSTRAINT "MedicineSupplier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicineTransaction" ADD CONSTRAINT "MedicineTransaction_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."MedicineSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmSector" ADD CONSTRAINT "FarmSector_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerTransaction" ADD CONSTRAINT "CustomerTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mortality" ADD CONSTRAINT "Mortality_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vaccination" ADD CONSTRAINT "Vaccination_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedConsumption" ADD CONSTRAINT "FeedConsumption_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BirdWeight" ADD CONSTRAINT "BirdWeight_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
