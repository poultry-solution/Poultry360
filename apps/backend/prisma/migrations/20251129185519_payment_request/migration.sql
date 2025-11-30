-- CreateEnum
CREATE TYPE "public"."PaymentRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'PAYMENT_SUBMITTED', 'VERIFIED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PaymentRequestDirection" AS ENUM ('COMPANY_TO_DEALER', 'DEALER_TO_COMPANY');

-- CreateTable
CREATE TABLE "public"."PaymentRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "direction" "public"."PaymentRequestDirection" NOT NULL,
    "status" "public"."PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "paymentReceiptUrl" TEXT,
    "paymentDate" TIMESTAMP(3),
    "companySaleId" TEXT,
    "companyId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_requestNumber_key" ON "public"."PaymentRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "PaymentRequest_companyId_status_idx" ON "public"."PaymentRequest"("companyId", "status");

-- CreateIndex
CREATE INDEX "PaymentRequest_dealerId_status_idx" ON "public"."PaymentRequest"("dealerId", "status");

-- CreateIndex
CREATE INDEX "PaymentRequest_companySaleId_idx" ON "public"."PaymentRequest"("companySaleId");

-- CreateIndex
CREATE INDEX "PaymentRequest_requestedById_idx" ON "public"."PaymentRequest"("requestedById");

-- CreateIndex
CREATE INDEX "PaymentRequest_status_direction_idx" ON "public"."PaymentRequest"("status", "direction");

-- AddForeignKey
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_companySaleId_fkey" FOREIGN KEY ("companySaleId") REFERENCES "public"."CompanySale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
