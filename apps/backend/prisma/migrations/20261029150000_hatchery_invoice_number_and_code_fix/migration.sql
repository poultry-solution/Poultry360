-- Hand-written migration: add hatchery invoice numbers across the three sale
-- tables and backfill them in date order per hatchery.
--
-- Design (see HATCHERY_PLAN.md Phase 2):
--   * One counter per hatchery, shared across HatcheryEggSale, HatcheryParentSale
--     and HatcheryChickSale.
--   * Format: HB-0001, HB-0002, ... (4-digit pad).
--   * `hatcheryOwnerId` is denormalised onto each sale row — matches the dealer
--     precedent (`DealerSale.dealerId`) and lets us put a DB-level unique on
--     (hatcheryOwnerId, invoiceNumber).
--   * Nullable for now so pre-existing rows and in-flight writes have room to
--     settle; a follow-up migration can tighten to NOT NULL once the backfill
--     and the application writes have been proven.
--
-- Prisma names the generated indexes with these conventions, so the SQL names
-- below match what `prisma migrate deploy` would emit from the schema change:
--   @@unique([hatcheryOwnerId, invoiceNumber]) -> "<Table>_hatcheryOwnerId_invoiceNumber_key"
--   @@index([hatcheryOwnerId])                 -> "<Table>_hatcheryOwnerId_idx"

-- 1. Add the two columns on each sale table (nullable).
ALTER TABLE "HatcheryEggSale"
  ADD COLUMN "invoiceNumber"   TEXT,
  ADD COLUMN "hatcheryOwnerId" TEXT;

ALTER TABLE "HatcheryParentSale"
  ADD COLUMN "invoiceNumber"   TEXT,
  ADD COLUMN "hatcheryOwnerId" TEXT;

ALTER TABLE "HatcheryChickSale"
  ADD COLUMN "invoiceNumber"   TEXT,
  ADD COLUMN "hatcheryOwnerId" TEXT;

-- 2. Backfill hatcheryOwnerId from the parent FK.
--    Egg + Parent sales reach the owner via HatcheryBatch.
--    Chick sales reach the owner via HatcheryIncubationBatch.
UPDATE "HatcheryEggSale" s
   SET "hatcheryOwnerId" = b."hatcheryOwnerId"
  FROM "HatcheryBatch" b
 WHERE b.id = s."batchId";

UPDATE "HatcheryParentSale" s
   SET "hatcheryOwnerId" = b."hatcheryOwnerId"
  FROM "HatcheryBatch" b
 WHERE b.id = s."batchId";

UPDATE "HatcheryChickSale" s
   SET "hatcheryOwnerId" = i."hatcheryOwnerId"
  FROM "HatcheryIncubationBatch" i
 WHERE i.id = s."incubationBatchId";

-- 3. Backfill invoiceNumber in a single shared sequence per hatchery.
--    Materialise the ordering into a TEMP TABLE so each UPDATE sees the same
--    sequence and avoids re-executing a cross-table UNION three times.
CREATE TEMP TABLE _hb_invoice_backfill AS
WITH all_sales AS (
    SELECT 'EGG'::text    AS tbl, id, "hatcheryOwnerId", "date", "createdAt"
      FROM "HatcheryEggSale"    WHERE "hatcheryOwnerId" IS NOT NULL
    UNION ALL
    SELECT 'PARENT'::text AS tbl, id, "hatcheryOwnerId", "date", "createdAt"
      FROM "HatcheryParentSale" WHERE "hatcheryOwnerId" IS NOT NULL
    UNION ALL
    SELECT 'CHICK'::text  AS tbl, id, "hatcheryOwnerId", "date", "createdAt"
      FROM "HatcheryChickSale"  WHERE "hatcheryOwnerId" IS NOT NULL
)
SELECT tbl,
       id,
       ROW_NUMBER() OVER (
         PARTITION BY "hatcheryOwnerId"
         ORDER BY "date", "createdAt", id
       ) AS seq
  FROM all_sales;

UPDATE "HatcheryEggSale" s
   SET "invoiceNumber" = 'HB-' || LPAD(b.seq::text, 4, '0')
  FROM _hb_invoice_backfill b
 WHERE b.tbl = 'EGG' AND b.id = s.id;

UPDATE "HatcheryParentSale" s
   SET "invoiceNumber" = 'HB-' || LPAD(b.seq::text, 4, '0')
  FROM _hb_invoice_backfill b
 WHERE b.tbl = 'PARENT' AND b.id = s.id;

UPDATE "HatcheryChickSale" s
   SET "invoiceNumber" = 'HB-' || LPAD(b.seq::text, 4, '0')
  FROM _hb_invoice_backfill b
 WHERE b.tbl = 'CHICK' AND b.id = s.id;

DROP TABLE _hb_invoice_backfill;

-- 4. Constraints. Postgres treats NULL values in a unique index as distinct, so
--    rows that have not been backfilled (e.g., mid-flight writes) can co-exist.
CREATE UNIQUE INDEX "HatcheryEggSale_hatcheryOwnerId_invoiceNumber_key"
  ON "HatcheryEggSale"("hatcheryOwnerId", "invoiceNumber");

CREATE UNIQUE INDEX "HatcheryParentSale_hatcheryOwnerId_invoiceNumber_key"
  ON "HatcheryParentSale"("hatcheryOwnerId", "invoiceNumber");

CREATE UNIQUE INDEX "HatcheryChickSale_hatcheryOwnerId_invoiceNumber_key"
  ON "HatcheryChickSale"("hatcheryOwnerId", "invoiceNumber");

CREATE INDEX "HatcheryEggSale_hatcheryOwnerId_idx"
  ON "HatcheryEggSale"("hatcheryOwnerId");

CREATE INDEX "HatcheryParentSale_hatcheryOwnerId_idx"
  ON "HatcheryParentSale"("hatcheryOwnerId");

CREATE INDEX "HatcheryChickSale_hatcheryOwnerId_idx"
  ON "HatcheryChickSale"("hatcheryOwnerId");
