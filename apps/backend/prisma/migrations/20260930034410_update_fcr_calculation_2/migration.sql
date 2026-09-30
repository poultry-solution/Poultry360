-- CreateTable
CREATE TABLE "public"."BatchFcrHistory" (
    "id" TEXT NOT NULL,
    "calculationDate" TIMESTAMP(3) NOT NULL,
    "fcr" DECIMAL(12,6) NOT NULL,
    "basis" TEXT NOT NULL,
    "feedKg" DECIMAL(14,3) NOT NULL,
    "initialBiomassKg" DECIMAL(14,3) NOT NULL,
    "initialChickWeightKg" DECIMAL(8,3) NOT NULL,
    "soldBirds" INTEGER NOT NULL,
    "soldLiveWeightKg" DECIMAL(14,3) NOT NULL,
    "naturalDeaths" INTEGER NOT NULL,
    "closureDeaths" INTEGER NOT NULL DEFAULT 0,
    "remainingBirds" INTEGER NOT NULL,
    "remainingAverageWeightKg" DECIMAL(8,3),
    "remainingWeightSampleCount" INTEGER,
    "remainingLiveWeightKg" DECIMAL(14,3) NOT NULL,
    "producedLiveWeightKg" DECIMAL(14,3) NOT NULL,
    "weightGainKg" DECIMAL(14,3) NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchFcrHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BatchFcrHistory_batchId_calculationDate_idx" ON "public"."BatchFcrHistory"("batchId", "calculationDate");

-- CreateIndex
CREATE UNIQUE INDEX "BatchFcrHistory_batchId_calculationDate_key" ON "public"."BatchFcrHistory"("batchId", "calculationDate");

-- AddForeignKey
ALTER TABLE "public"."BatchFcrHistory" ADD CONSTRAINT "BatchFcrHistory_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
