-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "currentStock" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."CompanySale" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(10,2),
    "isCredit" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "soldById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompanySaleItem" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompanySalePayment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "companySaleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompanyLedgerEntry" (
    "id" TEXT NOT NULL,
    "type" "public"."LedgerEntryType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "runningBalance" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "companyId" TEXT NOT NULL,
    "companySaleId" TEXT,
    "partyId" TEXT,
    "partyType" TEXT,
    "transactionId" TEXT,
    "transactionType" "public"."TransactionType",
    "entryType" "public"."LedgerEntryType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanySale_invoiceNumber_key" ON "public"."CompanySale"("invoiceNumber");

-- CreateIndex
CREATE INDEX "CompanySale_companyId_date_idx" ON "public"."CompanySale"("companyId", "date");

-- CreateIndex
CREATE INDEX "CompanySale_dealerId_date_idx" ON "public"."CompanySale"("dealerId", "date");

-- CreateIndex
CREATE INDEX "CompanySale_soldById_idx" ON "public"."CompanySale"("soldById");

-- CreateIndex
CREATE INDEX "CompanySale_invoiceNumber_idx" ON "public"."CompanySale"("invoiceNumber");

-- CreateIndex
CREATE INDEX "CompanySaleItem_saleId_idx" ON "public"."CompanySaleItem"("saleId");

-- CreateIndex
CREATE INDEX "CompanySaleItem_productId_idx" ON "public"."CompanySaleItem"("productId");

-- CreateIndex
CREATE INDEX "CompanySalePayment_companySaleId_paymentDate_idx" ON "public"."CompanySalePayment"("companySaleId", "paymentDate");

-- CreateIndex
CREATE INDEX "CompanyLedgerEntry_companyId_date_idx" ON "public"."CompanyLedgerEntry"("companyId", "date");

-- CreateIndex
CREATE INDEX "CompanyLedgerEntry_partyId_partyType_idx" ON "public"."CompanyLedgerEntry"("partyId", "partyType");

-- CreateIndex
CREATE INDEX "CompanyLedgerEntry_companySaleId_idx" ON "public"."CompanyLedgerEntry"("companySaleId");

-- CreateIndex
CREATE INDEX "CompanyLedgerEntry_transactionId_idx" ON "public"."CompanyLedgerEntry"("transactionId");

-- AddForeignKey
ALTER TABLE "public"."CompanySale" ADD CONSTRAINT "CompanySale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanySale" ADD CONSTRAINT "CompanySale_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanySale" ADD CONSTRAINT "CompanySale_soldById_fkey" FOREIGN KEY ("soldById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanySaleItem" ADD CONSTRAINT "CompanySaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."CompanySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanySaleItem" ADD CONSTRAINT "CompanySaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanySalePayment" ADD CONSTRAINT "CompanySalePayment_companySaleId_fkey" FOREIGN KEY ("companySaleId") REFERENCES "public"."CompanySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyLedgerEntry" ADD CONSTRAINT "CompanyLedgerEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyLedgerEntry" ADD CONSTRAINT "CompanyLedgerEntry_companySaleId_fkey" FOREIGN KEY ("companySaleId") REFERENCES "public"."CompanySale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
