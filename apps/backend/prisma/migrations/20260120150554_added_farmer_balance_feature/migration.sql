-- AlterTable
ALTER TABLE "public"."DealerSalePaymentRequest" ADD COLUMN     "isLedgerLevel" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "dealerSaleId" DROP NOT NULL;
