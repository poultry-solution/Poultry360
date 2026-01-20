/*
  Warnings:

  - A unique constraint covering the columns `[userId,farmerId]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Customer" ADD COLUMN     "farmerId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_farmerId_key" ON "public"."Customer"("userId", "farmerId");

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
