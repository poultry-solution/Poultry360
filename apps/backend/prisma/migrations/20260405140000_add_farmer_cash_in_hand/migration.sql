-- CreateTable
CREATE TABLE "FarmerCashSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "initialOpening" DECIMAL(10,2) NOT NULL,
    "startBsDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerCashSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmerCashMovement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bsDate" TEXT NOT NULL,
    "direction" "CashMovementDirection" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "partyName" TEXT NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FarmerCashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmerCashDayClose" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bsDate" TEXT NOT NULL,
    "openingSnapshot" DECIMAL(10,2) NOT NULL,
    "closingSnapshot" DECIMAL(10,2) NOT NULL,
    "source" "CashDayCloseSource" NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerCashDayClose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FarmerCashSettings_userId_key" ON "FarmerCashSettings"("userId");

-- CreateIndex
CREATE INDEX "FarmerCashMovement_userId_bsDate_idx" ON "FarmerCashMovement"("userId", "bsDate");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerCashDayClose_userId_bsDate_key" ON "FarmerCashDayClose"("userId", "bsDate");

-- CreateIndex
CREATE INDEX "FarmerCashDayClose_userId_bsDate_idx" ON "FarmerCashDayClose"("userId", "bsDate");

-- AddForeignKey
ALTER TABLE "FarmerCashSettings" ADD CONSTRAINT "FarmerCashSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerCashMovement" ADD CONSTRAINT "FarmerCashMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerCashMovement" ADD CONSTRAINT "FarmerCashMovement_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerCashDayClose" ADD CONSTRAINT "FarmerCashDayClose_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
