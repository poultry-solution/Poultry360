-- Remove Chat with Doctor, the DOCTOR role and the old batch share links.
-- Old share links end on purpose; a new share feature will use new tables.

-- Stop here if any doctor account is still left (the role change below would fail).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."User" WHERE "role"::text = 'DOCTOR')
     OR EXISTS (SELECT 1 FROM "public"."StaffUser" WHERE "accountRole"::text = 'DOCTOR') THEN
    RAISE EXCEPTION 'DOCTOR accounts still exist. Remove them before this migration.';
  END IF;
END $$;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."UserRole_new" AS ENUM ('OWNER', 'MANAGER', 'DEALER', 'COMPANY', 'HATCHERY', 'SUPER_ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."User" ALTER COLUMN "role" TYPE "public"."UserRole_new" USING ("role"::text::"public"."UserRole_new");
ALTER TABLE "public"."StaffUser" ALTER COLUMN "accountRole" TYPE "public"."UserRole_new" USING ("accountRole"::text::"public"."UserRole_new");
ALTER TYPE "public"."UserRole" RENAME TO "UserRole_old";
ALTER TYPE "public"."UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "public"."User" ALTER COLUMN "role" SET DEFAULT 'OWNER';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."BatchShare" DROP CONSTRAINT "BatchShare_batchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BatchShare" DROP CONSTRAINT "BatchShare_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BatchShare" DROP CONSTRAINT "BatchShare_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BatchShare" DROP CONSTRAINT "BatchShare_sharedWithId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BatchShareView" DROP CONSTRAINT "BatchShareView_shareId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BatchShareView" DROP CONSTRAINT "BatchShareView_viewerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Conversation" DROP CONSTRAINT "Conversation_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Conversation" DROP CONSTRAINT "Conversation_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_batchShareId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_senderId_fkey";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "isOnline",
DROP COLUMN "lastSeen";

-- DropTable
DROP TABLE "public"."BatchShare";

-- DropTable
DROP TABLE "public"."BatchShareView";

-- DropTable
DROP TABLE "public"."Conversation";

-- DropTable
DROP TABLE "public"."Message";

-- DropEnum
DROP TYPE "public"."ConversationStatus";

-- DropEnum
DROP TYPE "public"."MessageType";

