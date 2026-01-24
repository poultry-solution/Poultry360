/*
  Warnings:

  - You are about to drop the column `dueAmount` on the `CompanySale` table. All the data in the column will be lost.
  - You are about to drop the column `paidAmount` on the `CompanySale` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."CompanySale" DROP COLUMN "dueAmount",
DROP COLUMN "paidAmount",
ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "invoiceImageUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."CompanyDealerAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalSales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPayments" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastSaleDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyDealerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompanyDealerPayment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "reference" TEXT,
    "receiptImageUrl" TEXT,
    "proofImageUrl" TEXT,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyDealerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyDealerAccount_companyId_idx" ON "public"."CompanyDealerAccount"("companyId");

-- CreateIndex
CREATE INDEX "CompanyDealerAccount_dealerId_idx" ON "public"."CompanyDealerAccount"("dealerId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyDealerAccount_companyId_dealerId_key" ON "public"."CompanyDealerAccount"("companyId", "dealerId");

-- CreateIndex
CREATE INDEX "CompanyDealerPayment_accountId_paymentDate_idx" ON "public"."CompanyDealerPayment"("accountId", "paymentDate");

-- CreateIndex
CREATE INDEX "CompanySale_accountId_idx" ON "public"."CompanySale"("accountId");

-- AddForeignKey
ALTER TABLE "public"."CompanySale" ADD CONSTRAINT "CompanySale_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."CompanyDealerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyDealerAccount" ADD CONSTRAINT "CompanyDealerAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyDealerAccount" ADD CONSTRAINT "CompanyDealerAccount_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyDealerPayment" ADD CONSTRAINT "CompanyDealerPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."CompanyDealerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyDealerPayment" ADD CONSTRAINT "CompanyDealerPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
