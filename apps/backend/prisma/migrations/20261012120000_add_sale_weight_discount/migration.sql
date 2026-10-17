-- Broiler weight discount on farmer sales.
--
-- Adds one nullable column. Existing sales get NULL (no discount), so no
-- amount, weight, balance or FCR changes. Sale.weight stays the real weight.

-- AlterTable
ALTER TABLE "public"."Sale" ADD COLUMN     "weightDiscountPercent" DECIMAL(5,2);

