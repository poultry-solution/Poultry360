-- CreateEnum
CREATE TYPE "HatcheryIncubationStage" AS ENUM ('SETTER', 'CANDLING', 'HATCHER', 'COMPLETED');

-- CreateEnum
CREATE TYPE "HatcheryIncubationLossType" AS ENUM ('INFERTILE', 'EARLY_DEAD', 'LATE_DEAD', 'UNHATCHED', 'WEAK_CULL');

-- CreateEnum
CREATE TYPE "HatcheryChickGrade" AS ENUM ('A', 'B', 'CULL');

-- CreateEnum
CREATE TYPE "HatcheryChickTxnType" AS ENUM ('PRODUCTION', 'SALE', 'ADJUSTMENT');

-- CreateTable: HatcheryIncubationBatch
CREATE TABLE "HatcheryIncubationBatch" (
    "id" TEXT NOT NULL,
    "hatcheryOwnerId" TEXT NOT NULL,
    "parentBatchId" TEXT NOT NULL,
    "hatchableEggTypeId" TEXT NOT NULL,
    "stage" "HatcheryIncubationStage" NOT NULL DEFAULT 'SETTER',
    "code" TEXT NOT NULL,
    "name" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "eggsSetCount" INTEGER NOT NULL,
    "setterAt" TIMESTAMP(3),
    "candledAt" TIMESTAMP(3),
    "transferredAt" TIMESTAMP(3),
    "hatchedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatcheryIncubationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryEggMove
CREATE TABLE "HatcheryEggMove" (
    "id" TEXT NOT NULL,
    "incubationBatchId" TEXT NOT NULL,
    "parentBatchId" TEXT NOT NULL,
    "eggTypeId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryEggMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryIncubationLoss
CREATE TABLE "HatcheryIncubationLoss" (
    "id" TEXT NOT NULL,
    "incubationBatchId" TEXT NOT NULL,
    "type" "HatcheryIncubationLossType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryIncubationLoss_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryHatchResult
CREATE TABLE "HatcheryHatchResult" (
    "id" TEXT NOT NULL,
    "incubationBatchId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hatchedA" INTEGER NOT NULL DEFAULT 0,
    "hatchedB" INTEGER NOT NULL DEFAULT 0,
    "cull" INTEGER NOT NULL DEFAULT 0,
    "lateDead" INTEGER NOT NULL DEFAULT 0,
    "unhatched" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryHatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryChickStock
CREATE TABLE "HatcheryChickStock" (
    "id" TEXT NOT NULL,
    "incubationBatchId" TEXT NOT NULL,
    "grade" "HatcheryChickGrade" NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatcheryChickStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryChickTxn
CREATE TABLE "HatcheryChickTxn" (
    "id" TEXT NOT NULL,
    "incubationBatchId" TEXT NOT NULL,
    "grade" "HatcheryChickGrade" NOT NULL,
    "type" "HatcheryChickTxnType" NOT NULL,
    "count" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sourceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryChickTxn_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryChickSale
CREATE TABLE "HatcheryChickSale" (
    "id" TEXT NOT NULL,
    "incubationBatchId" TEXT NOT NULL,
    "grade" "HatcheryChickGrade" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "customerName" TEXT,
    "note" TEXT,
    "inventoryItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryChickSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HatcheryIncubationBatch_hatcheryOwnerId_code_key" ON "HatcheryIncubationBatch"("hatcheryOwnerId", "code");
CREATE INDEX "HatcheryIncubationBatch_hatcheryOwnerId_idx" ON "HatcheryIncubationBatch"("hatcheryOwnerId");
CREATE INDEX "HatcheryIncubationBatch_parentBatchId_idx" ON "HatcheryIncubationBatch"("parentBatchId");
CREATE INDEX "HatcheryIncubationBatch_stage_idx" ON "HatcheryIncubationBatch"("stage");

CREATE INDEX "HatcheryEggMove_incubationBatchId_idx" ON "HatcheryEggMove"("incubationBatchId");
CREATE INDEX "HatcheryEggMove_parentBatchId_idx" ON "HatcheryEggMove"("parentBatchId");

CREATE INDEX "HatcheryIncubationLoss_incubationBatchId_idx" ON "HatcheryIncubationLoss"("incubationBatchId");

CREATE INDEX "HatcheryHatchResult_incubationBatchId_idx" ON "HatcheryHatchResult"("incubationBatchId");

CREATE UNIQUE INDEX "HatcheryChickStock_incubationBatchId_grade_key" ON "HatcheryChickStock"("incubationBatchId", "grade");
CREATE INDEX "HatcheryChickStock_incubationBatchId_idx" ON "HatcheryChickStock"("incubationBatchId");

CREATE INDEX "HatcheryChickTxn_incubationBatchId_idx" ON "HatcheryChickTxn"("incubationBatchId");
CREATE INDEX "HatcheryChickTxn_sourceId_idx" ON "HatcheryChickTxn"("sourceId");

CREATE INDEX "HatcheryChickSale_incubationBatchId_idx" ON "HatcheryChickSale"("incubationBatchId");
CREATE INDEX "HatcheryChickSale_date_idx" ON "HatcheryChickSale"("date");

-- AddForeignKey
ALTER TABLE "HatcheryIncubationBatch" ADD CONSTRAINT "HatcheryIncubationBatch_hatcheryOwnerId_fkey" FOREIGN KEY ("hatcheryOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HatcheryIncubationBatch" ADD CONSTRAINT "HatcheryIncubationBatch_parentBatchId_fkey" FOREIGN KEY ("parentBatchId") REFERENCES "HatcheryBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HatcheryIncubationBatch" ADD CONSTRAINT "HatcheryIncubationBatch_hatchableEggTypeId_fkey" FOREIGN KEY ("hatchableEggTypeId") REFERENCES "HatcheryEggType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HatcheryEggMove" ADD CONSTRAINT "HatcheryEggMove_incubationBatchId_fkey" FOREIGN KEY ("incubationBatchId") REFERENCES "HatcheryIncubationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HatcheryEggMove" ADD CONSTRAINT "HatcheryEggMove_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES "HatcheryEggType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HatcheryIncubationLoss" ADD CONSTRAINT "HatcheryIncubationLoss_incubationBatchId_fkey" FOREIGN KEY ("incubationBatchId") REFERENCES "HatcheryIncubationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HatcheryHatchResult" ADD CONSTRAINT "HatcheryHatchResult_incubationBatchId_fkey" FOREIGN KEY ("incubationBatchId") REFERENCES "HatcheryIncubationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HatcheryChickStock" ADD CONSTRAINT "HatcheryChickStock_incubationBatchId_fkey" FOREIGN KEY ("incubationBatchId") REFERENCES "HatcheryIncubationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HatcheryChickTxn" ADD CONSTRAINT "HatcheryChickTxn_incubationBatchId_fkey" FOREIGN KEY ("incubationBatchId") REFERENCES "HatcheryIncubationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HatcheryChickSale" ADD CONSTRAINT "HatcheryChickSale_incubationBatchId_fkey" FOREIGN KEY ("incubationBatchId") REFERENCES "HatcheryIncubationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HatcheryChickSale" ADD CONSTRAINT "HatcheryChickSale_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "HatcheryInventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
