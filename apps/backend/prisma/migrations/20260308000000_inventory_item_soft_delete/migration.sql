-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
