-- Daily wage staff and attendance.
--
-- Every existing staff member becomes MONTHLY, which is how they were already
-- paid, so no balance changes. StaffSalary.monthlyAmount is not renamed: the
-- Prisma field is now `rate` (mapped to this column) and holds a daily rate for
-- DAILY staff. Attendance stores only ABSENT and HALF_DAY days.

-- CreateEnum
CREATE TYPE "public"."StaffPayType" AS ENUM ('MONTHLY', 'DAILY');

-- CreateEnum
CREATE TYPE "public"."StaffAttendanceStatus" AS ENUM ('ABSENT', 'HALF_DAY');

-- AlterTable
ALTER TABLE "public"."Staff" ADD COLUMN     "payType" "public"."StaffPayType" NOT NULL DEFAULT 'MONTHLY';

-- CreateTable
CREATE TABLE "public"."StaffAttendance" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "public"."StaffAttendanceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendance_staffId_date_key" ON "public"."StaffAttendance"("staffId", "date");

-- AddForeignKey
ALTER TABLE "public"."StaffAttendance" ADD CONSTRAINT "StaffAttendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

