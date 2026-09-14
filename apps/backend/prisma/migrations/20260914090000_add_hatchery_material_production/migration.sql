ALTER TYPE "HatcheryPurchaseCategory" ADD VALUE 'RAW_MATERIAL';
ALTER TYPE "HatcheryInventoryItemType" ADD VALUE 'RAW_MATERIAL';
ALTER TYPE "HatcheryInventoryItemType" ADD VALUE 'SELF_MADE';
ALTER TYPE "HatcheryInventoryTxnType" ADD VALUE 'PRODUCTION_INPUT';
ALTER TYPE "HatcheryInventoryTxnType" ADD VALUE 'PRODUCTION_OUTPUT';

CREATE TABLE "HatcheryManufacturedProduct" (
    "id" TEXT NOT NULL,
    "hatcheryOwnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "minStock" DECIMAL(12,4),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HatcheryManufacturedProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HatcheryProductionRun" (
    "id" TEXT NOT NULL,
    "hatcheryOwnerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HatcheryProductionRun_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "HatcheryInventoryItem" ADD COLUMN "manufacturedProductId" TEXT;

CREATE TABLE "HatcheryProductionInput" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "inventoryTxnId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HatcheryProductionInput_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HatcheryProductionOutput" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "inventoryTxnId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "costAllocationPercent" DECIMAL(7,4) NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HatcheryProductionOutput_pkey" PRIMARY KEY ("id")
);

DROP INDEX IF EXISTS "HatcheryInventoryItem_hatcheryOwnerId_itemType_name_unitPrice_supplierKey_key";
DROP INDEX IF EXISTS "HatcheryInventoryItem_hatcheryOwnerId_itemType_name_unitPri_key";
CREATE UNIQUE INDEX "HatcheryInventoryItem_owner_type_name_unit_price_source_key"
    ON "HatcheryInventoryItem"("hatcheryOwnerId", "itemType", "name", "unit", "unitPrice", "supplierKey");
CREATE INDEX "HatcheryInventoryItem_manufacturedProductId_idx" ON "HatcheryInventoryItem"("manufacturedProductId");

CREATE UNIQUE INDEX "HatcheryManufacturedProduct_hatcheryOwnerId_name_unit_key"
    ON "HatcheryManufacturedProduct"("hatcheryOwnerId", "name", "unit");
CREATE INDEX "HatcheryManufacturedProduct_hatcheryOwnerId_deletedAt_idx"
    ON "HatcheryManufacturedProduct"("hatcheryOwnerId", "deletedAt");
CREATE INDEX "HatcheryProductionRun_hatcheryOwnerId_date_idx" ON "HatcheryProductionRun"("hatcheryOwnerId", "date");
CREATE INDEX "HatcheryProductionRun_referenceNumber_idx" ON "HatcheryProductionRun"("referenceNumber");
CREATE UNIQUE INDEX "HatcheryProductionInput_inventoryTxnId_key" ON "HatcheryProductionInput"("inventoryTxnId");
CREATE INDEX "HatcheryProductionInput_productionId_idx" ON "HatcheryProductionInput"("productionId");
CREATE INDEX "HatcheryProductionInput_inventoryItemId_idx" ON "HatcheryProductionInput"("inventoryItemId");
CREATE UNIQUE INDEX "HatcheryProductionOutput_inventoryTxnId_key" ON "HatcheryProductionOutput"("inventoryTxnId");
CREATE INDEX "HatcheryProductionOutput_productionId_idx" ON "HatcheryProductionOutput"("productionId");
CREATE INDEX "HatcheryProductionOutput_productId_idx" ON "HatcheryProductionOutput"("productId");
CREATE INDEX "HatcheryProductionOutput_inventoryItemId_idx" ON "HatcheryProductionOutput"("inventoryItemId");

ALTER TABLE "HatcheryManufacturedProduct" ADD CONSTRAINT "HatcheryManufacturedProduct_hatcheryOwnerId_fkey"
    FOREIGN KEY ("hatcheryOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HatcheryProductionRun" ADD CONSTRAINT "HatcheryProductionRun_hatcheryOwnerId_fkey"
    FOREIGN KEY ("hatcheryOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HatcheryInventoryItem" ADD CONSTRAINT "HatcheryInventoryItem_manufacturedProductId_fkey"
    FOREIGN KEY ("manufacturedProductId") REFERENCES "HatcheryManufacturedProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HatcheryProductionInput" ADD CONSTRAINT "HatcheryProductionInput_productionId_fkey"
    FOREIGN KEY ("productionId") REFERENCES "HatcheryProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HatcheryProductionInput" ADD CONSTRAINT "HatcheryProductionInput_inventoryItemId_fkey"
    FOREIGN KEY ("inventoryItemId") REFERENCES "HatcheryInventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HatcheryProductionInput" ADD CONSTRAINT "HatcheryProductionInput_inventoryTxnId_fkey"
    FOREIGN KEY ("inventoryTxnId") REFERENCES "HatcheryInventoryTxn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HatcheryProductionOutput" ADD CONSTRAINT "HatcheryProductionOutput_productionId_fkey"
    FOREIGN KEY ("productionId") REFERENCES "HatcheryProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HatcheryProductionOutput" ADD CONSTRAINT "HatcheryProductionOutput_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "HatcheryManufacturedProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HatcheryProductionOutput" ADD CONSTRAINT "HatcheryProductionOutput_inventoryItemId_fkey"
    FOREIGN KEY ("inventoryItemId") REFERENCES "HatcheryInventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HatcheryProductionOutput" ADD CONSTRAINT "HatcheryProductionOutput_inventoryTxnId_fkey"
    FOREIGN KEY ("inventoryTxnId") REFERENCES "HatcheryInventoryTxn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
