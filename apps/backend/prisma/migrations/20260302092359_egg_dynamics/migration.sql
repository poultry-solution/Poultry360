/*
  Warnings:

  - You are about to drop the column `eggCategory` on the `EggInventory` table. All the data in the column will be lost.
  - You are about to drop the column `largeCount` on the `EggProduction` table. All the data in the column will be lost.
  - You are about to drop the column `mediumCount` on the `EggProduction` table. All the data in the column will be lost.
  - You are about to drop the column `smallCount` on the `EggProduction` table. All the data in the column will be lost.
  - You are about to drop the column `eggCategory` on the `Sale` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,eggTypeId]` on the table `EggInventory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eggTypeId` to the `EggInventory` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."EggInventory_userId_eggCategory_key";

-- AlterTable
ALTER TABLE "public"."EggInventory" DROP COLUMN "eggCategory",
ADD COLUMN     "eggTypeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."EggProduction" DROP COLUMN "largeCount",
DROP COLUMN "mediumCount",
DROP COLUMN "smallCount";

-- AlterTable
ALTER TABLE "public"."Sale" DROP COLUMN "eggCategory",
ADD COLUMN     "eggTypeId" TEXT;

-- DropEnum
DROP TYPE "public"."EggCategory";

-- CreateTable
CREATE TABLE "public"."EggType" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EggType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EggProductionEntry" (
    "id" TEXT NOT NULL,
    "eggProductionId" TEXT NOT NULL,
    "eggTypeId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EggProductionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EggType_userId_idx" ON "public"."EggType"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EggType_userId_code_key" ON "public"."EggType"("userId", "code");

-- CreateIndex
CREATE INDEX "EggProductionEntry_eggProductionId_idx" ON "public"."EggProductionEntry"("eggProductionId");

-- CreateIndex
CREATE UNIQUE INDEX "EggProductionEntry_eggProductionId_eggTypeId_key" ON "public"."EggProductionEntry"("eggProductionId", "eggTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "EggInventory_userId_eggTypeId_key" ON "public"."EggInventory"("userId", "eggTypeId");

-- AddForeignKey
ALTER TABLE "public"."EggType" ADD CONSTRAINT "EggType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EggProductionEntry" ADD CONSTRAINT "EggProductionEntry_eggProductionId_fkey" FOREIGN KEY ("eggProductionId") REFERENCES "public"."EggProduction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EggProductionEntry" ADD CONSTRAINT "EggProductionEntry_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES "public"."EggType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EggInventory" ADD CONSTRAINT "EggInventory_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES "public"."EggType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES "public"."EggType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
