-- CreateTable
CREATE TABLE "public"."SaleEggLine" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "eggTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "SaleEggLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaleEggLine_saleId_idx" ON "public"."SaleEggLine"("saleId");

-- CreateIndex
CREATE INDEX "SaleEggLine_eggTypeId_idx" ON "public"."SaleEggLine"("eggTypeId");

-- AddForeignKey
ALTER TABLE "public"."SaleEggLine" ADD CONSTRAINT "SaleEggLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleEggLine" ADD CONSTRAINT "SaleEggLine_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES "public"."EggType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
