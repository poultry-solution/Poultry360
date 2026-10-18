-- AlterTable
ALTER TABLE "public"."InventoryTransaction" ADD COLUMN     "batchId" TEXT;

-- CreateIndex
CREATE INDEX "InventoryTransaction_batchId_idx" ON "public"."InventoryTransaction"("batchId");

-- AddForeignKey
ALTER TABLE "public"."InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
