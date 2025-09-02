/*
  Warnings:

  - You are about to drop the column `isActive` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION');

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "isActive",
ADD COLUMN     "status" "public"."UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION';
