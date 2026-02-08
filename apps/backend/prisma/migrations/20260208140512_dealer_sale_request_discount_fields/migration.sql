-- AlterTable
ALTER TABLE "public"."DealerSaleRequest" ADD COLUMN     "discountType" TEXT,
ADD COLUMN     "discountValue" DECIMAL(10,2),
ADD COLUMN     "subtotalAmount" DECIMAL(10,2);
