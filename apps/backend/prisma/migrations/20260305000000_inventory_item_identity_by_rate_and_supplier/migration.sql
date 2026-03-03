-- Inventory identity: same name + rate + supplier = one row; different rate or supplier = separate row
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "unitPrice" DECIMAL(10,2);
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "supplierKey" TEXT;

-- Backfill from latest purchase (EntityTransaction) per item
UPDATE "InventoryItem" i
SET "unitPrice" = sub.unit_price,
    "supplierKey" = sub.supplier_key
FROM (
  SELECT DISTINCT ON ("inventoryItemId")
    "inventoryItemId",
    COALESCE(
      "unitPrice"::numeric,
      CASE WHEN "quantity" IS NOT NULL AND "quantity" != 0 THEN "amount"::numeric / "quantity" ELSE 0 END
    ) AS unit_price,
    CASE
      WHEN "dealerId" IS NOT NULL THEN 'DEALER:' || "dealerId"
      WHEN "hatcheryId" IS NOT NULL THEN 'HATCHERY:' || "hatcheryId"
      WHEN "medicineSupplierId" IS NOT NULL THEN 'MEDICINE_SUPPLIER:' || "medicineSupplierId"
      ELSE 'NONE'
    END AS supplier_key
  FROM "EntityTransaction"
  WHERE type = 'PURCHASE' AND "inventoryItemId" IS NOT NULL
  ORDER BY "inventoryItemId", "date" DESC
) sub
WHERE sub."inventoryItemId" = i.id;

-- Ensure no NULLs so unique constraint is valid
UPDATE "InventoryItem" SET "unitPrice" = 0 WHERE "unitPrice" IS NULL;
UPDATE "InventoryItem" SET "supplierKey" = 'NONE' WHERE "supplierKey" IS NULL;

-- Replace unique constraint
DROP INDEX IF EXISTS "InventoryItem_userId_categoryId_name_key";
CREATE UNIQUE INDEX "InventoryItem_userId_categoryId_name_unitPrice_supplierKey_key" ON "InventoryItem"("userId", "categoryId", "name", "unitPrice", "supplierKey");
