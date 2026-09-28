-- Optional expiry dates for Dealer stock batches.
ALTER TABLE "DealerProduct" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);
ALTER TABLE "DealerProduct" ADD COLUMN IF NOT EXISTS "expiryDateKey" TEXT NOT NULL DEFAULT 'NO_EXPIRY';
ALTER TABLE "DealerManualPurchaseItem" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);
ALTER TABLE "DealerProductTransaction" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);

UPDATE "DealerProduct"
SET "expiryDateKey" = 'NO_EXPIRY'
WHERE "expiryDateKey" IS NULL OR "expiryDateKey" = '';

DROP INDEX IF EXISTS "DealerProduct_dealerId_name_costPrice_sellingPrice_manualCompanyId_supplierCompanyId_key";
DROP INDEX IF EXISTS "DealerProduct_dealerId_name_costPrice_sellingPrice_manualCo_key";

CREATE UNIQUE INDEX IF NOT EXISTS "DealerProduct_identity_with_expiry_key"
  ON "DealerProduct"(
    "dealerId",
    "name",
    "costPrice",
    "sellingPrice",
    "manualCompanyId",
    "supplierCompanyId",
    "expiryDateKey"
  );

CREATE INDEX IF NOT EXISTS "DealerProduct_dealerId_expiryDateKey_idx"
  ON "DealerProduct"("dealerId", "expiryDateKey");
