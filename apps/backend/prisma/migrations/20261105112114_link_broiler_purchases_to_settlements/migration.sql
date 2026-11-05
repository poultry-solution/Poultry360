-- DropIndex
DROP INDEX "public"."DealerBroilerPurchase_dealerId_sourceFarmerId_date_idx";

-- AlterTable
ALTER TABLE "public"."DealerBroilerPurchase" ADD COLUMN     "settlementId" TEXT;

-- CreateIndex
CREATE INDEX "DealerBroilerPurchase_dealerId_sourceFarmerId_settlementId_idx" ON "public"."DealerBroilerPurchase"("dealerId", "sourceFarmerId", "settlementId");

-- AddForeignKey
ALTER TABLE "public"."DealerBroilerPurchase" ADD CONSTRAINT "DealerBroilerPurchase_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "public"."BroilerSaleSettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: attach every pre-existing purchase row to the earliest
-- settlement that was committed AFTER it (if any). A purchase that
-- predates a settlement for the same (dealer, farmer) was conceptually
-- part of the lot that settlement closed. Leaving them NULL would make
-- those rows re-appear on the next open lot and silently double-count.
UPDATE "public"."DealerBroilerPurchase" p
SET "settlementId" = sub.id
FROM (
  SELECT DISTINCT ON (p2.id) p2.id AS purchase_id, s.id
  FROM "public"."DealerBroilerPurchase" p2
  JOIN "public"."BroilerSaleSettlement" s
    ON s."dealerId" = p2."dealerId"
   AND s."farmerId" = p2."sourceFarmerId"
   AND s."settledAt" > p2."createdAt"
  ORDER BY p2.id, s."settledAt" ASC
) sub
WHERE p.id = sub.purchase_id
  AND p."settlementId" IS NULL;
