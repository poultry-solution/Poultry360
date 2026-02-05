-- CreateEnum
CREATE TYPE "EggCategory" AS ENUM ('LARGE', 'MEDIUM', 'SMALL');

-- CreateTable
CREATE TABLE "EggProduction" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "largeCount" INTEGER NOT NULL DEFAULT 0,
    "mediumCount" INTEGER NOT NULL DEFAULT 0,
    "smallCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EggProduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EggInventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eggCategory" "EggCategory" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EggInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EggProduction_batchId_date_key" ON "EggProduction"("batchId", "date");

-- CreateIndex
CREATE INDEX "EggProduction_batchId_date_idx" ON "EggProduction"("batchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "EggInventory_userId_eggCategory_key" ON "EggInventory"("userId", "eggCategory");

-- CreateIndex
CREATE INDEX "EggInventory_userId_idx" ON "EggInventory"("userId");

-- AddForeignKey
ALTER TABLE "EggProduction" ADD CONSTRAINT "EggProduction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EggInventory" ADD CONSTRAINT "EggInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
