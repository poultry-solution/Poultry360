-- AlterTable
ALTER TABLE "Vaccination" ADD COLUMN     "batchAge" INTEGER,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "standardScheduleId" TEXT;

-- CreateTable
CREATE TABLE "StandardVaccinationSchedule" (
    "id" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "dayFrom" INTEGER NOT NULL,
    "dayTo" INTEGER NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandardVaccinationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StandardVaccinationSchedule_dayFrom_dayTo_idx" ON "StandardVaccinationSchedule"("dayFrom", "dayTo");

-- CreateIndex
CREATE INDEX "StandardVaccinationSchedule_isActive_idx" ON "StandardVaccinationSchedule"("isActive");

-- CreateIndex
CREATE INDEX "Vaccination_standardScheduleId_idx" ON "Vaccination"("standardScheduleId");

-- CreateIndex
CREATE INDEX "Vaccination_batchId_batchAge_idx" ON "Vaccination"("batchId", "batchAge");

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_standardScheduleId_fkey" FOREIGN KEY ("standardScheduleId") REFERENCES "StandardVaccinationSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
