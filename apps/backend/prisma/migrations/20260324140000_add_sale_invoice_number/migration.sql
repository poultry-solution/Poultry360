-- AlterTable: Add invoiceNumber to Sale
ALTER TABLE "public"."Sale" ADD COLUMN "invoiceNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_invoiceNumber_key" ON "public"."Sale"("invoiceNumber");
CREATE INDEX "Sale_invoiceNumber_idx" ON "public"."Sale"("invoiceNumber");
