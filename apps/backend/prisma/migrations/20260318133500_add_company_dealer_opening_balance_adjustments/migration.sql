-- CreateEnum
CREATE TYPE "CompanyDealerAccountAdjustmentType" AS ENUM ('OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "CompanyDealerAccountAdjustmentStatus" AS ENUM ('PENDING_ACK', 'ACKNOWLEDGED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "CompanyDealerAccountAdjustmentCreatedByRole" AS ENUM ('COMPANY', 'DEALER');

-- AlterTable
ALTER TABLE "CompanyDealerAccount"
ADD COLUMN     "openingBalanceCurrent" DECIMAL(10,2),
ADD COLUMN     "openingBalanceProposed" DECIMAL(10,2),
ADD COLUMN     "openingBalanceStatus" "CompanyDealerAccountAdjustmentStatus";

-- CreateTable
CREATE TABLE "CompanyDealerAccountAdjustment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "CompanyDealerAccountAdjustmentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdByRole" "CompanyDealerAccountAdjustmentCreatedByRole" NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "CompanyDealerAccountAdjustmentStatus" NOT NULL DEFAULT 'PENDING_ACK',
    "dealerResponseNote" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyDealerAccountAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyDealerAccountAdjustment_accountId_createdAt_idx" ON "CompanyDealerAccountAdjustment"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "CompanyDealerAccountAdjustment_accountId_status_idx" ON "CompanyDealerAccountAdjustment"("accountId", "status");

-- AddForeignKey
ALTER TABLE "CompanyDealerAccountAdjustment" ADD CONSTRAINT "CompanyDealerAccountAdjustment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CompanyDealerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

