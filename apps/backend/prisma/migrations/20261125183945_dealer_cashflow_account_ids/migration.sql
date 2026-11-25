-- AlterTable
ALTER TABLE "public"."BroilerSaleSettlement" ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "public"."DealerLedgerEntry" ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "public"."DealerManualCompanyPayment" ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "public"."DealerSalePayment" ADD COLUMN     "accountId" TEXT;
