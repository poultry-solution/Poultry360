-- AlterTable
ALTER TABLE "public"."EntityTransaction" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "dealerId" TEXT,
ADD COLUMN     "hatcheryId" TEXT,
ADD COLUMN     "medicineSupplierId" TEXT,
ALTER COLUMN "entityType" DROP NOT NULL,
ALTER COLUMN "entityId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "EntityTransaction_dealerId_date_idx" ON "public"."EntityTransaction"("dealerId", "date");

-- CreateIndex
CREATE INDEX "EntityTransaction_hatcheryId_date_idx" ON "public"."EntityTransaction"("hatcheryId", "date");

-- CreateIndex
CREATE INDEX "EntityTransaction_medicineSupplierId_date_idx" ON "public"."EntityTransaction"("medicineSupplierId", "date");

-- CreateIndex
CREATE INDEX "EntityTransaction_customerId_date_idx" ON "public"."EntityTransaction"("customerId", "date");

-- AddForeignKey
ALTER TABLE "public"."EntityTransaction" ADD CONSTRAINT "EntityTransaction_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EntityTransaction" ADD CONSTRAINT "EntityTransaction_hatcheryId_fkey" FOREIGN KEY ("hatcheryId") REFERENCES "public"."Hatchery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EntityTransaction" ADD CONSTRAINT "EntityTransaction_medicineSupplierId_fkey" FOREIGN KEY ("medicineSupplierId") REFERENCES "public"."MedicineSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EntityTransaction" ADD CONSTRAINT "EntityTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
