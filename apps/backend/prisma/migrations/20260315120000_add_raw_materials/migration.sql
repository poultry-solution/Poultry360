-- CreateTable: Raw materials (inputs company purchases; used later in production)
CREATE TABLE "public"."RawMaterial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentStock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawMaterial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RawMaterial_companyId_name_unit_key" ON "public"."RawMaterial"("companyId", "name", "unit");
CREATE INDEX "RawMaterial_companyId_idx" ON "public"."RawMaterial"("companyId");

ALTER TABLE "public"."RawMaterial" ADD CONSTRAINT "RawMaterial_companyId_fkey" 
  FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Switch CompanyPurchaseItem from productId to rawMaterialId
-- Add new column (nullable first)
ALTER TABLE "public"."CompanyPurchaseItem" ADD COLUMN "rawMaterialId" TEXT;

-- Remove old purchase data (items referenced products; raw materials are a new concept)
DELETE FROM "public"."CompanyPurchaseItem";
DELETE FROM "public"."CompanyPurchase";

ALTER TABLE "public"."CompanyPurchaseItem" DROP CONSTRAINT IF EXISTS "CompanyPurchaseItem_productId_fkey";
ALTER TABLE "public"."CompanyPurchaseItem" DROP COLUMN "productId";
ALTER TABLE "public"."CompanyPurchaseItem" ALTER COLUMN "rawMaterialId" SET NOT NULL;

ALTER TABLE "public"."CompanyPurchaseItem" ADD CONSTRAINT "CompanyPurchaseItem_rawMaterialId_fkey" 
  FOREIGN KEY ("rawMaterialId") REFERENCES "public"."RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "CompanyPurchaseItem_rawMaterialId_idx" ON "public"."CompanyPurchaseItem"("rawMaterialId");
