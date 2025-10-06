-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageType" ADD VALUE 'BATCH_SHARE';
ALTER TYPE "MessageType" ADD VALUE 'FARM_SHARE';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "batchShareId" TEXT;

-- CreateTable
CREATE TABLE "BatchShare" (
    "id" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "sharedWithId" TEXT,
    "conversationId" TEXT,
    "snapshotData" JSONB NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchShareView" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "viewerId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchShareView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BatchShare_shareToken_key" ON "BatchShare"("shareToken");

-- CreateIndex
CREATE INDEX "BatchShare_shareToken_idx" ON "BatchShare"("shareToken");

-- CreateIndex
CREATE INDEX "BatchShare_batchId_idx" ON "BatchShare"("batchId");

-- CreateIndex
CREATE INDEX "BatchShare_conversationId_idx" ON "BatchShare"("conversationId");

-- CreateIndex
CREATE INDEX "BatchShareView_shareId_idx" ON "BatchShareView"("shareId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_batchShareId_fkey" FOREIGN KEY ("batchShareId") REFERENCES "BatchShare"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchShare" ADD CONSTRAINT "BatchShare_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchShare" ADD CONSTRAINT "BatchShare_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchShare" ADD CONSTRAINT "BatchShare_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchShare" ADD CONSTRAINT "BatchShare_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchShareView" ADD CONSTRAINT "BatchShareView_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "BatchShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchShareView" ADD CONSTRAINT "BatchShareView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
