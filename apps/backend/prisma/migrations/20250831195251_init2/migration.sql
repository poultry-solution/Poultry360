-- CreateEnum
CREATE TYPE "public"."Product" AS ENUM ('FEED', 'MEDICINE', 'EQUIPMENT', 'CHICKS');

-- CreateEnum
CREATE TYPE "public"."Unit" AS ENUM ('PIECE', 'KG', 'LITER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Address" (
    "id" TEXT NOT NULL,
    "houseNo" TEXT,
    "street" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "landmark" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Farm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lotCapacity" INTEGER NOT NULL,
    "lotSize" INTEGER NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FarmLot" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "farmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Hatchery" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hatchery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HatcherySupply" (
    "id" TEXT NOT NULL,
    "hatcheryId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "lotId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" "public"."Unit" NOT NULL DEFAULT 'PIECE',
    "dateSupplied" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatcherySupply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Dealer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "dealerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryPurchase" (
    "id" TEXT NOT NULL,
    "product" "public"."Product" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" "public"."Unit" NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "farmId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "isPaidFull" BOOLEAN NOT NULL DEFAULT false,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryConsumption" (
    "id" TEXT NOT NULL,
    "product" "public"."Product" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" "public"."Unit" NOT NULL,
    "lotId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Sale" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(12,2) NOT NULL,
    "customerId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Mortality" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL,
    "reason" TEXT,
    "lotId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mortality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LotPerformance" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "totalChicks" INTEGER NOT NULL,
    "mortalityCount" INTEGER NOT NULL,
    "totalFeedUsed" DECIMAL(12,2) NOT NULL,
    "totalMedicine" DECIMAL(12,2) NOT NULL,
    "totalExpenses" DECIMAL(14,2) NOT NULL,
    "totalSales" DECIMAL(14,2) NOT NULL,
    "avgWeight" DECIMAL(6,2),
    "fcr" DECIMAL(6,3),
    "profit" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LotPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FarmPerformance" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "totalLots" INTEGER NOT NULL,
    "totalChicks" INTEGER NOT NULL,
    "totalFeedUsed" DECIMAL(14,2) NOT NULL,
    "totalMedicine" DECIMAL(14,2) NOT NULL,
    "totalExpenses" DECIMAL(14,2) NOT NULL,
    "totalSales" DECIMAL(14,2) NOT NULL,
    "profit" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "public"."Address"("userId");

-- CreateIndex
CREATE INDEX "FarmLot_farmId_idx" ON "public"."FarmLot"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "FarmLot_farmId_lotNumber_key" ON "public"."FarmLot"("farmId", "lotNumber");

-- CreateIndex
CREATE INDEX "HatcherySupply_hatcheryId_idx" ON "public"."HatcherySupply"("hatcheryId");

-- CreateIndex
CREATE INDEX "HatcherySupply_farmId_idx" ON "public"."HatcherySupply"("farmId");

-- CreateIndex
CREATE INDEX "HatcherySupply_lotId_idx" ON "public"."HatcherySupply"("lotId");

-- CreateIndex
CREATE INDEX "InventoryPurchase_farmId_idx" ON "public"."InventoryPurchase"("farmId");

-- CreateIndex
CREATE INDEX "InventoryPurchase_dealerId_idx" ON "public"."InventoryPurchase"("dealerId");

-- CreateIndex
CREATE INDEX "InventoryPurchase_product_idx" ON "public"."InventoryPurchase"("product");

-- CreateIndex
CREATE INDEX "InventoryConsumption_lotId_idx" ON "public"."InventoryConsumption"("lotId");

-- CreateIndex
CREATE INDEX "InventoryConsumption_farmId_idx" ON "public"."InventoryConsumption"("farmId");

-- CreateIndex
CREATE INDEX "InventoryConsumption_product_idx" ON "public"."InventoryConsumption"("product");

-- CreateIndex
CREATE INDEX "InventoryConsumption_purchaseId_idx" ON "public"."InventoryConsumption"("purchaseId");

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "public"."Sale"("customerId");

-- CreateIndex
CREATE INDEX "Sale_lotId_idx" ON "public"."Sale"("lotId");

-- CreateIndex
CREATE INDEX "Sale_farmId_idx" ON "public"."Sale"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "LotPerformance_lotId_key" ON "public"."LotPerformance"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "FarmPerformance_farmId_key" ON "public"."FarmPerformance"("farmId");

-- AddForeignKey
ALTER TABLE "public"."Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Farm" ADD CONSTRAINT "Farm_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmLot" ADD CONSTRAINT "FarmLot_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Hatchery" ADD CONSTRAINT "Hatchery_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HatcherySupply" ADD CONSTRAINT "HatcherySupply_hatcheryId_fkey" FOREIGN KEY ("hatcheryId") REFERENCES "public"."Hatchery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HatcherySupply" ADD CONSTRAINT "HatcherySupply_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HatcherySupply" ADD CONSTRAINT "HatcherySupply_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "public"."FarmLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryPurchase" ADD CONSTRAINT "InventoryPurchase_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryPurchase" ADD CONSTRAINT "InventoryPurchase_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryConsumption" ADD CONSTRAINT "InventoryConsumption_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "public"."FarmLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryConsumption" ADD CONSTRAINT "InventoryConsumption_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryConsumption" ADD CONSTRAINT "InventoryConsumption_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "public"."InventoryPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "public"."FarmLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mortality" ADD CONSTRAINT "Mortality_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "public"."FarmLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mortality" ADD CONSTRAINT "Mortality_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LotPerformance" ADD CONSTRAINT "LotPerformance_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "public"."FarmLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmPerformance" ADD CONSTRAINT "FarmPerformance_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
