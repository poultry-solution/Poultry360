-- AlterEnum
ALTER TYPE "public"."CashSourceType" ADD VALUE 'DEALER_BROILER_PURCHASE';

-- AlterTable
ALTER TABLE "public"."DealerBroilerPurchase" ADD COLUMN     "accountId" TEXT;
