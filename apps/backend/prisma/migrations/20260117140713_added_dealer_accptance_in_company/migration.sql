-- CreateEnum
CREATE TYPE "public"."DealerVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."DealerVerificationRequest" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "public"."DealerVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "lastRejectedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerVerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealerVerificationRequest_dealerId_idx" ON "public"."DealerVerificationRequest"("dealerId");

-- CreateIndex
CREATE INDEX "DealerVerificationRequest_companyId_idx" ON "public"."DealerVerificationRequest"("companyId");

-- CreateIndex
CREATE INDEX "DealerVerificationRequest_companyId_status_idx" ON "public"."DealerVerificationRequest"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DealerVerificationRequest_dealerId_companyId_status_key" ON "public"."DealerVerificationRequest"("dealerId", "companyId", "status");

-- AddForeignKey
ALTER TABLE "public"."DealerVerificationRequest" ADD CONSTRAINT "DealerVerificationRequest_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerVerificationRequest" ADD CONSTRAINT "DealerVerificationRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
