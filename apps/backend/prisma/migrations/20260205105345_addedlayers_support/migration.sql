-- CreateEnum
CREATE TYPE "public"."BatchType" AS ENUM ('BROILER', 'LAYERS');

-- AlterTable
ALTER TABLE "public"."Batch" ADD COLUMN     "batchType" "public"."BatchType" NOT NULL DEFAULT 'BROILER';
