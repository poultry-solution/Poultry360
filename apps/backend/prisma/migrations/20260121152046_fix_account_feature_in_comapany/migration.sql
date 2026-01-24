/*
  Warnings:

  - You are about to drop the `CompanySalePayment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CompanySalePayment" DROP CONSTRAINT "CompanySalePayment_companySaleId_fkey";

-- DropTable
DROP TABLE "public"."CompanySalePayment";
