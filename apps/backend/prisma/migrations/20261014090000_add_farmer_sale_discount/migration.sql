-- Bill discount (flat or percent) on farmer sales.
--
-- Adds nullable columns only. Existing sales get NULL (no discount), so no
-- amount, balance, due, paid or report changes. Sale.amount stays the final
-- amount the customer pays; subtotalAmount is the bill before the discount.

-- AlterTable
ALTER TABLE "public"."Sale" ADD COLUMN     "subtotalAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."SaleDiscount" ADD COLUMN     "saleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SaleDiscount_saleId_key" ON "public"."SaleDiscount"("saleId");

-- CreateIndex
CREATE INDEX "SaleDiscount_saleId_idx" ON "public"."SaleDiscount"("saleId");

-- AddForeignKey
ALTER TABLE "public"."SaleDiscount" ADD CONSTRAINT "SaleDiscount_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
