-- CreateEnum
CREATE TYPE "public"."DealerSaleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."DealerSaleRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "status" "public"."DealerSaleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "dealerId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dealerSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerSaleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerSaleRequestItem" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "requestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerSaleRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealerSaleRequest_requestNumber_key" ON "public"."DealerSaleRequest"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DealerSaleRequest_dealerSaleId_key" ON "public"."DealerSaleRequest"("dealerSaleId");

-- CreateIndex
CREATE INDEX "DealerSaleRequest_dealerId_status_idx" ON "public"."DealerSaleRequest"("dealerId", "status");

-- CreateIndex
CREATE INDEX "DealerSaleRequest_farmerId_status_idx" ON "public"."DealerSaleRequest"("farmerId", "status");

-- CreateIndex
CREATE INDEX "DealerSaleRequest_customerId_idx" ON "public"."DealerSaleRequest"("customerId");

-- CreateIndex
CREATE INDEX "DealerSaleRequestItem_requestId_idx" ON "public"."DealerSaleRequestItem"("requestId");

-- CreateIndex
CREATE INDEX "DealerSaleRequestItem_productId_idx" ON "public"."DealerSaleRequestItem"("productId");

-- AddForeignKey
ALTER TABLE "public"."DealerSaleRequest" ADD CONSTRAINT "DealerSaleRequest_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleRequest" ADD CONSTRAINT "DealerSaleRequest_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleRequest" ADD CONSTRAINT "DealerSaleRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleRequest" ADD CONSTRAINT "DealerSaleRequest_dealerSaleId_fkey" FOREIGN KEY ("dealerSaleId") REFERENCES "public"."DealerSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleRequestItem" ADD CONSTRAINT "DealerSaleRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."DealerSaleRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleRequestItem" ADD CONSTRAINT "DealerSaleRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."DealerProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
