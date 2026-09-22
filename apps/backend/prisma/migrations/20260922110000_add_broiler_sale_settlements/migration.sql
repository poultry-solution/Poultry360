ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'BROILER_SALE_PROCEEDS';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'BROILER_SALE_MARGIN';

CREATE TABLE "BroilerSaleSettlement" (
    "id" TEXT NOT NULL,
    "totalProceeds" DECIMAL(10,2) NOT NULL,
    "marginAmount" DECIMAL(10,2) NOT NULL,
    "creditRecovered" DECIMAL(10,2) NOT NULL,
    "farmerPayout" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "reference" TEXT,
    "receiptUrl" TEXT,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "dealerId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,

    CONSTRAINT "BroilerSaleSettlement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DealerSale" ADD COLUMN "settlementId" TEXT;

ALTER TABLE "BroilerSaleSettlement"
ADD CONSTRAINT "BroilerSaleSettlement_dealerId_fkey"
FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BroilerSaleSettlement"
ADD CONSTRAINT "BroilerSaleSettlement_farmerId_fkey"
FOREIGN KEY ("farmerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DealerSale"
ADD CONSTRAINT "DealerSale_settlementId_fkey"
FOREIGN KEY ("settlementId") REFERENCES "BroilerSaleSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "BroilerSaleSettlement_dealerId_farmerId_date_idx"
ON "BroilerSaleSettlement"("dealerId", "farmerId", "date");

CREATE INDEX "BroilerSaleSettlement_farmerId_idx"
ON "BroilerSaleSettlement"("farmerId");

CREATE INDEX "DealerSale_settlementId_idx" ON "DealerSale"("settlementId");
