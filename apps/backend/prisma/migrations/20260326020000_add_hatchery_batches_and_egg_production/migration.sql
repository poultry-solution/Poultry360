-- CreateEnum
CREATE TYPE "HatcheryBatchType" AS ENUM ('PARENT_FLOCK', 'INCUBATION');

-- CreateEnum
CREATE TYPE "HatcheryBatchStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "HatcheryEggTxnType" AS ENUM ('PRODUCTION', 'SALE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "HatcheryBatchExpenseType" AS ENUM ('INVENTORY', 'MANUAL');

-- AlterTable: add back-relations via FK columns (done on child tables below)

-- AlterTable: add hatchery batch + egg relations to HatcheryInventoryItem
ALTER TABLE "HatcheryInventoryItem" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- CreateTable: HatcheryBatch
CREATE TABLE "HatcheryBatch" (
    "id" TEXT NOT NULL,
    "hatcheryOwnerId" TEXT NOT NULL,
    "type" "HatcheryBatchType" NOT NULL DEFAULT 'PARENT_FLOCK',
    "status" "HatcheryBatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "code" TEXT NOT NULL,
    "name" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "initialParents" INTEGER,
    "currentParents" INTEGER,
    "placedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatcheryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryBatchPlacement
CREATE TABLE "HatcheryBatchPlacement" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryBatchPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryBatchMortality
CREATE TABLE "HatcheryBatchMortality" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryBatchMortality_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryBatchExpense
CREATE TABLE "HatcheryBatchExpense" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "HatcheryBatchExpenseType" NOT NULL DEFAULT 'MANUAL',
    "category" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DECIMAL(12,4),
    "unit" TEXT,
    "unitPrice" DECIMAL(12,4),
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "inventoryItemId" TEXT,
    "inventoryTxnId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryBatchExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryEggType
CREATE TABLE "HatcheryEggType" (
    "id" TEXT NOT NULL,
    "hatcheryOwnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isHatchable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatcheryEggType_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryEggProduction
CREATE TABLE "HatcheryEggProduction" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryEggProduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryEggProductionLine
CREATE TABLE "HatcheryEggProductionLine" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "eggTypeId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "HatcheryEggProductionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryEggStock
CREATE TABLE "HatcheryEggStock" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "eggTypeId" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatcheryEggStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryEggTxn
CREATE TABLE "HatcheryEggTxn" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "eggTypeId" TEXT NOT NULL,
    "type" "HatcheryEggTxnType" NOT NULL,
    "count" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sourceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryEggTxn_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryEggSale
CREATE TABLE "HatcheryEggSale" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "eggTypeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "customerName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryEggSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryParentSale
CREATE TABLE "HatcheryParentSale" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "customerName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryParentSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HatcheryBatch_hatcheryOwnerId_code_key" ON "HatcheryBatch"("hatcheryOwnerId", "code");
CREATE INDEX "HatcheryBatch_hatcheryOwnerId_idx" ON "HatcheryBatch"("hatcheryOwnerId");
CREATE INDEX "HatcheryBatch_status_idx" ON "HatcheryBatch"("status");
CREATE INDEX "HatcheryBatch_type_idx" ON "HatcheryBatch"("type");

CREATE INDEX "HatcheryBatchPlacement_batchId_idx" ON "HatcheryBatchPlacement"("batchId");
CREATE INDEX "HatcheryBatchMortality_batchId_idx" ON "HatcheryBatchMortality"("batchId");
CREATE INDEX "HatcheryBatchMortality_date_idx" ON "HatcheryBatchMortality"("date");
CREATE INDEX "HatcheryBatchExpense_batchId_idx" ON "HatcheryBatchExpense"("batchId");
CREATE INDEX "HatcheryBatchExpense_date_idx" ON "HatcheryBatchExpense"("date");

CREATE UNIQUE INDEX "HatcheryEggType_hatcheryOwnerId_name_key" ON "HatcheryEggType"("hatcheryOwnerId", "name");
CREATE INDEX "HatcheryEggType_hatcheryOwnerId_idx" ON "HatcheryEggType"("hatcheryOwnerId");

CREATE INDEX "HatcheryEggProduction_batchId_idx" ON "HatcheryEggProduction"("batchId");
CREATE INDEX "HatcheryEggProduction_date_idx" ON "HatcheryEggProduction"("date");
CREATE INDEX "HatcheryEggProductionLine_productionId_idx" ON "HatcheryEggProductionLine"("productionId");
CREATE INDEX "HatcheryEggProductionLine_eggTypeId_idx" ON "HatcheryEggProductionLine"("eggTypeId");

CREATE UNIQUE INDEX "HatcheryEggStock_batchId_eggTypeId_key" ON "HatcheryEggStock"("batchId", "eggTypeId");
CREATE INDEX "HatcheryEggStock_batchId_idx" ON "HatcheryEggStock"("batchId");

CREATE INDEX "HatcheryEggTxn_batchId_idx" ON "HatcheryEggTxn"("batchId");
CREATE INDEX "HatcheryEggTxn_eggTypeId_idx" ON "HatcheryEggTxn"("eggTypeId");
CREATE INDEX "HatcheryEggTxn_sourceId_idx" ON "HatcheryEggTxn"("sourceId");

CREATE INDEX "HatcheryEggSale_batchId_idx" ON "HatcheryEggSale"("batchId");
CREATE INDEX "HatcheryEggSale_date_idx" ON "HatcheryEggSale"("date");
CREATE INDEX "HatcheryParentSale_batchId_idx" ON "HatcheryParentSale"("batchId");
CREATE INDEX "HatcheryParentSale_date_idx" ON "HatcheryParentSale"("date");

-- AddForeignKey
ALTER TABLE "HatcheryBatch" ADD CONSTRAINT "HatcheryBatch_hatcheryOwnerId_fkey" FOREIGN KEY ("hatcheryOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HatcheryBatchPlacement" ADD CONSTRAINT "HatcheryBatchPlacement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "HatcheryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HatcheryBatchPlacement" ADD CONSTRAINT "HatcheryBatchPlacement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "HatcheryInventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HatcheryBatchMortality" ADD CONSTRAINT "HatcheryBatchMortality_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "HatcheryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HatcheryBatchExpense" ADD CONSTRAINT "HatcheryBatchExpense_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "HatcheryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HatcheryBatchExpense" ADD CONSTRAINT "HatcheryBatchExpense_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "HatcheryInventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HatcheryEggType" ADD CONSTRAINT "HatcheryEggType_hatcheryOwnerId_fkey" FOREIGN KEY ("hatcheryOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HatcheryEggProduction" ADD CONSTRAINT "HatcheryEggProduction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "HatcheryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HatcheryEggProductionLine" ADD CONSTRAINT "HatcheryEggProductionLine_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "HatcheryEggProduction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HatcheryEggProductionLine" ADD CONSTRAINT "HatcheryEggProductionLine_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES "HatcheryEggType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HatcheryEggStock" ADD CONSTRAINT "HatcheryEggStock_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "HatcheryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HatcheryEggStock" ADD CONSTRAINT "HatcheryEggStock_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES "HatcheryEggType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HatcheryEggTxn" ADD CONSTRAINT "HatcheryEggTxn_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "HatcheryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HatcheryEggTxn" ADD CONSTRAINT "HatcheryEggTxn_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES "HatcheryEggType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HatcheryEggSale" ADD CONSTRAINT "HatcheryEggSale_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "HatcheryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HatcheryEggSale" ADD CONSTRAINT "HatcheryEggSale_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES "HatcheryEggType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HatcheryParentSale" ADD CONSTRAINT "HatcheryParentSale_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "HatcheryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
