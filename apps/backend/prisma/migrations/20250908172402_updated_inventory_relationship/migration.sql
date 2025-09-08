-- CreateEnum
CREATE TYPE "public"."InventoryItemType" AS ENUM ('FEED', 'CHICKS', 'MEDICINE', 'EQUIPMENT', 'OTHER');

-- AlterTable
ALTER TABLE "public"."EntityTransaction" ADD COLUMN     "expenseId" TEXT,
ADD COLUMN     "inventoryItemId" TEXT;

-- AlterTable
ALTER TABLE "public"."InventoryItem" ADD COLUMN     "itemType" "public"."InventoryItemType" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "EntityTransaction_inventoryItemId_date_idx" ON "public"."EntityTransaction"("inventoryItemId", "date");

-- AddForeignKey
ALTER TABLE "public"."EntityTransaction" ADD CONSTRAINT "EntityTransaction_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "public"."InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EntityTransaction" ADD CONSTRAINT "EntityTransaction_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
