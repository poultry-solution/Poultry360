-- AlterTable
ALTER TABLE "public"."CompanyDealerAccount" ADD COLUMN     "balanceLimit" DECIMAL(10,2),
ADD COLUMN     "balanceLimitSetAt" TIMESTAMP(3),
ADD COLUMN     "balanceLimitSetBy" TEXT;

-- AddForeignKey
ALTER TABLE "public"."CompanyDealerAccount" ADD CONSTRAINT "CompanyDealerAccount_balanceLimitSetBy_fkey" FOREIGN KEY ("balanceLimitSetBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
