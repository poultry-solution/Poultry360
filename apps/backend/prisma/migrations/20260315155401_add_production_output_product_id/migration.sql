-- AlterTable
ALTER TABLE "public"."ProductionOutput" ADD COLUMN     "productId" TEXT;

-- CreateIndex
CREATE INDEX "ProductionOutput_productId_idx" ON "public"."ProductionOutput"("productId");

-- AddForeignKey
ALTER TABLE "public"."ProductionOutput" ADD CONSTRAINT "ProductionOutput_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
