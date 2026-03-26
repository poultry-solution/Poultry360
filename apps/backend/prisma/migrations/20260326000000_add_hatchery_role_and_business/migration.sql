-- Add HATCHERY to UserRole enum
ALTER TYPE "public"."UserRole" ADD VALUE 'HATCHERY';

-- Add hatcheryAmountNpr column to OnboardingPaymentSettings
ALTER TABLE "public"."OnboardingPaymentSettings" ADD COLUMN "hatcheryAmountNpr" DECIMAL(10,2) NOT NULL DEFAULT 9999;

-- CreateTable HatcheryBusiness
CREATE TABLE "public"."HatcheryBusiness" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "address" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatcheryBusiness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HatcheryBusiness_ownerId_key" ON "public"."HatcheryBusiness"("ownerId");

-- AddForeignKey
ALTER TABLE "public"."HatcheryBusiness" ADD CONSTRAINT "HatcheryBusiness_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
