-- CreateTable
CREATE TABLE "public"."DealerFarmer" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectedVia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerFarmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FarmerVerificationRequest" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "status" "public"."DealerVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "lastRejectedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerVerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealerFarmer_dealerId_idx" ON "public"."DealerFarmer"("dealerId");

-- CreateIndex
CREATE INDEX "DealerFarmer_farmerId_idx" ON "public"."DealerFarmer"("farmerId");

-- CreateIndex
CREATE INDEX "DealerFarmer_farmerId_dealerId_idx" ON "public"."DealerFarmer"("farmerId", "dealerId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerFarmer_dealerId_farmerId_key" ON "public"."DealerFarmer"("dealerId", "farmerId");

-- CreateIndex
CREATE INDEX "FarmerVerificationRequest_farmerId_idx" ON "public"."FarmerVerificationRequest"("farmerId");

-- CreateIndex
CREATE INDEX "FarmerVerificationRequest_dealerId_idx" ON "public"."FarmerVerificationRequest"("dealerId");

-- CreateIndex
CREATE INDEX "FarmerVerificationRequest_dealerId_status_idx" ON "public"."FarmerVerificationRequest"("dealerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerVerificationRequest_farmerId_dealerId_status_key" ON "public"."FarmerVerificationRequest"("farmerId", "dealerId", "status");

-- AddForeignKey
ALTER TABLE "public"."DealerFarmer" ADD CONSTRAINT "DealerFarmer_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerFarmer" ADD CONSTRAINT "DealerFarmer_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerVerificationRequest" ADD CONSTRAINT "FarmerVerificationRequest_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerVerificationRequest" ADD CONSTRAINT "FarmerVerificationRequest_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
