-- AlterTable
ALTER TABLE "public"."BatchNote" ADD COLUMN     "createdByOwner" BOOLEAN,
ADD COLUMN     "createdByStaffId" TEXT,
ADD COLUMN     "editedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."HatcheryNote" (
    "id" TEXT NOT NULL,
    "hatcheryOwnerId" TEXT NOT NULL,
    "hatcheryBatchId" TEXT,
    "incubationId" TEXT,
    "text" TEXT NOT NULL,
    "createdByStaffId" TEXT,
    "createdByOwner" BOOLEAN NOT NULL DEFAULT true,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatcheryNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HatcheryNote_hatcheryBatchId_createdAt_idx" ON "public"."HatcheryNote"("hatcheryBatchId", "createdAt");

-- CreateIndex
CREATE INDEX "HatcheryNote_incubationId_createdAt_idx" ON "public"."HatcheryNote"("incubationId", "createdAt");

-- CreateIndex
CREATE INDEX "HatcheryNote_hatcheryOwnerId_idx" ON "public"."HatcheryNote"("hatcheryOwnerId");

-- AddForeignKey
ALTER TABLE "public"."BatchNote" ADD CONSTRAINT "BatchNote_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "public"."StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HatcheryNote" ADD CONSTRAINT "HatcheryNote_hatcheryOwnerId_fkey" FOREIGN KEY ("hatcheryOwnerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HatcheryNote" ADD CONSTRAINT "HatcheryNote_hatcheryBatchId_fkey" FOREIGN KEY ("hatcheryBatchId") REFERENCES "public"."HatcheryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HatcheryNote" ADD CONSTRAINT "HatcheryNote_incubationId_fkey" FOREIGN KEY ("incubationId") REFERENCES "public"."HatcheryIncubationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HatcheryNote" ADD CONSTRAINT "HatcheryNote_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "public"."StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

