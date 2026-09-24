-- AlterTable
ALTER TABLE "public"."DealerManualCompany" ADD COLUMN     "totalSettlementSales" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."DealerSale" ADD COLUMN     "isSupplierSettlementSale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualCompanyId" TEXT;

-- CreateIndex
CREATE INDEX "DealerSale_dealerId_isSupplierSettlementSale_manualCompanyI_idx" ON "public"."DealerSale"("dealerId", "isSupplierSettlementSale", "manualCompanyId");

-- CreateIndex
CREATE INDEX "DealerSale_manualCompanyId_idx" ON "public"."DealerSale"("manualCompanyId");

-- AddForeignKey
ALTER TABLE "public"."DealerSale" ADD CONSTRAINT "DealerSale_manualCompanyId_fkey" FOREIGN KEY ("manualCompanyId") REFERENCES "public"."DealerManualCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
