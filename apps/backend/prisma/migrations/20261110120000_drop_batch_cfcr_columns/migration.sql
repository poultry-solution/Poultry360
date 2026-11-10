-- Old per-batch cFCR settings, replaced by FarmerFcrSettings (one standard per account).
-- AlterTable
ALTER TABLE "public"."Batch" DROP COLUMN "cfcrCorrectionFactorPerKg",
DROP COLUMN "cfcrTargetWeightKg";

