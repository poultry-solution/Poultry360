/*
  Warnings:

  - You are about to drop the column `notificationEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `notificationSettings` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `pushSubscription` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `reminderCreated` on the `Vaccination` table. All the data in the column will be lost.
  - You are about to drop the column `reminderId` on the `Vaccination` table. All the data in the column will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Reminder` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."PurchaseCategory" AS ENUM ('FEED', 'MEDICINE', 'CHICKS', 'EQUIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."FarmerPurchaseRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_batchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_farmId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Reminder" DROP CONSTRAINT "Reminder_batchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Reminder" DROP CONSTRAINT "Reminder_farmId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Reminder" DROP CONSTRAINT "Reminder_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Reminder" DROP CONSTRAINT "Reminder_vaccinationId_fkey";

-- DropIndex
DROP INDEX "public"."Vaccination_reminderId_key";

-- AlterTable
ALTER TABLE "public"."CompanySaleItem" ADD COLUMN     "baseQuantity" DECIMAL(10,2),
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "public"."ConsignmentItem" ADD COLUMN     "baseQuantity" DECIMAL(10,2),
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "public"."Dealer" ADD COLUMN     "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "classification" TEXT NOT NULL DEFAULT 'SELF_CREATED',
ADD COLUMN     "totalPayments" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalPurchases" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."DealerProductTransaction" ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "public"."DealerSaleItem" ADD COLUMN     "baseQuantity" DECIMAL(10,2),
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "public"."DealerSaleRequestItem" ADD COLUMN     "baseQuantity" DECIMAL(10,2),
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "public"."EntityTransaction" ADD COLUMN     "purchaseCategory" "public"."PurchaseCategory",
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "unitPrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."InventoryTransaction" ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "notificationEnabled",
DROP COLUMN "notificationSettings",
DROP COLUMN "pushSubscription";

-- AlterTable
ALTER TABLE "public"."Vaccination" DROP COLUMN "reminderCreated",
DROP COLUMN "reminderId";

-- DropTable
DROP TABLE "public"."Notification";

-- DropTable
DROP TABLE "public"."Reminder";

-- DropEnum
DROP TYPE "public"."NotificationStatus";

-- DropEnum
DROP TYPE "public"."NotificationType";

-- DropEnum
DROP TYPE "public"."RecurrencePattern";

-- DropEnum
DROP TYPE "public"."ReminderStatus";

-- DropEnum
DROP TYPE "public"."ReminderType";

-- CreateTable
CREATE TABLE "public"."DealerManualCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "dealerId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPurchases" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPayments" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerManualCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerManualPurchase" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "reference" TEXT,
    "manualCompanyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerManualPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerManualPurchaseItem" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "type" "public"."InventoryItemType" NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "baseQuantity" DECIMAL(10,2),
    "costPrice" DECIMAL(10,2) NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "dealerProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerManualPurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerManualCompanyPayment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "reference" TEXT,
    "receiptUrl" TEXT,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "manualCompanyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerManualCompanyPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FarmerCart" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FarmerCartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FarmerPurchaseRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "status" "public"."FarmerPurchaseRequestStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "subtotalAmount" DECIMAL(10,2),
    "discountType" TEXT,
    "discountValue" DECIMAL(10,2),
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "farmerId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dealerSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerPurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FarmerPurchaseRequestItem" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "unit" TEXT,
    "baseQuantity" DECIMAL(10,2),
    "requestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerPurchaseRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductUnitConversion" (
    "id" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "conversionFactor" DECIMAL(10,4) NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductUnitConversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerProductUnitConversion" (
    "id" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "conversionFactor" DECIMAL(10,4) NOT NULL,
    "dealerProductId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerProductUnitConversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealerManualCompany_dealerId_idx" ON "public"."DealerManualCompany"("dealerId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerManualCompany_dealerId_name_key" ON "public"."DealerManualCompany"("dealerId", "name");

-- CreateIndex
CREATE INDEX "DealerManualPurchase_manualCompanyId_date_idx" ON "public"."DealerManualPurchase"("manualCompanyId", "date");

-- CreateIndex
CREATE INDEX "DealerManualPurchaseItem_purchaseId_idx" ON "public"."DealerManualPurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "DealerManualPurchaseItem_dealerProductId_idx" ON "public"."DealerManualPurchaseItem"("dealerProductId");

-- CreateIndex
CREATE INDEX "DealerManualCompanyPayment_manualCompanyId_paymentDate_idx" ON "public"."DealerManualCompanyPayment"("manualCompanyId", "paymentDate");

-- CreateIndex
CREATE INDEX "FarmerCart_farmerId_idx" ON "public"."FarmerCart"("farmerId");

-- CreateIndex
CREATE INDEX "FarmerCart_dealerId_idx" ON "public"."FarmerCart"("dealerId");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerCart_farmerId_dealerId_key" ON "public"."FarmerCart"("farmerId", "dealerId");

-- CreateIndex
CREATE INDEX "FarmerCartItem_cartId_idx" ON "public"."FarmerCartItem"("cartId");

-- CreateIndex
CREATE INDEX "FarmerCartItem_productId_idx" ON "public"."FarmerCartItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerCartItem_cartId_productId_key" ON "public"."FarmerCartItem"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerPurchaseRequest_requestNumber_key" ON "public"."FarmerPurchaseRequest"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerPurchaseRequest_dealerSaleId_key" ON "public"."FarmerPurchaseRequest"("dealerSaleId");

-- CreateIndex
CREATE INDEX "FarmerPurchaseRequest_farmerId_status_idx" ON "public"."FarmerPurchaseRequest"("farmerId", "status");

-- CreateIndex
CREATE INDEX "FarmerPurchaseRequest_dealerId_status_idx" ON "public"."FarmerPurchaseRequest"("dealerId", "status");

-- CreateIndex
CREATE INDEX "FarmerPurchaseRequest_customerId_idx" ON "public"."FarmerPurchaseRequest"("customerId");

-- CreateIndex
CREATE INDEX "FarmerPurchaseRequestItem_requestId_idx" ON "public"."FarmerPurchaseRequestItem"("requestId");

-- CreateIndex
CREATE INDEX "FarmerPurchaseRequestItem_productId_idx" ON "public"."FarmerPurchaseRequestItem"("productId");

-- CreateIndex
CREATE INDEX "ProductUnitConversion_productId_idx" ON "public"."ProductUnitConversion"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductUnitConversion_productId_unitName_key" ON "public"."ProductUnitConversion"("productId", "unitName");

-- CreateIndex
CREATE INDEX "DealerProductUnitConversion_dealerProductId_idx" ON "public"."DealerProductUnitConversion"("dealerProductId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerProductUnitConversion_dealerProductId_unitName_key" ON "public"."DealerProductUnitConversion"("dealerProductId", "unitName");

-- AddForeignKey
ALTER TABLE "public"."DealerManualCompany" ADD CONSTRAINT "DealerManualCompany_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerManualPurchase" ADD CONSTRAINT "DealerManualPurchase_manualCompanyId_fkey" FOREIGN KEY ("manualCompanyId") REFERENCES "public"."DealerManualCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerManualPurchaseItem" ADD CONSTRAINT "DealerManualPurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "public"."DealerManualPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerManualPurchaseItem" ADD CONSTRAINT "DealerManualPurchaseItem_dealerProductId_fkey" FOREIGN KEY ("dealerProductId") REFERENCES "public"."DealerProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerManualCompanyPayment" ADD CONSTRAINT "DealerManualCompanyPayment_manualCompanyId_fkey" FOREIGN KEY ("manualCompanyId") REFERENCES "public"."DealerManualCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerCart" ADD CONSTRAINT "FarmerCart_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerCart" ADD CONSTRAINT "FarmerCart_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerCartItem" ADD CONSTRAINT "FarmerCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."FarmerCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerCartItem" ADD CONSTRAINT "FarmerCartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."DealerProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerPurchaseRequest" ADD CONSTRAINT "FarmerPurchaseRequest_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerPurchaseRequest" ADD CONSTRAINT "FarmerPurchaseRequest_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerPurchaseRequest" ADD CONSTRAINT "FarmerPurchaseRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerPurchaseRequest" ADD CONSTRAINT "FarmerPurchaseRequest_dealerSaleId_fkey" FOREIGN KEY ("dealerSaleId") REFERENCES "public"."DealerSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerPurchaseRequestItem" ADD CONSTRAINT "FarmerPurchaseRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."FarmerPurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerPurchaseRequestItem" ADD CONSTRAINT "FarmerPurchaseRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."DealerProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductUnitConversion" ADD CONSTRAINT "ProductUnitConversion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerProductUnitConversion" ADD CONSTRAINT "DealerProductUnitConversion_dealerProductId_fkey" FOREIGN KEY ("dealerProductId") REFERENCES "public"."DealerProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
