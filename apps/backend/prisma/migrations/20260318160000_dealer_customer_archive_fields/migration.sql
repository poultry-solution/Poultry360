-- AlterTable
ALTER TABLE "Customer"
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT;

-- Optional index for fast filtering by archive state
CREATE INDEX IF NOT EXISTS "Customer_archivedAt_idx"
ON "Customer"("archivedAt");

