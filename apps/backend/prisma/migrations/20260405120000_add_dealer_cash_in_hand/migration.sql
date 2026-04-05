-- CreateEnum
CREATE TYPE "CashMovementDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "CashDayCloseSource" AS ENUM ('USER', 'SYSTEM');

-- CreateTable
CREATE TABLE "DealerCashSettings" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "initialOpening" DECIMAL(10,2) NOT NULL,
    "startBsDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerCashSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerCashMovement" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "bsDate" TEXT NOT NULL,
    "direction" "CashMovementDirection" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "partyName" TEXT NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerCashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerCashDayClose" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "bsDate" TEXT NOT NULL,
    "openingSnapshot" DECIMAL(10,2) NOT NULL,
    "closingSnapshot" DECIMAL(10,2) NOT NULL,
    "source" "CashDayCloseSource" NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerCashDayClose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealerCashSettings_dealerId_key" ON "DealerCashSettings"("dealerId");

-- CreateIndex
CREATE INDEX "DealerCashMovement_dealerId_bsDate_idx" ON "DealerCashMovement"("dealerId", "bsDate");

-- CreateIndex
CREATE UNIQUE INDEX "DealerCashDayClose_dealerId_bsDate_key" ON "DealerCashDayClose"("dealerId", "bsDate");

-- CreateIndex
CREATE INDEX "DealerCashDayClose_dealerId_bsDate_idx" ON "DealerCashDayClose"("dealerId", "bsDate");

-- AddForeignKey
ALTER TABLE "DealerCashSettings" ADD CONSTRAINT "DealerCashSettings_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerCashMovement" ADD CONSTRAINT "DealerCashMovement_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerCashMovement" ADD CONSTRAINT "DealerCashMovement_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerCashDayClose" ADD CONSTRAINT "DealerCashDayClose_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
