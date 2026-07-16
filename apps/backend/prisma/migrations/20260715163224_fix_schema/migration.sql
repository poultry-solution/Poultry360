/*
  Warnings:

  - You are about to drop the `DealerSaleRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DealerSaleRequestItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FarmerCart` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FarmerCartItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FarmerPurchaseRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FarmerPurchaseRequestItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."DealerSaleRequest" DROP CONSTRAINT "DealerSaleRequest_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerSaleRequest" DROP CONSTRAINT "DealerSaleRequest_dealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerSaleRequest" DROP CONSTRAINT "DealerSaleRequest_dealerSaleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerSaleRequest" DROP CONSTRAINT "DealerSaleRequest_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerSaleRequestItem" DROP CONSTRAINT "DealerSaleRequestItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerSaleRequestItem" DROP CONSTRAINT "DealerSaleRequestItem_requestId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmerCart" DROP CONSTRAINT "FarmerCart_dealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmerCart" DROP CONSTRAINT "FarmerCart_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmerCartItem" DROP CONSTRAINT "FarmerCartItem_cartId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmerCartItem" DROP CONSTRAINT "FarmerCartItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmerPurchaseRequest" DROP CONSTRAINT "FarmerPurchaseRequest_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmerPurchaseRequest" DROP CONSTRAINT "FarmerPurchaseRequest_dealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmerPurchaseRequest" DROP CONSTRAINT "FarmerPurchaseRequest_dealerSaleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmerPurchaseRequest" DROP CONSTRAINT "FarmerPurchaseRequest_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmerPurchaseRequestItem" DROP CONSTRAINT "FarmerPurchaseRequestItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmerPurchaseRequestItem" DROP CONSTRAINT "FarmerPurchaseRequestItem_requestId_fkey";

-- DropTable
DROP TABLE "public"."DealerSaleRequest";

-- DropTable
DROP TABLE "public"."DealerSaleRequestItem";

-- DropTable
DROP TABLE "public"."FarmerCart";

-- DropTable
DROP TABLE "public"."FarmerCartItem";

-- DropTable
DROP TABLE "public"."FarmerPurchaseRequest";

-- DropTable
DROP TABLE "public"."FarmerPurchaseRequestItem";

-- DropEnum
DROP TYPE "public"."DealerSaleRequestStatus";

-- DropEnum
DROP TYPE "public"."FarmerPurchaseRequestStatus";
