/*
  Warnings:

  - You are about to drop the column `initialChickWeight` on the `Batch` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "WeightSource" AS ENUM ('MANUAL', 'SALE', 'SYSTEM');

-- AlterTable
ALTER TABLE "Batch" DROP COLUMN "initialChickWeight",
ADD COLUMN     "currentWeight" DECIMAL(6,2);

-- AlterTable
ALTER TABLE "BirdWeight" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "source" "WeightSource" NOT NULL DEFAULT 'MANUAL';
