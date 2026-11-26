-- AlterTable
ALTER TABLE "public"."HatcheryBatchExpense" ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "public"."HatcheryPartyPayment" ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "public"."HatcherySupplierTxn" ADD COLUMN     "accountId" TEXT;
