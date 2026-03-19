-- Add bucket identifier to ProductionInput (supplierId + unitPrice) so we can track remaining per bucket
ALTER TABLE "public"."ProductionInput" ADD COLUMN "unitPrice" DECIMAL(12,2);
ALTER TABLE "public"."ProductionInput" ADD COLUMN "supplierId" TEXT;

-- Backfill: set unitPrice 0 and first supplier per company for existing rows (so FK holds)
UPDATE "public"."ProductionInput" pi
SET "unitPrice" = 0,
    "supplierId" = (SELECT s.id FROM "public"."Supplier" s
                    INNER JOIN "public"."ProductionRun" pr ON pr."companyId" = s."companyId"
                    WHERE pr.id = pi."productionId"
                    LIMIT 1)
WHERE pi."supplierId" IS NULL;

ALTER TABLE "public"."ProductionInput" ALTER COLUMN "unitPrice" SET NOT NULL;
ALTER TABLE "public"."ProductionInput" ALTER COLUMN "supplierId" SET NOT NULL;

CREATE INDEX "ProductionInput_supplierId_idx" ON "public"."ProductionInput"("supplierId");
ALTER TABLE "public"."ProductionInput" ADD CONSTRAINT "ProductionInput_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
