/*
  Warnings:

  - A unique constraint covering the columns `[mortalityId]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Mortality" ADD COLUMN     "saleId" TEXT;

-- AlterTable
ALTER TABLE "public"."Sale" ADD COLUMN     "mortalityId" TEXT;

-- CreateIndex
CREATE INDEX "Mortality_saleId_date_idx" ON "public"."Mortality"("saleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_mortalityId_key" ON "public"."Sale"("mortalityId");

-- CreateIndex
CREATE INDEX "Sale_mortalityId_idx" ON "public"."Sale"("mortalityId");

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_mortalityId_fkey" FOREIGN KEY ("mortalityId") REFERENCES "public"."Mortality"("id") ON DELETE CASCADE ON UPDATE CASCADE;
