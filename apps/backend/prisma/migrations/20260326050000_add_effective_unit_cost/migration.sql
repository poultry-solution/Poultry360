-- Add effectiveUnitCost to HatcheryInventoryItem
-- This stores the weighted-average cost per unit: totalPaidAmount / (paidQty + freeQty)
-- so that free units do not inflate batch expenses.
ALTER TABLE "HatcheryInventoryItem" ADD COLUMN "effectiveUnitCost" DECIMAL(12,4);

-- Back-fill: for existing rows with no free qty, effectiveUnitCost = unitPrice
UPDATE "HatcheryInventoryItem" SET "effectiveUnitCost" = "unitPrice" WHERE "effectiveUnitCost" IS NULL;
