-- AlterTable
ALTER TABLE "public"."DealerCompany" ADD COLUMN     "archivedByCompany" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedByDealer" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."DealerFarmer" ADD COLUMN     "archivedByDealer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedByFarmer" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "DealerCompany_dealerId_archivedByDealer_idx" ON "public"."DealerCompany"("dealerId", "archivedByDealer");

-- CreateIndex
CREATE INDEX "DealerCompany_companyId_archivedByCompany_idx" ON "public"."DealerCompany"("companyId", "archivedByCompany");

-- CreateIndex
CREATE INDEX "DealerFarmer_dealerId_archivedByDealer_idx" ON "public"."DealerFarmer"("dealerId", "archivedByDealer");

-- CreateIndex
CREATE INDEX "DealerFarmer_farmerId_archivedByFarmer_idx" ON "public"."DealerFarmer"("farmerId", "archivedByFarmer");
