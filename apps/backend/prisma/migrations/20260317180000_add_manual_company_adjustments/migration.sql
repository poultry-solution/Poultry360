-- CreateEnum
CREATE TYPE "public"."DealerManualCompanyAdjustmentType" AS ENUM ('OPENING_BALANCE', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "public"."DealerManualCompanyAdjustment" (
    "id" TEXT NOT NULL,
    "type" "public"."DealerManualCompanyAdjustmentType" NOT NULL DEFAULT 'ADJUSTMENT',
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "manualCompanyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerManualCompanyAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealerManualCompanyAdjustment_manualCompanyId_date_idx" ON "public"."DealerManualCompanyAdjustment"("manualCompanyId", "date");

-- CreateIndex
CREATE INDEX "DealerManualCompanyAdjustment_manualCompanyId_type_idx" ON "public"."DealerManualCompanyAdjustment"("manualCompanyId", "type");

-- AddForeignKey
ALTER TABLE "public"."DealerManualCompanyAdjustment"
ADD CONSTRAINT "DealerManualCompanyAdjustment_manualCompanyId_fkey"
FOREIGN KEY ("manualCompanyId") REFERENCES "public"."DealerManualCompany"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

