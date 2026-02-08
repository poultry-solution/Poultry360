-- AlterTable
ALTER TABLE "public"."ConsignmentRequest" ADD COLUMN     "discountType" TEXT,
ADD COLUMN     "discountValue" DECIMAL(10,2),
ADD COLUMN     "subtotalAmount" DECIMAL(10,2);
