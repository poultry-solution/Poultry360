-- CreateTable: Production (raw materials used + produced items log)
CREATE TABLE "public"."ProductionRun" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ProductionInput" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "productionId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionInput_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ProductionOutput" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit" TEXT DEFAULT 'kg',
    "productionId" TEXT NOT NULL,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionOutput_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductionRun_companyId_date_idx" ON "public"."ProductionRun"("companyId", "date");
CREATE INDEX "ProductionInput_productionId_idx" ON "public"."ProductionInput"("productionId");
CREATE INDEX "ProductionInput_rawMaterialId_idx" ON "public"."ProductionInput"("rawMaterialId");
CREATE INDEX "ProductionOutput_productionId_idx" ON "public"."ProductionOutput"("productionId");
CREATE INDEX "ProductionOutput_productId_idx" ON "public"."ProductionOutput"("productId");

ALTER TABLE "public"."ProductionRun" ADD CONSTRAINT "ProductionRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ProductionRun" ADD CONSTRAINT "ProductionRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."ProductionInput" ADD CONSTRAINT "ProductionInput_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "public"."ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ProductionInput" ADD CONSTRAINT "ProductionInput_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "public"."RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."ProductionOutput" ADD CONSTRAINT "ProductionOutput_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "public"."ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ProductionOutput" ADD CONSTRAINT "ProductionOutput_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
