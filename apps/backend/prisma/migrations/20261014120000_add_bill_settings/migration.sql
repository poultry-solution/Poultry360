-- Bill details (business name, address, PAN, phone, footer note) printed on
-- sale bills. New table only; no existing data changes. Accounts without a row
-- keep printing their current business name.

-- CreateTable
CREATE TABLE "public"."BillSettings" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "businessName" TEXT,
    "address" TEXT,
    "panNumber" TEXT,
    "phone" TEXT,
    "footerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillSettings_accountId_key" ON "public"."BillSettings"("accountId");

-- AddForeignKey
ALTER TABLE "public"."BillSettings" ADD CONSTRAINT "BillSettings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
