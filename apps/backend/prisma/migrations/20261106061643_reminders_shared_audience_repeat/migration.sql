-- CreateEnum
CREATE TYPE "public"."ReminderModule" AS ENUM ('FARMER', 'HATCHERY');

-- CreateEnum
CREATE TYPE "public"."ReminderAudience" AS ENUM ('ONLY_ME', 'EVERYONE', 'SELECTED');

-- CreateEnum
CREATE TYPE "public"."ReminderRepeat" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'EVERY_N_DAYS');

-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "staffUserId" TEXT;

-- AlterTable
ALTER TABLE "public"."PushSubscription" ADD COLUMN     "staffUserId" TEXT;

-- AlterTable
ALTER TABLE "public"."Reminder" ADD COLUMN     "audience" "public"."ReminderAudience" NOT NULL DEFAULT 'ONLY_ME',
ADD COLUMN     "createdByStaffId" TEXT,
ADD COLUMN     "doneAt" TIMESTAMP(3),
ADD COLUMN     "doneByStaffId" TEXT,
ADD COLUMN     "hatcheryBatchId" TEXT,
ADD COLUMN     "hatcheryPartyId" TEXT,
ADD COLUMN     "incubationId" TEXT,
ADD COLUMN     "module" "public"."ReminderModule" NOT NULL DEFAULT 'FARMER',
ADD COLUMN     "notifiedAt" TIMESTAMP(3),
ADD COLUMN     "notifyOwner" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "repeat" "public"."ReminderRepeat" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "repeatEveryDays" INTEGER,
ADD COLUMN     "repeatUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."ReminderRecipient" (
    "reminderId" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,

    CONSTRAINT "ReminderRecipient_pkey" PRIMARY KEY ("reminderId","staffUserId")
);

-- CreateIndex
CREATE INDEX "ReminderRecipient_staffUserId_idx" ON "public"."ReminderRecipient"("staffUserId");

-- CreateIndex
CREATE INDEX "Notification_userId_staffUserId_status_createdAt_idx" ON "public"."Notification"("userId", "staffUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Reminder_userId_module_doneAt_reminderDate_idx" ON "public"."Reminder"("userId", "module", "doneAt", "reminderDate");

-- CreateIndex
CREATE INDEX "Reminder_notifiedAt_doneAt_reminderDate_idx" ON "public"."Reminder"("notifiedAt", "doneAt", "reminderDate");

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "public"."StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_doneByStaffId_fkey" FOREIGN KEY ("doneByStaffId") REFERENCES "public"."StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_hatcheryBatchId_fkey" FOREIGN KEY ("hatcheryBatchId") REFERENCES "public"."HatcheryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_incubationId_fkey" FOREIGN KEY ("incubationId") REFERENCES "public"."HatcheryIncubationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_hatcheryPartyId_fkey" FOREIGN KEY ("hatcheryPartyId") REFERENCES "public"."HatcheryParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReminderRecipient" ADD CONSTRAINT "ReminderRecipient_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "public"."Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReminderRecipient" ADD CONSTRAINT "ReminderRecipient_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "public"."StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PushSubscription" ADD CONSTRAINT "PushSubscription_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "public"."StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "public"."StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill old (farmer-only) reminders.
-- Before this change every device under the account got every reminder push,
-- so old reminders keep that reach as EVERYONE. Reminders already sent are
-- marked sent so the new job never sends them a second time.
UPDATE "public"."Reminder"
SET "module" = 'FARMER',
    "audience" = 'EVERYONE',
    "notifyOwner" = true;

UPDATE "public"."Reminder"
SET "notifiedAt" = "reminderDate"
WHERE "isNoticed" = true AND "notifiedAt" IS NULL;
