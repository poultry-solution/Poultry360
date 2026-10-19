-- DropForeignKey
ALTER TABLE "public"."CompanyDealerPayment" DROP CONSTRAINT "CompanyDealerPayment_recordedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."DealerFarmerPayment" DROP CONSTRAINT "DealerFarmerPayment_recordedById_fkey";

-- AlterTable
ALTER TABLE "public"."CompanyDealerPayment" ALTER COLUMN "recordedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."DealerFarmerPayment" ALTER COLUMN "recordedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."DealerFarmerPayment" ADD CONSTRAINT "DealerFarmerPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyDealerPayment" ADD CONSTRAINT "CompanyDealerPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
