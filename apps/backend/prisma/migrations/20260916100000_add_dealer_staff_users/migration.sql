CREATE TYPE "StaffPermission" AS ENUM ('DEALER_VIEW_FINANCIAL_SUMMARIES', 'DEALER_VIEW_CASH_HISTORY');

CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "permissions" "StaffPermission"[] NOT NULL DEFAULT ARRAY[]::"StaffPermission"[],
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffUser_phone_key" ON "StaffUser"("phone");
CREATE INDEX "StaffUser_ownerId_idx" ON "StaffUser"("ownerId");
CREATE INDEX "StaffUser_dealerId_idx" ON "StaffUser"("dealerId");
CREATE INDEX "StaffUser_dealerId_isActive_idx" ON "StaffUser"("dealerId", "isActive");

ALTER TABLE "StaffUser" ADD CONSTRAINT "StaffUser_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffUser" ADD CONSTRAINT "StaffUser_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
