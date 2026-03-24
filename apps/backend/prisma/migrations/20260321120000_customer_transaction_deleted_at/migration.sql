-- CustomerTransaction.deletedAt exists in schema (soft delete) but was never added via migration.
-- Creating a row (e.g. opening balance when adding a dealer customer) caused Prisma to fail on INSERT/RETURNING.
ALTER TABLE "CustomerTransaction" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
