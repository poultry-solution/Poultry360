-- Read-only share links for hatchery parent batches (vet view, no money). Additive only.
CREATE TABLE "public"."HatcheryBatchShareLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "hatcheryBatchId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByStaffId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "showNotes" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryBatchShareLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HatcheryBatchShareLink_token_key" ON "public"."HatcheryBatchShareLink"("token");
CREATE INDEX "HatcheryBatchShareLink_hatcheryBatchId_idx" ON "public"."HatcheryBatchShareLink"("hatcheryBatchId");
CREATE INDEX "HatcheryBatchShareLink_createdById_idx" ON "public"."HatcheryBatchShareLink"("createdById");

ALTER TABLE "public"."HatcheryBatchShareLink" ADD CONSTRAINT "HatcheryBatchShareLink_hatcheryBatchId_fkey" FOREIGN KEY ("hatcheryBatchId") REFERENCES "public"."HatcheryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."HatcheryBatchShareLink" ADD CONSTRAINT "HatcheryBatchShareLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
