/*
  Warnings:

  - A unique constraint covering the columns `[vaccinationId]` on the table `Reminder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reminderId]` on the table `Vaccination` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Vaccination` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "vaccinationId" TEXT;

-- AlterTable
ALTER TABLE "Vaccination" ADD COLUMN     "daysBetweenDoses" INTEGER,
ADD COLUMN     "doseNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "farmId" TEXT,
ADD COLUMN     "reminderCreated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderId" TEXT,
ADD COLUMN     "totalDoses" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "batchId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_vaccinationId_key" ON "Reminder"("vaccinationId");

-- CreateIndex
CREATE INDEX "Reminder_vaccinationId_idx" ON "Reminder"("vaccinationId");

-- CreateIndex
CREATE UNIQUE INDEX "Vaccination_reminderId_key" ON "Vaccination"("reminderId");

-- CreateIndex
CREATE INDEX "Vaccination_farmId_scheduledDate_idx" ON "Vaccination"("farmId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Vaccination_userId_scheduledDate_idx" ON "Vaccination"("userId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Vaccination_status_scheduledDate_idx" ON "Vaccination"("status", "scheduledDate");

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_vaccinationId_fkey" FOREIGN KEY ("vaccinationId") REFERENCES "Vaccination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
