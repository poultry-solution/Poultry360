-- CreateEnum
CREATE TYPE "public"."DealerSalePaymentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."DealerSalePaymentRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "status" "public"."DealerSalePaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "proofOfPaymentUrl" TEXT,
    "paymentDate" TIMESTAMP(3),
    "dealerSaleId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerSalePaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealerSalePaymentRequest_requestNumber_key" ON "public"."DealerSalePaymentRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "DealerSalePaymentRequest_dealerSaleId_status_idx" ON "public"."DealerSalePaymentRequest"("dealerSaleId", "status");

-- CreateIndex
CREATE INDEX "DealerSalePaymentRequest_dealerId_status_idx" ON "public"."DealerSalePaymentRequest"("dealerId", "status");

-- CreateIndex
CREATE INDEX "DealerSalePaymentRequest_farmerId_status_idx" ON "public"."DealerSalePaymentRequest"("farmerId", "status");

-- AddForeignKey
ALTER TABLE "public"."DealerSalePaymentRequest" ADD CONSTRAINT "DealerSalePaymentRequest_dealerSaleId_fkey" FOREIGN KEY ("dealerSaleId") REFERENCES "public"."DealerSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSalePaymentRequest" ADD CONSTRAINT "DealerSalePaymentRequest_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSalePaymentRequest" ADD CONSTRAINT "DealerSalePaymentRequest_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSalePaymentRequest" ADD CONSTRAINT "DealerSalePaymentRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
