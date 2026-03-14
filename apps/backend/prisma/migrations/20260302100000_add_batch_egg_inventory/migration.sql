-- CreateTable
CREATE TABLE "BatchEggInventory" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "eggTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchEggInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BatchEggInventory_batchId_eggTypeId_key" ON "BatchEggInventory"("batchId", "eggTypeId");

-- CreateIndex
CREATE INDEX "BatchEggInventory_batchId_idx" ON "BatchEggInventory"("batchId");

-- CreateIndex
CREATE INDEX "BatchEggInventory_eggTypeId_idx" ON "BatchEggInventory"("eggTypeId");

-- AddForeignKey
ALTER TABLE "BatchEggInventory" ADD CONSTRAINT "BatchEggInventory_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchEggInventory" ADD CONSTRAINT "BatchEggInventory_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES "EggType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
