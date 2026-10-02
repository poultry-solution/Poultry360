-- AlterTable
ALTER TABLE "public"."Batch" ADD COLUMN     "cfcrCorrectionFactorPerKg" DECIMAL(8,4),
ADD COLUMN     "cfcrTargetWeightKg" DECIMAL(8,3);

-- AlterTable
ALTER TABLE "public"."BatchFcrHistory" ADD COLUMN     "averageOutputWeightKg" DECIMAL(14,6),
ADD COLUMN     "cfcr" DECIMAL(12,6),
ADD COLUMN     "cfcrCorrectionFactorPerKg" DECIMAL(8,4),
ADD COLUMN     "cfcrTargetWeightKg" DECIMAL(8,3),
ADD COLUMN     "outputBirdCount" INTEGER;
