-- CreateEnum
CREATE TYPE "public"."ListForSaleCategory" AS ENUM ('CHICKEN', 'EGGS', 'LAYERS', 'FISH', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ListForSaleStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "public"."ListForSale" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "category" "public"."ListForSaleCategory" NOT NULL,
    "phone" TEXT NOT NULL,
    "rate" DECIMAL(10,2),
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "availabilityFrom" TIMESTAMP(3) NOT NULL,
    "availabilityTo" TIMESTAMP(3) NOT NULL,
    "avgWeightKg" DECIMAL(6,2),
    "eggVariants" JSONB,
    "typeVariants" JSONB,
    "status" "public"."ListForSaleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListForSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListForSale_userId_idx" ON "public"."ListForSale"("userId");

-- CreateIndex
CREATE INDEX "ListForSale_category_idx" ON "public"."ListForSale"("category");

-- CreateIndex
CREATE INDEX "ListForSale_status_idx" ON "public"."ListForSale"("status");

-- CreateIndex
CREATE INDEX "ListForSale_createdAt_idx" ON "public"."ListForSale"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."ListForSale" ADD CONSTRAINT "ListForSale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
