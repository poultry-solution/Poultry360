-- CreateEnum
CREATE TYPE "public"."Language" AS ENUM ('ENGLISH', 'NEPALI');

-- CreateEnum
CREATE TYPE "public"."CalendarType" AS ENUM ('AD', 'BS');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "calendarType" "public"."CalendarType" NOT NULL DEFAULT 'AD',
ADD COLUMN     "language" "public"."Language" NOT NULL DEFAULT 'ENGLISH';
