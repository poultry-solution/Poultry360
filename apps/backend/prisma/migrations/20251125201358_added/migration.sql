-- CreateEnum
CREATE TYPE "public"."ConsignmentStatus" AS ENUM ('PENDING', 'APPROVED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'DISPATCHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ConsignmentDirection" AS ENUM ('COMPANY_TO_DEALER', 'DEALER_TO_COMPANY', 'DEALER_TO_FARMER');

-- CreateEnum
CREATE TYPE "public"."LedgerEntryType" AS ENUM ('SALE', 'PURCHASE', 'PAYMENT_RECEIVED', 'PAYMENT_MADE', 'RETURN', 'ADJUSTMENT', 'OPENING_BALANCE');

-- AlterEnum
ALTER TYPE "public"."TransactionType" ADD VALUE 'RETURN';

-- CreateTable
CREATE TABLE "public"."DealerProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."InventoryItemType" NOT NULL,
    "unit" TEXT NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "currentStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(10,2),
    "sku" TEXT,
    "dealerId" TEXT NOT NULL,
    "companyProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerProductTransaction" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "productId" TEXT NOT NULL,
    "dealerSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerProductTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerSale" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(10,2),
    "isCredit" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "customerId" TEXT,
    "farmerId" TEXT,
    "dealerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerSaleItem" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerSalePayment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "paymentMethod" TEXT,
    "saleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerSalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsignmentRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "direction" "public"."ConsignmentDirection" NOT NULL,
    "status" "public"."ConsignmentStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "fromCompanyId" TEXT,
    "fromDealerId" TEXT,
    "toDealerId" TEXT,
    "toFarmerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsignmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsignmentItem" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "acceptedQuantity" DECIMAL(10,2),
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "consignmentId" TEXT NOT NULL,
    "companyProductId" TEXT,
    "dealerProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsignmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerLedgerEntry" (
    "id" TEXT NOT NULL,
    "type" "public"."LedgerEntryType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "dealerId" TEXT NOT NULL,
    "saleId" TEXT,
    "consignmentId" TEXT,
    "partyId" TEXT,
    "partyType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealerProduct_dealerId_idx" ON "public"."DealerProduct"("dealerId");

-- CreateIndex
CREATE INDEX "DealerProduct_companyProductId_idx" ON "public"."DealerProduct"("companyProductId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerProduct_dealerId_name_key" ON "public"."DealerProduct"("dealerId", "name");

-- CreateIndex
CREATE INDEX "DealerProductTransaction_productId_date_idx" ON "public"."DealerProductTransaction"("productId", "date");

-- CreateIndex
CREATE INDEX "DealerProductTransaction_dealerSaleId_idx" ON "public"."DealerProductTransaction"("dealerSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerSale_invoiceNumber_key" ON "public"."DealerSale"("invoiceNumber");

-- CreateIndex
CREATE INDEX "DealerSale_dealerId_date_idx" ON "public"."DealerSale"("dealerId", "date");

-- CreateIndex
CREATE INDEX "DealerSale_customerId_idx" ON "public"."DealerSale"("customerId");

-- CreateIndex
CREATE INDEX "DealerSale_farmerId_idx" ON "public"."DealerSale"("farmerId");

-- CreateIndex
CREATE INDEX "DealerSale_invoiceNumber_idx" ON "public"."DealerSale"("invoiceNumber");

-- CreateIndex
CREATE INDEX "DealerSaleItem_saleId_idx" ON "public"."DealerSaleItem"("saleId");

-- CreateIndex
CREATE INDEX "DealerSaleItem_productId_idx" ON "public"."DealerSaleItem"("productId");

-- CreateIndex
CREATE INDEX "DealerSalePayment_saleId_date_idx" ON "public"."DealerSalePayment"("saleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentRequest_requestNumber_key" ON "public"."ConsignmentRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "ConsignmentRequest_fromCompanyId_status_idx" ON "public"."ConsignmentRequest"("fromCompanyId", "status");

-- CreateIndex
CREATE INDEX "ConsignmentRequest_fromDealerId_status_idx" ON "public"."ConsignmentRequest"("fromDealerId", "status");

-- CreateIndex
CREATE INDEX "ConsignmentRequest_toDealerId_status_idx" ON "public"."ConsignmentRequest"("toDealerId", "status");

-- CreateIndex
CREATE INDEX "ConsignmentRequest_toFarmerId_status_idx" ON "public"."ConsignmentRequest"("toFarmerId", "status");

-- CreateIndex
CREATE INDEX "ConsignmentRequest_requestNumber_idx" ON "public"."ConsignmentRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "ConsignmentItem_consignmentId_idx" ON "public"."ConsignmentItem"("consignmentId");

-- CreateIndex
CREATE INDEX "DealerLedgerEntry_dealerId_date_idx" ON "public"."DealerLedgerEntry"("dealerId", "date");

-- CreateIndex
CREATE INDEX "DealerLedgerEntry_partyId_partyType_idx" ON "public"."DealerLedgerEntry"("partyId", "partyType");

-- CreateIndex
CREATE INDEX "DealerLedgerEntry_saleId_idx" ON "public"."DealerLedgerEntry"("saleId");

-- CreateIndex
CREATE INDEX "DealerLedgerEntry_consignmentId_idx" ON "public"."DealerLedgerEntry"("consignmentId");

-- AddForeignKey
ALTER TABLE "public"."DealerProduct" ADD CONSTRAINT "DealerProduct_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerProduct" ADD CONSTRAINT "DealerProduct_companyProductId_fkey" FOREIGN KEY ("companyProductId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerProductTransaction" ADD CONSTRAINT "DealerProductTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."DealerProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerProductTransaction" ADD CONSTRAINT "DealerProductTransaction_dealerSaleId_fkey" FOREIGN KEY ("dealerSaleId") REFERENCES "public"."DealerSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSale" ADD CONSTRAINT "DealerSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSale" ADD CONSTRAINT "DealerSale_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSale" ADD CONSTRAINT "DealerSale_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleItem" ADD CONSTRAINT "DealerSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."DealerSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleItem" ADD CONSTRAINT "DealerSaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."DealerProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSalePayment" ADD CONSTRAINT "DealerSalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."DealerSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentRequest" ADD CONSTRAINT "ConsignmentRequest_fromCompanyId_fkey" FOREIGN KEY ("fromCompanyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentRequest" ADD CONSTRAINT "ConsignmentRequest_fromDealerId_fkey" FOREIGN KEY ("fromDealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentRequest" ADD CONSTRAINT "ConsignmentRequest_toDealerId_fkey" FOREIGN KEY ("toDealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentRequest" ADD CONSTRAINT "ConsignmentRequest_toFarmerId_fkey" FOREIGN KEY ("toFarmerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentItem" ADD CONSTRAINT "ConsignmentItem_consignmentId_fkey" FOREIGN KEY ("consignmentId") REFERENCES "public"."ConsignmentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentItem" ADD CONSTRAINT "ConsignmentItem_companyProductId_fkey" FOREIGN KEY ("companyProductId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentItem" ADD CONSTRAINT "ConsignmentItem_dealerProductId_fkey" FOREIGN KEY ("dealerProductId") REFERENCES "public"."DealerProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerLedgerEntry" ADD CONSTRAINT "DealerLedgerEntry_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerLedgerEntry" ADD CONSTRAINT "DealerLedgerEntry_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."DealerSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerLedgerEntry" ADD CONSTRAINT "DealerLedgerEntry_consignmentId_fkey" FOREIGN KEY ("consignmentId") REFERENCES "public"."ConsignmentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
