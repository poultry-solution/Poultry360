-- AlterTable
ALTER TABLE "DealerProduct"
ADD COLUMN     "manualCompanyId" TEXT,
ADD COLUMN     "supplierCompanyId" TEXT;

-- DropIndex
DROP INDEX "DealerProduct_dealerId_name_costPrice_sellingPrice_key";

-- CreateIndex
CREATE UNIQUE INDEX "DealerProduct_dealerId_name_costPrice_sellingPrice_manualCompanyId_supplierCompanyId_key"
ON "DealerProduct"("dealerId","name","costPrice","sellingPrice","manualCompanyId","supplierCompanyId");

-- CreateIndex
CREATE INDEX "DealerProduct_manualCompanyId_idx" ON "DealerProduct"("manualCompanyId");

-- CreateIndex
CREATE INDEX "DealerProduct_supplierCompanyId_idx" ON "DealerProduct"("supplierCompanyId");

-- AddForeignKey
ALTER TABLE "DealerProduct" ADD CONSTRAINT "DealerProduct_manualCompanyId_fkey" FOREIGN KEY ("manualCompanyId") REFERENCES "DealerManualCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerProduct" ADD CONSTRAINT "DealerProduct_supplierCompanyId_fkey" FOREIGN KEY ("supplierCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

