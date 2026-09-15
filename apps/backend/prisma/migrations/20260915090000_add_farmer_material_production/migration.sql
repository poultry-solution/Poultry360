ALTER TYPE "PurchaseCategory" ADD VALUE 'RAW_MATERIAL';
ALTER TYPE "InventoryItemType" ADD VALUE 'RAW_MATERIAL';

CREATE TYPE "InventoryOrigin" AS ENUM ('PURCHASED', 'SELF_MADE', 'MANUAL');
CREATE TYPE "InventoryTransactionType" AS ENUM (
  'PURCHASE',
  'USAGE',
  'ADJUSTMENT',
  'PRODUCTION_INPUT',
  'PRODUCTION_OUTPUT'
);

ALTER TABLE "InventoryTransaction"
  ALTER COLUMN "type" TYPE "InventoryTransactionType"
  USING (
    CASE
      WHEN "type"::text IN ('PURCHASE', 'USAGE', 'ADJUSTMENT')
        THEN "type"::text
      ELSE 'ADJUSTMENT'
    END
  )::"InventoryTransactionType";

ALTER TABLE "EntityTransaction"
  ALTER COLUMN "quantity" TYPE DECIMAL(10,2)
  USING ("quantity"::DECIMAL(10,2));

ALTER TABLE "InventoryItem"
  ADD COLUMN "origin" "InventoryOrigin" NOT NULL DEFAULT 'PURCHASED',
  ADD COLUMN "manufacturedProductId" TEXT;

UPDATE "InventoryItem"
SET "origin" = 'MANUAL'
WHERE "supplierKey" IS NULL OR "supplierKey" = 'NONE';

CREATE TABLE "FarmerManufacturedProduct" (
  "id" TEXT NOT NULL,
  "farmerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'kg',
  "outputItemType" "InventoryItemType" NOT NULL DEFAULT 'FEED',
  "minStock" DECIMAL(10,2),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FarmerManufacturedProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FarmerProductionRun" (
  "id" TEXT NOT NULL,
  "farmerId" TEXT NOT NULL,
  "createdById" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "referenceNumber" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FarmerProductionRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FarmerProductionInput" (
  "id" TEXT NOT NULL,
  "productionId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "inventoryTxnId" TEXT NOT NULL,
  "quantity" DECIMAL(10,2) NOT NULL,
  "unitCost" DECIMAL(12,4) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FarmerProductionInput_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FarmerProductionOutput" (
  "id" TEXT NOT NULL,
  "productionId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "inventoryTxnId" TEXT NOT NULL,
  "quantity" DECIMAL(10,2) NOT NULL,
  "costAllocationPercent" DECIMAL(7,4) NOT NULL,
  "unitCost" DECIMAL(12,4) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FarmerProductionOutput_pkey" PRIMARY KEY ("id")
);

DROP INDEX IF EXISTS "InventoryItem_identity_with_expiry_key";
CREATE UNIQUE INDEX "InventoryItem_identity_with_unit_and_expiry_key"
  ON "InventoryItem"("userId", "categoryId", "name", "unit", "unitPrice", "supplierKey", "expiryDateKey");
CREATE INDEX "InventoryItem_manufacturedProductId_idx" ON "InventoryItem"("manufacturedProductId");

CREATE UNIQUE INDEX "FarmerManufacturedProduct_farmerId_name_unit_outputItemType_key"
  ON "FarmerManufacturedProduct"("farmerId", "name", "unit", "outputItemType");
CREATE INDEX "FarmerManufacturedProduct_farmerId_deletedAt_idx"
  ON "FarmerManufacturedProduct"("farmerId", "deletedAt");
CREATE INDEX "FarmerProductionRun_farmerId_date_idx" ON "FarmerProductionRun"("farmerId", "date");
CREATE INDEX "FarmerProductionRun_referenceNumber_idx" ON "FarmerProductionRun"("referenceNumber");
CREATE UNIQUE INDEX "FarmerProductionInput_inventoryTxnId_key" ON "FarmerProductionInput"("inventoryTxnId");
CREATE INDEX "FarmerProductionInput_productionId_idx" ON "FarmerProductionInput"("productionId");
CREATE INDEX "FarmerProductionInput_inventoryItemId_idx" ON "FarmerProductionInput"("inventoryItemId");
CREATE UNIQUE INDEX "FarmerProductionOutput_inventoryTxnId_key" ON "FarmerProductionOutput"("inventoryTxnId");
CREATE INDEX "FarmerProductionOutput_productionId_idx" ON "FarmerProductionOutput"("productionId");
CREATE INDEX "FarmerProductionOutput_productId_idx" ON "FarmerProductionOutput"("productId");
CREATE INDEX "FarmerProductionOutput_inventoryItemId_idx" ON "FarmerProductionOutput"("inventoryItemId");

ALTER TABLE "FarmerManufacturedProduct" ADD CONSTRAINT "FarmerManufacturedProduct_farmerId_fkey"
  FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmerProductionRun" ADD CONSTRAINT "FarmerProductionRun_farmerId_fkey"
  FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmerProductionRun" ADD CONSTRAINT "FarmerProductionRun_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_manufacturedProductId_fkey"
  FOREIGN KEY ("manufacturedProductId") REFERENCES "FarmerManufacturedProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FarmerProductionInput" ADD CONSTRAINT "FarmerProductionInput_productionId_fkey"
  FOREIGN KEY ("productionId") REFERENCES "FarmerProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmerProductionInput" ADD CONSTRAINT "FarmerProductionInput_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FarmerProductionInput" ADD CONSTRAINT "FarmerProductionInput_inventoryTxnId_fkey"
  FOREIGN KEY ("inventoryTxnId") REFERENCES "InventoryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FarmerProductionOutput" ADD CONSTRAINT "FarmerProductionOutput_productionId_fkey"
  FOREIGN KEY ("productionId") REFERENCES "FarmerProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmerProductionOutput" ADD CONSTRAINT "FarmerProductionOutput_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "FarmerManufacturedProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FarmerProductionOutput" ADD CONSTRAINT "FarmerProductionOutput_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FarmerProductionOutput" ADD CONSTRAINT "FarmerProductionOutput_inventoryTxnId_fkey"
  FOREIGN KEY ("inventoryTxnId") REFERENCES "InventoryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
