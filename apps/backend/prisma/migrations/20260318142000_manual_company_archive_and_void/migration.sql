-- AlterTable
ALTER TABLE "DealerManualCompany"
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT;

-- AlterTable
ALTER TABLE "DealerManualPurchase"
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedReason" TEXT;

-- AlterTable
ALTER TABLE "DealerManualCompanyPayment"
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedReason" TEXT;

