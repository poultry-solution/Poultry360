-- CreateTable
CREATE TABLE "public"."BatchShareLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByStaffId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "showLocation" BOOLEAN NOT NULL DEFAULT false,
    "showNotes" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BatchShareLink_token_key" ON "public"."BatchShareLink"("token");

-- CreateIndex
CREATE INDEX "BatchShareLink_batchId_idx" ON "public"."BatchShareLink"("batchId");

-- CreateIndex
CREATE INDEX "BatchShareLink_createdById_idx" ON "public"."BatchShareLink"("createdById");

-- AddForeignKey
ALTER TABLE "public"."BatchShareLink" ADD CONSTRAINT "BatchShareLink_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BatchShareLink" ADD CONSTRAINT "BatchShareLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

