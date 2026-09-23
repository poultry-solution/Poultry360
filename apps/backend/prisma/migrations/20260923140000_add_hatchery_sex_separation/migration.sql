-- Hatchery male/female separation — Phase 1 (schema only).
-- Additive: no existing column is altered or dropped, so every read path
-- outside hatchery keeps working unchanged.

-- CreateEnum
CREATE TYPE "HatcherySex" AS ENUM ('MALE', 'FEMALE', 'NA');

-- CreateEnum
CREATE TYPE "HatcheryFeedTarget" AS ENUM ('MALE', 'FEMALE', 'BOTH');

-- AlterTable
ALTER TABLE "HatcherySupplierPurchaseItem" ADD COLUMN "sex" "HatcherySex" NOT NULL DEFAULT 'NA';

-- AlterTable
-- NOT NULL + DEFAULT 'NA' is required: `sex` joins the unique key below, and
-- Postgres treats every NULL as distinct, which would break feed lot dedup.
ALTER TABLE "HatcheryInventoryItem" ADD COLUMN "sex" "HatcherySex" NOT NULL DEFAULT 'NA';

-- AlterTable
ALTER TABLE "HatcheryBatch" ADD COLUMN "initialMaleParents" INTEGER,
ADD COLUMN "initialFemaleParents" INTEGER,
ADD COLUMN "currentMaleParents" INTEGER,
ADD COLUMN "currentFemaleParents" INTEGER;

-- AlterTable
ALTER TABLE "HatcheryBatchMortality" ADD COLUMN "maleCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "femaleCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "HatcheryParentSale" ADD COLUMN "maleCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "femaleCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "HatcheryBatchExpense" ADD COLUMN "feedTarget" "HatcheryFeedTarget",
ADD COLUMN "maleFeedQuantity" DECIMAL(12,4),
ADD COLUMN "femaleFeedQuantity" DECIMAL(12,4);

-- DropIndex
-- Replaced by the sex-aware key below. Existing rows all default to 'NA',
-- so the new key is equivalent for every non-CHICKS row.
DROP INDEX "HatcheryInventoryItem_owner_type_name_unit_price_source_key";

-- CreateIndex
CREATE UNIQUE INDEX "HatcheryInventoryItem_owner_type_name_unit_price_source_sex_key" ON "HatcheryInventoryItem"("hatcheryOwnerId", "itemType", "name", "unit", "unitPrice", "supplierKey", "sex");
