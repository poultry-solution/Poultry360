-- AlterTable: Add account-based totals to Customer
ALTER TABLE "public"."Customer" ADD COLUMN "totalSales" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "public"."Customer" ADD COLUMN "totalPayments" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Backfill: compute totalSales from existing DealerSale records
UPDATE "public"."Customer" c SET
  "totalSales" = COALESCE((
    SELECT SUM(ds."totalAmount") FROM "public"."DealerSale" ds WHERE ds."customerId" = c.id
  ), 0)
WHERE c."farmerId" IS NULL;

-- Backfill: compute totalPayments with opening balance awareness
-- balance = openingBalance + totalSales - totalPayments
-- therefore: totalPayments = openingBalance + totalSales - balance
-- Opening balance is the latest OPENING_BALANCE CustomerTransaction amount (0 if none)
UPDATE "public"."Customer" c SET
  "totalPayments" = GREATEST(
    COALESCE((
      SELECT ct.amount
      FROM "public"."CustomerTransaction" ct
      WHERE ct."customerId" = c.id AND ct."type" = 'OPENING_BALANCE'
      ORDER BY ct."date" DESC, ct."createdAt" DESC
      LIMIT 1
    ), 0) + c."totalSales" - c."balance",
    0
  )
WHERE c."farmerId" IS NULL;
