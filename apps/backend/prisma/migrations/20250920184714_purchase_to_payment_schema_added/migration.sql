-- AlterTable
ALTER TABLE "public"."EntityTransaction" ADD COLUMN     "paymentToPurchaseId" TEXT;

-- CreateIndex
CREATE INDEX "EntityTransaction_paymentToPurchaseId_date_idx" ON "public"."EntityTransaction"("paymentToPurchaseId", "date");

-- AddForeignKey
ALTER TABLE "public"."EntityTransaction" ADD CONSTRAINT "EntityTransaction_paymentToPurchaseId_fkey" FOREIGN KEY ("paymentToPurchaseId") REFERENCES "public"."EntityTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
