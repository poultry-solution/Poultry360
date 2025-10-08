/*
  Warnings:

  - You are about to drop the column `message` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Notification` table. All the data in the column will be lost.
  - Added the required column `body` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CHAT_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE 'BATCH_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE 'FEED_WARNING';
ALTER TYPE "NotificationType" ADD VALUE 'SALES_NOTIFICATION';
ALTER TYPE "NotificationType" ADD VALUE 'FARM_ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'EXPENSE_WARNING';
ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM';
ALTER TYPE "NotificationType" ADD VALUE 'VACCINATION_ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'REMINDER_ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'REQUEST_ALERT';

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "message",
DROP COLUMN "status",
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificationSettings" JSONB,
ADD COLUMN     "pushSubscription" JSONB;
