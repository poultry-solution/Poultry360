-- Optional medicine expiry support for supplier purchases and inventory lots.
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "expiryDateKey" TEXT NOT NULL DEFAULT 'NO_EXPIRY';
ALTER TABLE "InventoryTransaction" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);
ALTER TABLE "EntityTransaction" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);

UPDATE "InventoryItem"
SET "expiryDateKey" = 'NO_EXPIRY'
WHERE "expiryDateKey" IS NULL OR "expiryDateKey" = '';

DROP INDEX IF EXISTS "InventoryItem_userId_categoryId_name_unitPrice_supplierKey_key";
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_identity_with_expiry_key"
  ON "InventoryItem"("userId", "categoryId", "name", "unitPrice", "supplierKey", "expiryDateKey");
