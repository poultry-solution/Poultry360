-- CreateEnum
CREATE TYPE "public"."ReminderType" AS ENUM ('VACCINATION', 'FEEDING', 'MEDICATION', 'CLEANING', 'WEIGHING', 'SUPPLIER_PAYMENT', 'CUSTOMER_PAYMENT', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."ReminderStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."RecurrencePattern" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'FEED_REMINDER';
ALTER TYPE "public"."NotificationType" ADD VALUE 'MEDICATION_REMINDER';
ALTER TYPE "public"."NotificationType" ADD VALUE 'CLEANING_REMINDER';
ALTER TYPE "public"."NotificationType" ADD VALUE 'WEIGHING_REMINDER';
ALTER TYPE "public"."NotificationType" ADD VALUE 'SUPPLIER_PAYMENT_REMINDER';
ALTER TYPE "public"."NotificationType" ADD VALUE 'CUSTOMER_PAYMENT_REMINDER';
ALTER TYPE "public"."NotificationType" ADD VALUE 'GENERAL_REMINDER';

-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "farmId" TEXT;

-- CreateTable
CREATE TABLE "public"."Reminder" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."ReminderType" NOT NULL,
    "status" "public"."ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" "public"."RecurrencePattern" NOT NULL DEFAULT 'NONE',
    "recurrenceInterval" INTEGER,
    "lastTriggered" TIMESTAMP(3),
    "farmId" TEXT,
    "batchId" TEXT,
    "data" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reminder_userId_dueDate_idx" ON "public"."Reminder"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "Reminder_userId_status_idx" ON "public"."Reminder"("userId", "status");

-- CreateIndex
CREATE INDEX "Reminder_farmId_dueDate_idx" ON "public"."Reminder"("farmId", "dueDate");

-- CreateIndex
CREATE INDEX "Reminder_batchId_dueDate_idx" ON "public"."Reminder"("batchId", "dueDate");

-- CreateIndex
CREATE INDEX "Reminder_type_dueDate_idx" ON "public"."Reminder"("type", "dueDate");

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
