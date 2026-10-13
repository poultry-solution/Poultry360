-- Dealer profit: save the cost of each sold item.
--
-- Adds two nullable columns to DealerSaleItem and fills them for old sales.
-- Only these new columns are written. No sale, stock, balance, payment or
-- ledger value changes.
--
-- Cost per base unit = product costPrice, lowered by the trade discount of the
-- (non-voided) purchases that brought this product in, spread by value.
-- Lines without a product (Broiler lines, deleted products) stay NULL.

-- AlterTable
ALTER TABLE "public"."DealerSaleItem" ADD COLUMN     "unitCost" DECIMAL(12,4),
ADD COLUMN     "costAmount" DECIMAL(12,2);

-- Backfill
WITH purchase_rate AS (
  SELECT p."id",
         CASE
           WHEN SUM(i."totalAmount") > 0
             THEN LEAST(GREATEST(COALESCE(p."tradeDiscountAmount", 0), 0), SUM(i."totalAmount")) / SUM(i."totalAmount")
           ELSE 0
         END AS rate
  FROM "public"."DealerManualPurchase" p
  JOIN "public"."DealerManualPurchaseItem" i ON i."purchaseId" = p."id"
  WHERE p."voidedAt" IS NULL
  GROUP BY p."id"
),
product_rate AS (
  SELECT i."dealerProductId" AS product_id,
         SUM(i."totalAmount" * pr.rate) / NULLIF(SUM(i."totalAmount"), 0) AS rate
  FROM "public"."DealerManualPurchaseItem" i
  JOIN purchase_rate pr ON pr."id" = i."purchaseId"
  WHERE i."dealerProductId" IS NOT NULL
  GROUP BY i."dealerProductId"
),
product_cost AS (
  SELECT dp."id" AS product_id,
         ROUND(dp."costPrice" * (1 - COALESCE(r.rate, 0)), 4) AS unit_cost
  FROM "public"."DealerProduct" dp
  LEFT JOIN product_rate r ON r.product_id = dp."id"
)
UPDATE "public"."DealerSaleItem" si
SET "unitCost"   = pc.unit_cost,
    "costAmount" = ROUND(COALESCE(si."baseQuantity", si."quantity") * pc.unit_cost, 2)
FROM product_cost pc
WHERE si."productId" = pc.product_id
  AND si."costAmount" IS NULL;
