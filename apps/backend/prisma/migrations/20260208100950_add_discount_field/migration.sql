/*
  Warnings:

  - A unique constraint covering the columns `[dealerId,name,costPrice,sellingPrice]` on the table `DealerProduct` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."DealerProduct_dealerId_name_key";

-- AlterTable
ALTER TABLE "public"."CompanySale" ADD COLUMN     "discount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."ConsignmentRequest" ADD COLUMN     "discount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "DealerProduct_dealerId_name_costPrice_sellingPrice_key" ON "public"."DealerProduct"("dealerId", "name", "costPrice", "sellingPrice");
