-- CreateEnum
CREATE TYPE "public"."UserOnboardingPaymentState" AS ENUM ('PENDING_PAYMENT', 'PENDING_REVIEW', 'PAYMENT_REJECTED', 'PAYMENT_APPROVED');

-- CreateEnum
CREATE TYPE "public"."UserPaymentSubmissionStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."UserOnboardingPayment" (
    "userId" TEXT NOT NULL,
    "state" "public"."UserOnboardingPaymentState" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "lockedUntilApproved" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOnboardingPayment_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "UserOnboardingPayment_state_idx" ON "public"."UserOnboardingPayment"("state");

-- AddForeignKey
ALTER TABLE "public"."UserOnboardingPayment" ADD CONSTRAINT "UserOnboardingPayment_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "public"."UserPaymentSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountNpr" DECIMAL(10,2) NOT NULL,
    "roleAtSubmission" "public"."UserRole" NOT NULL,
    "receiptUrl" TEXT NOT NULL,
    "notes" TEXT,
    "status" "public"."UserPaymentSubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "reviewRejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPaymentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserPaymentSubmission_userId_status_createdAt_idx" ON "public"."UserPaymentSubmission"("userId", "status", "createdAt");
-- CreateIndex
CREATE INDEX "UserPaymentSubmission_status_createdAt_idx" ON "public"."UserPaymentSubmission"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."UserPaymentSubmission" ADD CONSTRAINT "UserPaymentSubmission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

