/*
  Warnings:

  - A unique constraint covering the columns `[invoiceKey]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Sale_invoiceNumber_key";

-- AlterTable
ALTER TABLE "public"."Sale" ADD COLUMN     "invoiceKey" TEXT;

-- Backfill the hidden key for every existing Farmer invoice. Category is the
-- stable owner link even for older sales that do not have a farm.
UPDATE "public"."Sale" AS s
SET "invoiceKey" = c."userId" || ':' || s."invoiceNumber"
FROM "public"."Category" AS c
WHERE s."categoryId" = c."id"
  AND s."invoiceNumber" IS NOT NULL
  AND s."invoiceKey" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_invoiceKey_key" ON "public"."Sale"("invoiceKey");
