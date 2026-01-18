/*
  Warnings:

  - You are about to drop the column `companyId` on the `Dealer` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Dealer" DROP CONSTRAINT "Dealer_companyId_fkey";

-- AlterTable
ALTER TABLE "public"."Dealer" DROP COLUMN "companyId";

-- CreateTable
CREATE TABLE "public"."DealerCompany" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectedVia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerCompany_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealerCompany_dealerId_idx" ON "public"."DealerCompany"("dealerId");

-- CreateIndex
CREATE INDEX "DealerCompany_companyId_idx" ON "public"."DealerCompany"("companyId");

-- CreateIndex
CREATE INDEX "DealerCompany_companyId_dealerId_idx" ON "public"."DealerCompany"("companyId", "dealerId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerCompany_dealerId_companyId_key" ON "public"."DealerCompany"("dealerId", "companyId");

-- AddForeignKey
ALTER TABLE "public"."DealerCompany" ADD CONSTRAINT "DealerCompany_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerCompany" ADD CONSTRAINT "DealerCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
