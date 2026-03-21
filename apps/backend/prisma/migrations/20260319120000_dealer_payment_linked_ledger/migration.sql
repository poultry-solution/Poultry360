-- AlterTable
ALTER TABLE "DealerSalePayment" ADD COLUMN "linkedLedgerEntryId" TEXT;

-- AlterTable
ALTER TABLE "EntityTransaction" ADD COLUMN "sourceDealerLedgerEntryId" TEXT;

-- CreateIndex
CREATE INDEX "DealerSalePayment_linkedLedgerEntryId_idx" ON "DealerSalePayment"("linkedLedgerEntryId");

-- CreateIndex
CREATE INDEX "EntityTransaction_sourceDealerLedgerEntryId_idx" ON "EntityTransaction"("sourceDealerLedgerEntryId");

-- AddForeignKey
ALTER TABLE "DealerSalePayment" ADD CONSTRAINT "DealerSalePayment_linkedLedgerEntryId_fkey" FOREIGN KEY ("linkedLedgerEntryId") REFERENCES "DealerLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityTransaction" ADD CONSTRAINT "EntityTransaction_sourceDealerLedgerEntryId_fkey" FOREIGN KEY ("sourceDealerLedgerEntryId") REFERENCES "DealerLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
