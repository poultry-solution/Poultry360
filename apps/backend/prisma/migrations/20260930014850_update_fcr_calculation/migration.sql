/*
  Warnings:

  - A unique constraint covering the columns `[expenseId]` on the table `FeedConsumption` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Batch" ADD COLUMN     "closureAverageWeightKg" DECIMAL(6,3),
ADD COLUMN     "closureBirdCount" INTEGER,
ADD COLUMN     "closureWeightSampleCount" INTEGER,
ADD COLUMN     "initialChickWeightKg" DECIMAL(6,3);

-- AlterTable
ALTER TABLE "public"."FeedConsumption" ADD COLUMN     "expenseId" TEXT,
ADD COLUMN     "kgPerUnit" DECIMAL(10,4),
ADD COLUMN     "quantityKg" DECIMAL(12,3),
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "public"."InventoryItem" ADD COLUMN     "kgPerUnit" DECIMAL(10,4);

-- CreateIndex
CREATE UNIQUE INDEX "FeedConsumption_expenseId_key" ON "public"."FeedConsumption"("expenseId");

-- AddForeignKey
ALTER TABLE "public"."FeedConsumption" ADD CONSTRAINT "FeedConsumption_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
