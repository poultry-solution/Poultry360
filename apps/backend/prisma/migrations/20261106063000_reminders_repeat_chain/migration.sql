-- AlterTable
ALTER TABLE "public"."Reminder" ADD COLUMN     "repeatedFromId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_repeatedFromId_key" ON "public"."Reminder"("repeatedFromId");

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_repeatedFromId_fkey" FOREIGN KEY ("repeatedFromId") REFERENCES "public"."Reminder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

