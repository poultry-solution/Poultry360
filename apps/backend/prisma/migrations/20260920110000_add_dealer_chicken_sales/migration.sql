ALTER TABLE "DealerSale"
ADD COLUMN "isChickenSale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sourceFarmerId" TEXT;

ALTER TABLE "DealerSale"
ADD CONSTRAINT "DealerSale_sourceFarmerId_fkey"
FOREIGN KEY ("sourceFarmerId") REFERENCES "Customer"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DealerSale_dealerId_isChickenSale_sourceFarmerId_idx"
ON "DealerSale"("dealerId", "isChickenSale", "sourceFarmerId");

CREATE INDEX "DealerSale_sourceFarmerId_idx"
ON "DealerSale"("sourceFarmerId");
