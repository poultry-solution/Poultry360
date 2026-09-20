ALTER TABLE "DealerSaleItem" DROP CONSTRAINT "DealerSaleItem_productId_fkey";

ALTER TABLE "DealerSaleItem"
ALTER COLUMN "productId" DROP NOT NULL;

ALTER TABLE "DealerSaleItem"
ADD CONSTRAINT "DealerSaleItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "DealerProduct"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
