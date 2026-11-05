-- CreateTable
CREATE TABLE "public"."DealerBroilerPurchase" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "sourceFarmerId" TEXT NOT NULL,
    "weightKg" DECIMAL(10,2) NOT NULL,
    "broilerCount" INTEGER,
    "ratePerKg" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerBroilerPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealerBroilerPurchase_dealerId_sourceFarmerId_date_idx" ON "public"."DealerBroilerPurchase"("dealerId", "sourceFarmerId", "date");

-- CreateIndex
CREATE INDEX "DealerBroilerPurchase_dealerId_date_idx" ON "public"."DealerBroilerPurchase"("dealerId", "date");

-- AddForeignKey
ALTER TABLE "public"."DealerBroilerPurchase" ADD CONSTRAINT "DealerBroilerPurchase_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerBroilerPurchase" ADD CONSTRAINT "DealerBroilerPurchase_sourceFarmerId_fkey" FOREIGN KEY ("sourceFarmerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
