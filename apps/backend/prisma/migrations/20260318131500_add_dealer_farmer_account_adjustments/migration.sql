-- CreateEnum
CREATE TYPE "DealerFarmerAccountAdjustmentType" AS ENUM ('OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "DealerFarmerAccountAdjustmentStatus" AS ENUM ('PENDING_ACK', 'ACKNOWLEDGED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "DealerFarmerAccountAdjustmentCreatedByRole" AS ENUM ('DEALER', 'FARMER');

-- AlterTable
ALTER TABLE "DealerFarmerAccount"
ADD COLUMN     "openingBalanceCurrent" DECIMAL(10,2),
ADD COLUMN     "openingBalanceStatus" "DealerFarmerAccountAdjustmentStatus";

-- CreateTable
CREATE TABLE "DealerFarmerAccountAdjustment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "DealerFarmerAccountAdjustmentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdByRole" "DealerFarmerAccountAdjustmentCreatedByRole" NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "DealerFarmerAccountAdjustmentStatus" NOT NULL DEFAULT 'PENDING_ACK',
    "farmerResponseNote" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerFarmerAccountAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealerFarmerAccountAdjustment_accountId_createdAt_idx" ON "DealerFarmerAccountAdjustment"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "DealerFarmerAccountAdjustment_accountId_status_idx" ON "DealerFarmerAccountAdjustment"("accountId", "status");

-- AddForeignKey
ALTER TABLE "DealerFarmerAccountAdjustment" ADD CONSTRAINT "DealerFarmerAccountAdjustment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "DealerFarmerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

