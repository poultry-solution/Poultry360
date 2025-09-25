/*
  Warnings:

  - Added the required column `weight` to the `Sale` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Expense" ADD COLUMN     "weight" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."Sale" ADD COLUMN     "weight" DECIMAL(10,2) NOT NULL;
