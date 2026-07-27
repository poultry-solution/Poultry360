-- Drop global uniqueness on dealer sale invoice numbers
DROP INDEX IF EXISTS "DealerSale_invoiceNumber_key";

-- Enforce uniqueness per dealer instead
CREATE UNIQUE INDEX "DealerSale_dealerId_invoiceNumber_key"
ON "public"."DealerSale"("dealerId", "invoiceNumber");
