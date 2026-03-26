-- CreateEnum
CREATE TYPE "HatcheryPartyTxnType" AS ENUM ('SALE', 'PAYMENT', 'ADJUSTMENT', 'OPENING_BALANCE');

-- CreateTable: HatcheryParty
CREATE TABLE "HatcheryParty" (
    "id" TEXT NOT NULL,
    "hatcheryOwnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatcheryParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryPartyTxn
CREATE TABLE "HatcheryPartyTxn" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "type" "HatcheryPartyTxnType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryPartyTxn_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HatcheryPartyPayment
CREATE TABLE "HatcheryPartyPayment" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatcheryPartyPayment_pkey" PRIMARY KEY ("id")
);

-- Add partyId to sale tables (nullable)
ALTER TABLE "HatcheryEggSale" ADD COLUMN "partyId" TEXT;
ALTER TABLE "HatcheryChickSale" ADD COLUMN "partyId" TEXT;
ALTER TABLE "HatcheryParentSale" ADD COLUMN "partyId" TEXT;

-- Remove customerName from sale tables
ALTER TABLE "HatcheryEggSale" DROP COLUMN IF EXISTS "customerName";
ALTER TABLE "HatcheryChickSale" DROP COLUMN IF EXISTS "customerName";
ALTER TABLE "HatcheryParentSale" DROP COLUMN IF EXISTS "customerName";

-- Remove old unitPrice from HatcheryParentSale and add weight fields + ratePerKg
ALTER TABLE "HatcheryParentSale" DROP COLUMN IF EXISTS "unitPrice";
ALTER TABLE "HatcheryParentSale" ADD COLUMN "totalWeightKg" DECIMAL(12,3) NOT NULL DEFAULT 0;
ALTER TABLE "HatcheryParentSale" ADD COLUMN "avgWeightKg" DECIMAL(12,3) NOT NULL DEFAULT 0;
ALTER TABLE "HatcheryParentSale" ADD COLUMN "ratePerKg" DECIMAL(12,4) NOT NULL DEFAULT 0;

-- Remove the defaults (they were just for the migration to succeed on existing rows)
ALTER TABLE "HatcheryParentSale" ALTER COLUMN "totalWeightKg" DROP DEFAULT;
ALTER TABLE "HatcheryParentSale" ALTER COLUMN "avgWeightKg" DROP DEFAULT;
ALTER TABLE "HatcheryParentSale" ALTER COLUMN "ratePerKg" DROP DEFAULT;

-- Indexes
CREATE UNIQUE INDEX "HatcheryParty_hatcheryOwnerId_phone_key" ON "HatcheryParty"("hatcheryOwnerId", "phone");
CREATE INDEX "HatcheryParty_hatcheryOwnerId_idx" ON "HatcheryParty"("hatcheryOwnerId");

CREATE INDEX "HatcheryPartyTxn_partyId_idx" ON "HatcheryPartyTxn"("partyId");
CREATE INDEX "HatcheryPartyTxn_date_idx" ON "HatcheryPartyTxn"("date");
CREATE INDEX "HatcheryPartyTxn_sourceId_idx" ON "HatcheryPartyTxn"("sourceId");

CREATE INDEX "HatcheryPartyPayment_partyId_idx" ON "HatcheryPartyPayment"("partyId");
CREATE INDEX "HatcheryPartyPayment_date_idx" ON "HatcheryPartyPayment"("date");

CREATE INDEX "HatcheryEggSale_partyId_idx" ON "HatcheryEggSale"("partyId");
CREATE INDEX "HatcheryChickSale_partyId_idx" ON "HatcheryChickSale"("partyId");
CREATE INDEX "HatcheryParentSale_partyId_idx" ON "HatcheryParentSale"("partyId");

-- Foreign Keys
ALTER TABLE "HatcheryParty" ADD CONSTRAINT "HatcheryParty_hatcheryOwnerId_fkey" FOREIGN KEY ("hatcheryOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HatcheryPartyTxn" ADD CONSTRAINT "HatcheryPartyTxn_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "HatcheryParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HatcheryPartyPayment" ADD CONSTRAINT "HatcheryPartyPayment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "HatcheryParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HatcheryEggSale" ADD CONSTRAINT "HatcheryEggSale_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "HatcheryParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HatcheryChickSale" ADD CONSTRAINT "HatcheryChickSale_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "HatcheryParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HatcheryParentSale" ADD CONSTRAINT "HatcheryParentSale_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "HatcheryParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
