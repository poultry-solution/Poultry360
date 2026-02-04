-- AlterTable
ALTER TABLE "public"."DealerSale" ADD COLUMN     "accountId" TEXT;

-- CreateTable
CREATE TABLE "public"."DealerFarmerAccount" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalSales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPayments" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastSaleDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "balanceLimit" DECIMAL(10,2),
    "balanceLimitSetAt" TIMESTAMP(3),
    "balanceLimitSetBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerFarmerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerFarmerPayment" (
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

    CONSTRAINT "DealerFarmerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealerFarmerAccount_dealerId_idx" ON "public"."DealerFarmerAccount"("dealerId");

-- CreateIndex
CREATE INDEX "DealerFarmerAccount_farmerId_idx" ON "public"."DealerFarmerAccount"("farmerId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerFarmerAccount_dealerId_farmerId_key" ON "public"."DealerFarmerAccount"("dealerId", "farmerId");

-- CreateIndex
CREATE INDEX "DealerFarmerPayment_accountId_paymentDate_idx" ON "public"."DealerFarmerPayment"("accountId", "paymentDate");

-- CreateIndex
CREATE INDEX "DealerSale_accountId_idx" ON "public"."DealerSale"("accountId");

-- AddForeignKey
ALTER TABLE "public"."DealerFarmerAccount" ADD CONSTRAINT "DealerFarmerAccount_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerFarmerAccount" ADD CONSTRAINT "DealerFarmerAccount_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerFarmerAccount" ADD CONSTRAINT "DealerFarmerAccount_balanceLimitSetBy_fkey" FOREIGN KEY ("balanceLimitSetBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerFarmerPayment" ADD CONSTRAINT "DealerFarmerPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."DealerFarmerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerFarmerPayment" ADD CONSTRAINT "DealerFarmerPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSale" ADD CONSTRAINT "DealerSale_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."DealerFarmerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
