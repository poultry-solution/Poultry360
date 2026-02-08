/*
  Warnings:

  - You are about to drop the column `discount` on the `CompanySale` table. All the data in the column will be lost.
  - You are about to drop the column `discount` on the `ConsignmentRequest` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."DiscountType" AS ENUM ('PERCENT', 'FLAT');

-- CreateEnum
CREATE TYPE "public"."DiscountScope" AS ENUM ('SALE', 'ITEM');

-- AlterTable
ALTER TABLE "public"."CompanySale" DROP COLUMN "discount",
ADD COLUMN     "subtotalAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."ConsignmentRequest" DROP COLUMN "discount";

-- AlterTable
ALTER TABLE "public"."DealerSale" ADD COLUMN     "subtotalAmount" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "public"."SaleDiscount" (
    "id" TEXT NOT NULL,
    "type" "public"."DiscountType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "scope" "public"."DiscountScope" NOT NULL DEFAULT 'SALE',
    "dealerSaleId" TEXT,
    "companySaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaleDiscount_dealerSaleId_key" ON "public"."SaleDiscount"("dealerSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleDiscount_companySaleId_key" ON "public"."SaleDiscount"("companySaleId");

-- CreateIndex
CREATE INDEX "SaleDiscount_dealerSaleId_idx" ON "public"."SaleDiscount"("dealerSaleId");

-- CreateIndex
CREATE INDEX "SaleDiscount_companySaleId_idx" ON "public"."SaleDiscount"("companySaleId");

-- AddForeignKey
ALTER TABLE "public"."SaleDiscount" ADD CONSTRAINT "SaleDiscount_dealerSaleId_fkey" FOREIGN KEY ("dealerSaleId") REFERENCES "public"."DealerSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleDiscount" ADD CONSTRAINT "SaleDiscount_companySaleId_fkey" FOREIGN KEY ("companySaleId") REFERENCES "public"."CompanySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
