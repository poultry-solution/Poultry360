/*
  Warnings:

  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - Added the required column `unitSellingPrice` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "price",
ADD COLUMN     "unitCostPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "unitSellingPrice" DECIMAL(10,2) NOT NULL;
