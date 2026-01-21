-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."DealerCart" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerCartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealerCart_dealerId_idx" ON "public"."DealerCart"("dealerId");

-- CreateIndex
CREATE INDEX "DealerCart_companyId_idx" ON "public"."DealerCart"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerCart_dealerId_companyId_key" ON "public"."DealerCart"("dealerId", "companyId");

-- CreateIndex
CREATE INDEX "DealerCartItem_cartId_idx" ON "public"."DealerCartItem"("cartId");

-- CreateIndex
CREATE INDEX "DealerCartItem_productId_idx" ON "public"."DealerCartItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerCartItem_cartId_productId_key" ON "public"."DealerCartItem"("cartId", "productId");

-- AddForeignKey
ALTER TABLE "public"."DealerCart" ADD CONSTRAINT "DealerCart_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerCart" ADD CONSTRAINT "DealerCart_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerCartItem" ADD CONSTRAINT "DealerCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."DealerCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerCartItem" ADD CONSTRAINT "DealerCartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
