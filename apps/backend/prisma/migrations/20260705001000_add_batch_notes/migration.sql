CREATE TABLE "BatchNote" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BatchNote_batchId_date_idx" ON "BatchNote"("batchId", "date");

ALTER TABLE "BatchNote" ADD CONSTRAINT "BatchNote_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
