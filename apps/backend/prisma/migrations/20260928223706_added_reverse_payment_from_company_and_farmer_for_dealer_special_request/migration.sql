-- CreateEnum
CREATE TYPE "public"."PaymentDirection" AS ENUM ('RECEIVED', 'MADE');

-- AlterTable
ALTER TABLE "public"."DealerManualCompanyPayment" ADD COLUMN     "direction" "public"."PaymentDirection";
