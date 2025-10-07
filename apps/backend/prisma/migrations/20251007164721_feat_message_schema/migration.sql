-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageType" ADD VALUE 'VIDEO';
ALTER TYPE "MessageType" ADD VALUE 'AUDIO';
ALTER TYPE "MessageType" ADD VALUE 'PDF';
ALTER TYPE "MessageType" ADD VALUE 'DOC';
ALTER TYPE "MessageType" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachmentKey" TEXT,
ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "contentType" TEXT,
ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thumbnailUrl" TEXT,
ADD COLUMN     "width" INTEGER,
ALTER COLUMN "text" DROP NOT NULL;
