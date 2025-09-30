/*
  Warnings:

  - You are about to drop the column `CompanyFarmCapacity` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `CompanyFarmNumber` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."User_email_key";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "CompanyFarmCapacity",
DROP COLUMN "CompanyFarmNumber",
DROP COLUMN "email",
DROP COLUMN "gender";
