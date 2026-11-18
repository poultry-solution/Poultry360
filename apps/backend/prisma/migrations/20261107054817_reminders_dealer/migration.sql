-- AlterEnum
ALTER TYPE "public"."ReminderModule" ADD VALUE 'DEALER';

-- AlterTable
ALTER TABLE "public"."Reminder" ADD COLUMN     "amount" DECIMAL(12,2),
ADD COLUMN     "dealerCustomerId" TEXT,
ADD COLUMN     "dealerManualCompanyId" TEXT;

-- CreateIndex
CREATE INDEX "Reminder_dealerCustomerId_idx" ON "public"."Reminder"("dealerCustomerId");

-- CreateIndex
CREATE INDEX "Reminder_dealerManualCompanyId_idx" ON "public"."Reminder"("dealerManualCompanyId");

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_dealerCustomerId_fkey" FOREIGN KEY ("dealerCustomerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_dealerManualCompanyId_fkey" FOREIGN KEY ("dealerManualCompanyId") REFERENCES "public"."DealerManualCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

