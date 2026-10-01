BEGIN;

-- KG is always one kilogram. Keep old spelling variants readable without
-- changing the stored unit text, because unit is part of the inventory key.
UPDATE "public"."InventoryItem"
SET "kgPerUnit" = 1
WHERE "itemType" = 'FEED'
  AND lower(btrim("unit")) IN ('kg', 'kgs', 'kilogram', 'kilograms')
  AND ("kgPerUnit" IS NULL OR "kgPerUnit" <> 1);

-- A Bag defaults to 50 kg. Existing positive item-specific values, such as
-- 10 kg per Bag, are kept unchanged.
UPDATE "public"."InventoryItem"
SET "kgPerUnit" = 50
WHERE "itemType" = 'FEED'
  AND lower(btrim("unit")) = 'bag'
  AND ("kgPerUnit" IS NULL OR "kgPerUnit" <= 0);

-- Use an old inventory usage only when it is the single exact match for the
-- feed row. This avoids choosing an arbitrary item when old data is unclear.
WITH "candidateMatches" AS (
  SELECT
    fc."id" AS "feedConsumptionId",
    ii."unit" AS "inventoryUnit",
    CASE
      WHEN lower(btrim(ii."unit")) IN ('kg', 'kgs', 'kilogram', 'kilograms') THEN 1::DECIMAL
      WHEN ii."kgPerUnit" > 0 THEN ii."kgPerUnit"
      ELSE NULL
    END AS "resolvedKgPerUnit",
    COUNT(*) OVER (PARTITION BY fc."id") AS "matchCount"
  FROM "public"."FeedConsumption" fc
  INNER JOIN "public"."InventoryUsage" iu
    ON iu."batchId" = fc."batchId"
   AND iu."date" = fc."date"
   AND iu."quantity" = fc."quantity"
  INNER JOIN "public"."InventoryItem" ii
    ON ii."id" = iu."itemId"
   AND ii."itemType" = 'FEED'
   AND lower(btrim(ii."name")) = lower(btrim(fc."feedType"))
  WHERE fc."quantityKg" IS NULL
),
"uniqueMatches" AS (
  SELECT
    "feedConsumptionId",
    "inventoryUnit",
    "resolvedKgPerUnit"
  FROM "candidateMatches"
  WHERE "matchCount" = 1
    AND "resolvedKgPerUnit" IS NOT NULL
)
UPDATE "public"."FeedConsumption" fc
SET
  "unit" = matched."inventoryUnit",
  "kgPerUnit" = matched."resolvedKgPerUnit",
  "quantityKg" = round(fc."quantity" * matched."resolvedKgPerUnit", 3)
FROM "uniqueMatches" matched
WHERE fc."id" = matched."feedConsumptionId"
  AND fc."quantityKg" IS NULL;

-- Rows with no single safe match keep the old system behavior: quantity was
-- treated as kilograms. This preserves their historical FCR values.
UPDATE "public"."FeedConsumption"
SET
  "unit" = 'kg',
  "kgPerUnit" = 1,
  "quantityKg" = round("quantity", 3)
WHERE "quantityKg" IS NULL;

-- Fail the whole migration instead of leaving partly converted feed data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."FeedConsumption"
    WHERE "quantityKg" IS NULL OR "quantityKg" <= 0
  ) THEN
    RAISE EXCEPTION 'FeedConsumption quantityKg backfill is incomplete or invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."InventoryItem"
    WHERE "itemType" = 'FEED'
      AND lower(btrim("unit")) IN ('kg', 'kgs', 'kilogram', 'kilograms', 'bag')
      AND ("kgPerUnit" IS NULL OR "kgPerUnit" <= 0)
  ) THEN
    RAISE EXCEPTION 'Feed inventory kgPerUnit backfill is incomplete or invalid';
  END IF;
END $$;

COMMIT;
