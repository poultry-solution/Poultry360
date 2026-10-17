-- Remove ARCHIVED from StaffStatus.
--
-- Archive required a balance of exactly zero, but salary accrues as
-- salary / days-in-BS-month * days-worked, which lands on repeating decimals.
-- No whole-rupee payment could ever settle it, so archiving was unreachable.
-- Stopped already gives these records their own tab; hard delete replaces archive.

-- Existing archived staff become STOPPED. They are real people with real payment
-- history, so they are preserved rather than deleted; the owner can remove them
-- deliberately afterwards.
UPDATE "Staff" SET "status" = 'STOPPED' WHERE "status" = 'ARCHIVED';

-- Postgres has no ALTER TYPE ... DROP VALUE, so the enum is swapped.
-- Staff.status carries @default(ACTIVE), which is why the default must be
-- dropped and re-set around the column type change.
ALTER TYPE "StaffStatus" RENAME TO "StaffStatus_old";

CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'STOPPED');

ALTER TABLE "Staff"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "StaffStatus" USING ("status"::text::"StaffStatus"),
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

DROP TYPE "StaffStatus_old";
