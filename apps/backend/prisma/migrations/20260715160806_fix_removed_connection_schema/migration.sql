/*
  Warnings:

  - You are about to drop the column `consignmentId` on the `CompanySale` table. All the data in the column will be lost.
  - You are about to drop the column `consignmentId` on the `DealerLedgerEntry` table. All the data in the column will be lost.
  - The primary key for the `UserOnboardingPayment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `ConsignmentAuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConsignmentItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConsignmentRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DealerCompany` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DealerFarmer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DealerSalePaymentRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DealerVerificationRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FarmerVerificationRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentRequest` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `UserOnboardingPayment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."ConsignmentAuditLog" DROP CONSTRAINT "ConsignmentAuditLog_actorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsignmentAuditLog" DROP CONSTRAINT "ConsignmentAuditLog_consignmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsignmentItem" DROP CONSTRAINT "ConsignmentItem_companyProductId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsignmentItem" DROP CONSTRAINT "ConsignmentItem_consignmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsignmentItem" DROP CONSTRAINT "ConsignmentItem_dealerProductId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsignmentRequest" DROP CONSTRAINT "ConsignmentRequest_companySaleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsignmentRequest" DROP CONSTRAINT "ConsignmentRequest_dispatchedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsignmentRequest" DROP CONSTRAINT "ConsignmentRequest_fromCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsignmentRequest" DROP CONSTRAINT "ConsignmentRequest_fromDealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsignmentRequest" DROP CONSTRAINT "ConsignmentRequest_receivedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsignmentRequest" DROP CONSTRAINT "ConsignmentRequest_toDealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsignmentRequest" DROP CONSTRAINT "ConsignmentRequest_toFarmerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerCompany" DROP CONSTRAINT "DealerCompany_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerCompany" DROP CONSTRAINT "DealerCompany_dealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerFarmer" DROP CONSTRAINT "DealerFarmer_dealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerFarmer" DROP CONSTRAINT "DealerFarmer_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerLedgerEntry" DROP CONSTRAINT "DealerLedgerEntry_consignmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerSalePaymentRequest" DROP CONSTRAINT "DealerSalePaymentRequest_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerSalePaymentRequest" DROP CONSTRAINT "DealerSalePaymentRequest_dealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerSalePaymentRequest" DROP CONSTRAINT "DealerSalePaymentRequest_dealerSaleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerSalePaymentRequest" DROP CONSTRAINT "DealerSalePaymentRequest_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerVerificationRequest" DROP CONSTRAINT "DealerVerificationRequest_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerVerificationRequest" DROP CONSTRAINT "DealerVerificationRequest_dealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmerVerificationRequest" DROP CONSTRAINT "FarmerVerificationRequest_dealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FarmerVerificationRequest" DROP CONSTRAINT "FarmerVerificationRequest_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PaymentRequest" DROP CONSTRAINT "PaymentRequest_acceptedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."PaymentRequest" DROP CONSTRAINT "PaymentRequest_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PaymentRequest" DROP CONSTRAINT "PaymentRequest_companySaleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PaymentRequest" DROP CONSTRAINT "PaymentRequest_dealerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PaymentRequest" DROP CONSTRAINT "PaymentRequest_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."PaymentRequest" DROP CONSTRAINT "PaymentRequest_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."PaymentRequest" DROP CONSTRAINT "PaymentRequest_submittedById_fkey";

-- DropIndex
DROP INDEX "public"."CompanySale_consignmentId_idx";

-- DropIndex
DROP INDEX "public"."CompanySale_consignmentId_key";

-- DropIndex
DROP INDEX "public"."Customer_archivedAt_idx";

-- DropIndex
DROP INDEX "public"."DealerLedgerEntry_consignmentId_idx";

-- AlterTable
ALTER TABLE "public"."CompanySale" DROP COLUMN "consignmentId";

-- AlterTable
ALTER TABLE "public"."DealerLedgerEntry" DROP COLUMN "consignmentId";

-- AlterTable
ALTER TABLE "public"."UserOnboardingPayment" DROP CONSTRAINT "UserOnboardingPayment_pkey";

-- DropTable
DROP TABLE "public"."ConsignmentAuditLog";

-- DropTable
DROP TABLE "public"."ConsignmentItem";

-- DropTable
DROP TABLE "public"."ConsignmentRequest";

-- DropTable
DROP TABLE "public"."DealerCompany";

-- DropTable
DROP TABLE "public"."DealerFarmer";

-- DropTable
DROP TABLE "public"."DealerSalePaymentRequest";

-- DropTable
DROP TABLE "public"."DealerVerificationRequest";

-- DropTable
DROP TABLE "public"."FarmerVerificationRequest";

-- DropTable
DROP TABLE "public"."PaymentRequest";

-- DropEnum
DROP TYPE "public"."ConsignmentDirection";

-- DropEnum
DROP TYPE "public"."ConsignmentStatus";

-- DropEnum
DROP TYPE "public"."DealerSalePaymentRequestStatus";

-- DropEnum
DROP TYPE "public"."DealerVerificationStatus";

-- DropEnum
DROP TYPE "public"."PaymentRequestDirection";

-- DropEnum
DROP TYPE "public"."PaymentRequestStatus";

-- CreateIndex
CREATE UNIQUE INDEX "UserOnboardingPayment_userId_key" ON "public"."UserOnboardingPayment"("userId");

-- RenameIndex
ALTER INDEX "public"."DealerProduct_dealerId_name_costPrice_sellingPrice_manualCompan" RENAME TO "DealerProduct_dealerId_name_costPrice_sellingPrice_manualCo_key";

-- RenameIndex
ALTER INDEX "public"."HatcheryInventoryItem_hatcheryOwnerId_itemType_name_unitPrice_s" RENAME TO "HatcheryInventoryItem_hatcheryOwnerId_itemType_name_unitPri_key";
