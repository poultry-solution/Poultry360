-- CreateEnum
CREATE TYPE "HatcherySupplierTxnType" AS ENUM ('PURCHASE', 'PAYMENT', 'ADJUSTMENT', 'OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "HatcheryPurchaseCategory" AS ENUM ('FEED', 'MEDICINE', 'CHICKS', 'OTHER');

-- CreateEnum
CREATE TYPE "HatcheryInventoryItemType" AS ENUM ('FEED', 'MEDICINE', 'CHICKS', 'OTHER');

-- CreateEnum
CREATE TYPE "HatcheryInventoryTxnType" AS ENUM ('PURCHASE', 'USAGE', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "HatcherySupplier" (
    "id" TEXT NOT NULL,
    "hatcheryOwnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "address" TEXT,
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatcherySupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HatcherySupplierTxn" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "type" "HatcherySupplierTxnType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "purchaseCategory" "HatcheryPurchaseCategory",
    "receiptImageUrl" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatcherySupplierTxn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HatcherySupplierPurchaseItem" (
    "id" TEXT NOT NULL,
    "txnId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "freeQuantity" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "HatcherySupplierPurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HatcheryInventoryItem" (
    "id" TEXT NOT NULL,
    "hatcheryOwnerId" TEXT NOT NULL,
    "itemType" "HatcheryInventoryItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "supplierKey" TEXT NOT NULL DEFAULT 'NONE',
    "currentStock" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(12,4),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatcheryInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HatcheryInventoryTxn" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "HatcheryInventoryTxnType" NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unitPrice" DECIMAL(12,4),
    "amount" DECIMAL(12,2),
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "sourceSupplierTxnId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryInventoryTxn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HatcherySupplier_hatcheryOwnerId_idx" ON "HatcherySupplier"("hatcheryOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "HatcherySupplier_hatcheryOwnerId_name_key" ON "HatcherySupplier"("hatcheryOwnerId", "name");

-- CreateIndex
CREATE INDEX "HatcherySupplierTxn_supplierId_idx" ON "HatcherySupplierTxn"("supplierId");

-- CreateIndex
CREATE INDEX "HatcherySupplierTxn_date_idx" ON "HatcherySupplierTxn"("date");

-- CreateIndex
CREATE INDEX "HatcherySupplierPurchaseItem_txnId_idx" ON "HatcherySupplierPurchaseItem"("txnId");

-- CreateIndex
CREATE UNIQUE INDEX "HatcheryInventoryItem_hatcheryOwnerId_itemType_name_unitPrice_supplierKey_key" ON "HatcheryInventoryItem"("hatcheryOwnerId", "itemType", "name", "unitPrice", "supplierKey");

-- CreateIndex
CREATE INDEX "HatcheryInventoryItem_hatcheryOwnerId_idx" ON "HatcheryInventoryItem"("hatcheryOwnerId");

-- CreateIndex
CREATE INDEX "HatcheryInventoryItem_itemType_idx" ON "HatcheryInventoryItem"("itemType");

-- CreateIndex
CREATE INDEX "HatcheryInventoryTxn_itemId_idx" ON "HatcheryInventoryTxn"("itemId");

-- CreateIndex
CREATE INDEX "HatcheryInventoryTxn_sourceSupplierTxnId_idx" ON "HatcheryInventoryTxn"("sourceSupplierTxnId");

-- AddForeignKey
ALTER TABLE "HatcherySupplier" ADD CONSTRAINT "HatcherySupplier_hatcheryOwnerId_fkey" FOREIGN KEY ("hatcheryOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HatcherySupplierTxn" ADD CONSTRAINT "HatcherySupplierTxn_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "HatcherySupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HatcherySupplierPurchaseItem" ADD CONSTRAINT "HatcherySupplierPurchaseItem_txnId_fkey" FOREIGN KEY ("txnId") REFERENCES "HatcherySupplierTxn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HatcheryInventoryItem" ADD CONSTRAINT "HatcheryInventoryItem_hatcheryOwnerId_fkey" FOREIGN KEY ("hatcheryOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HatcheryInventoryTxn" ADD CONSTRAINT "HatcheryInventoryTxn_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "HatcheryInventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HatcheryInventoryTxn" ADD CONSTRAINT "HatcheryInventoryTxn_sourceSupplierTxnId_fkey" FOREIGN KEY ("sourceSupplierTxnId") REFERENCES "HatcherySupplierTxn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
