-- CreateEnum
CREATE TYPE "public"."AccountPaymentType" AS ENUM ('INITIAL', 'MAINTENANCE');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isTestAccount" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."AccountPayment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "public"."AccountPaymentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountPayment_accountId_paidAt_idx" ON "public"."AccountPayment"("accountId", "paidAt");

-- CreateIndex
CREATE INDEX "AccountPayment_accountId_type_idx" ON "public"."AccountPayment"("accountId", "type");

-- AddForeignKey
ALTER TABLE "public"."AccountPayment" ADD CONSTRAINT "AccountPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
