/*
  Warnings:

  - The values [CANCELLED] on the enum `BatchStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `location` on the `Farm` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."BatchStatus_new" AS ENUM ('ACTIVE', 'COMPLETED');
ALTER TABLE "public"."Batch" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Batch" ALTER COLUMN "status" TYPE "public"."BatchStatus_new" USING ("status"::text::"public"."BatchStatus_new");
ALTER TYPE "public"."BatchStatus" RENAME TO "BatchStatus_old";
ALTER TYPE "public"."BatchStatus_new" RENAME TO "BatchStatus";
DROP TYPE "public"."BatchStatus_old";
ALTER TABLE "public"."Batch" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Farm" DROP COLUMN "location";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "CompanyFarmCapacity" INTEGER,
ADD COLUMN     "CompanyFarmLocation" TEXT,
ADD COLUMN     "CompanyFarmNumber" INTEGER,
ADD COLUMN     "companyName" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "gender" SET DEFAULT 'MALE';

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");
