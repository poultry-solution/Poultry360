-- CreateTable
CREATE TABLE "public"."FarmerFcrSettings" (
    "ownerId" TEXT NOT NULL,
    "cfcrTargetWeightKg" DECIMAL(8,3) NOT NULL,
    "cfcrCorrectionFactorPerKg" DECIMAL(8,4) NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerFcrSettings_pkey" PRIMARY KEY ("ownerId")
);

-- AddForeignKey
ALTER TABLE "public"."FarmerFcrSettings" ADD CONSTRAINT "FarmerFcrSettings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

