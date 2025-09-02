/*
  Warnings:

  - You are about to drop the column `userId` on the `Farm` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `User` table. All the data in the column will be lost.
  - Added the required column `ownerId` to the `Farm` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Farm" DROP CONSTRAINT "Farm_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_ownerId_fkey";

-- AlterTable
ALTER TABLE "public"."Farm" DROP COLUMN "userId",
ADD COLUMN     "ownerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "ownerId";

-- CreateTable
CREATE TABLE "public"."_FarmManagers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FarmManagers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_FarmManagers_B_index" ON "public"."_FarmManagers"("B");

-- AddForeignKey
ALTER TABLE "public"."Farm" ADD CONSTRAINT "Farm_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_FarmManagers" ADD CONSTRAINT "_FarmManagers_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_FarmManagers" ADD CONSTRAINT "_FarmManagers_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
