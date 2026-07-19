import bcrypt from "bcrypt";
import {
  HatcheryBatchExpenseType,
  HatcheryBatchStatus,
  HatcheryBatchType,
  HatcheryChickGrade,
  HatcheryChickTxnType,
  HatcheryEggTxnType,
  HatcheryIncubationLossType,
  HatcheryIncubationStage,
  HatcheryInventoryItemType,
  HatcheryInventoryTxnType,
  HatcheryPartyTxnType,
  HatcheryPurchaseCategory,
  HatcherySupplierTxnType,
  Prisma,
  UserRole,
  UserStatus,
} from "@prisma/client";
import prisma from "../utils/prisma";

const DEMO_HATCHERY_PHONE = "+9779803000001";
const DEMO_HATCHERY_PHONE_LEGACY = "9803000001";
const DEMO_HATCHERY_PASSWORD = "hatchery12345";
const DEMO_HATCHERY_NAME = "Demo Hatchery Works";

const dec = (value: number) => new Prisma.Decimal(value.toFixed(2));
const dec4 = (value: number) => new Prisma.Decimal(value.toFixed(4));

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const supplierSeeds = [
  { name: "NestPro Feed & Supply", category: HatcheryPurchaseCategory.FEED },
  { name: "Prime Hatch Medicine", category: HatcheryPurchaseCategory.MEDICINE },
  { name: "Golden Egg Traders", category: HatcheryPurchaseCategory.CHICKS },
  { name: "FeatherLine Supplies", category: HatcheryPurchaseCategory.OTHER },
  { name: "BroodCare Depot", category: HatcheryPurchaseCategory.FEED },
  { name: "Harvest Hatchery Supplies", category: HatcheryPurchaseCategory.MEDICINE },
  { name: "Pinnacle Feed Mart", category: HatcheryPurchaseCategory.FEED },
  { name: "Apex Poultry Health", category: HatcheryPurchaseCategory.MEDICINE },
  { name: "Sunrise Chicks Hub", category: HatcheryPurchaseCategory.CHICKS },
  { name: "Blue Valley Supplies", category: HatcheryPurchaseCategory.OTHER },
  { name: "Evergreen Biosecurity", category: HatcheryPurchaseCategory.MEDICINE },
  { name: "Orchid Farm Inputs", category: HatcheryPurchaseCategory.FEED },
  { name: "Riverbank Hatch Goods", category: HatcheryPurchaseCategory.OTHER },
  { name: "Silver Nest Essentials", category: HatcheryPurchaseCategory.CHICKS },
  { name: "Mountain Crest Poultry", category: HatcheryPurchaseCategory.FEED },
];

const eggTypeSeeds = [
  { name: "Hatchable Broiler Egg", isHatchable: true },
  { name: "Hatchable Layer Egg", isHatchable: true },
  { name: "Hatchable Parent Egg", isHatchable: true },
  { name: "Brown Egg", isHatchable: false },
  { name: "White Egg", isHatchable: false },
  { name: "XL Egg", isHatchable: false },
  { name: "Organic Egg", isHatchable: false },
  { name: "Premium Egg", isHatchable: false },
  { name: "Table Egg", isHatchable: false },
  { name: "Setter Egg", isHatchable: false },
  { name: "Hatcher Egg", isHatchable: false },
  { name: "Candle Reject Egg", isHatchable: false },
  { name: "Small Egg", isHatchable: false },
  { name: "Extra Large Egg", isHatchable: false },
  { name: "Regular Egg", isHatchable: false },
];

const inventorySeeds = [
  { name: "Starter Feed", itemType: HatcheryInventoryItemType.FEED, unit: "Bag", unitPrice: 3150, minStock: 30, supplierKey: "HATCHERY:FEED:STARTER" },
  { name: "Grower Feed", itemType: HatcheryInventoryItemType.FEED, unit: "Bag", unitPrice: 3320, minStock: 25, supplierKey: "HATCHERY:FEED:GROWER" },
  { name: "Layer Feed", itemType: HatcheryInventoryItemType.FEED, unit: "Bag", unitPrice: 3390, minStock: 20, supplierKey: "HATCHERY:FEED:LAYER" },
  { name: "Finisher Feed", itemType: HatcheryInventoryItemType.FEED, unit: "Bag", unitPrice: 3475, minStock: 20, supplierKey: "HATCHERY:FEED:FINISHER" },
  { name: "Vaccination Kit", itemType: HatcheryInventoryItemType.MEDICINE, unit: "Bottle", unitPrice: 860, minStock: 12, supplierKey: "HATCHERY:MED:VAX" },
  { name: "Antibiotic Pack", itemType: HatcheryInventoryItemType.MEDICINE, unit: "Strip", unitPrice: 420, minStock: 14, supplierKey: "HATCHERY:MED:ANTIBIOTIC" },
  { name: "Electrolyte Mix", itemType: HatcheryInventoryItemType.MEDICINE, unit: "Packet", unitPrice: 255, minStock: 16, supplierKey: "HATCHERY:MED:ELECTROLYTE" },
  { name: "Disinfectant", itemType: HatcheryInventoryItemType.MEDICINE, unit: "Bottle", unitPrice: 620, minStock: 10, supplierKey: "HATCHERY:MED:DISINFECTANT" },
  { name: "Broiler Chicks", itemType: HatcheryInventoryItemType.CHICKS, unit: "Birds", unitPrice: 98, minStock: 400, supplierKey: "HATCHERY:CHICKS:BROILER" },
  { name: "Layer Chicks", itemType: HatcheryInventoryItemType.CHICKS, unit: "Birds", unitPrice: 112, minStock: 350, supplierKey: "HATCHERY:CHICKS:LAYER" },
  { name: "Parent Stock Chicks", itemType: HatcheryInventoryItemType.CHICKS, unit: "Birds", unitPrice: 128, minStock: 250, supplierKey: "HATCHERY:CHICKS:PARENT" },
  { name: "Replacement Pullets", itemType: HatcheryInventoryItemType.CHICKS, unit: "Birds", unitPrice: 118, minStock: 240, supplierKey: "HATCHERY:CHICKS:PULLETS" },
  { name: "Egg Trays", itemType: HatcheryInventoryItemType.OTHER, unit: "PCS", unitPrice: 52, minStock: 120, supplierKey: "HATCHERY:OTHER:TRAYS" },
  { name: "Brooding Lamps", itemType: HatcheryInventoryItemType.OTHER, unit: "PCS", unitPrice: 1240, minStock: 8, supplierKey: "HATCHERY:OTHER:LAMPS" },
  { name: "Feed Scoops", itemType: HatcheryInventoryItemType.OTHER, unit: "PCS", unitPrice: 145, minStock: 60, supplierKey: "HATCHERY:OTHER:SCOOPS" },
];

const partySeeds = [
  { name: "Metro Hatch Traders", phone: "+9779821000001", address: "Pokhara-8, Kaski", openingBalance: 11800 },
  { name: "Valley Chick House", phone: "+9779821000002", address: "Pokhara-6, Kaski", openingBalance: 0 },
  { name: "Sunrise Hatch Outlet", phone: "+9779821000003", address: "Butwal-10, Rupandehi", openingBalance: 2600 },
  { name: "Golden Nest Buyers", phone: "+9779821000004", address: "Chitwan", openingBalance: 0 },
  { name: "Blue Ridge Poultry", phone: "+9779821000005", address: "Bhaktapur", openingBalance: 5200 },
  { name: "Evergreen Hatch Mart", phone: "+9779821000006", address: "Lalitpur", openingBalance: 0 },
  { name: "Riverbank Buyers", phone: "+9779821000007", address: "Nuwakot", openingBalance: 1500 },
  { name: "Silver Hatch House", phone: "+9779821000008", address: "Dharan", openingBalance: 0 },
  { name: "Mountain Layer Market", phone: "+9779821000009", address: "Hetauda", openingBalance: 7300 },
  { name: "Orchid Poultry Desk", phone: "+9779821000010", address: "Biratnagar", openingBalance: 0 },
  { name: "Crest Poultry Hub", phone: "+9779821000011", address: "Nepalgunj", openingBalance: 1800 },
  { name: "Pinnacle Hatch Trade", phone: "+9779821000012", address: "Janakpur", openingBalance: 0 },
  { name: "Amber Egg & Chick", phone: "+9779821000013", address: "Birgunj", openingBalance: 4100 },
  { name: "NorthStar Buyers", phone: "+9779821000014", address: "Damauli", openingBalance: 0 },
  { name: "Harbor Poultry Sales", phone: "+9779821000015", address: "Bharatpur", openingBalance: 2900 },
];

const buildQty = (base: number, step: number, index: number) => base + index * step;

async function cleanupExistingDemoUser(phoneList: string[]) {
  const existing = await prisma.user.findFirst({
    where: { phone: { in: phoneList } },
    select: { id: true },
  });

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.hatcheryPartyPayment.deleteMany({
        where: { party: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryPartyTxn.deleteMany({
        where: { party: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryChickSale.deleteMany({
        where: { incubationBatch: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryChickTxn.deleteMany({
        where: { incubationBatch: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryChickStock.deleteMany({
        where: { incubationBatch: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryHatchResult.deleteMany({
        where: { incubationBatch: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryIncubationLoss.deleteMany({
        where: { incubationBatch: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryEggMove.deleteMany({
        where: { incubationBatch: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryIncubationBatch.deleteMany({
        where: { hatcheryOwnerId: existing.id },
      });
      await tx.hatcheryParentSale.deleteMany({
        where: { batch: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryEggSale.deleteMany({
        where: { batch: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryEggTxn.deleteMany({
        where: { batch: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryEggStock.deleteMany({
        where: { batch: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryEggProductionLine.deleteMany({
        where: { production: { batch: { hatcheryOwnerId: existing.id } } },
      });
      await tx.hatcheryEggProduction.deleteMany({
        where: { batch: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryBatchExpense.deleteMany({
        where: { batch: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryBatchMortality.deleteMany({
        where: { batch: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryBatchPlacement.deleteMany({
        where: { batch: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryBatch.deleteMany({
        where: { hatcheryOwnerId: existing.id },
      });
      await tx.hatcheryInventoryTxn.deleteMany({
        where: { item: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryBatchPlacement.deleteMany({
        where: { inventoryItem: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryBatchExpense.deleteMany({
        where: { inventoryItem: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryChickSale.deleteMany({
        where: { inventoryItem: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcheryInventoryItem.deleteMany({
        where: { hatcheryOwnerId: existing.id },
      });
      await tx.hatcherySupplierPurchaseItem.deleteMany({
        where: { txn: { supplier: { hatcheryOwnerId: existing.id } } },
      });
      await tx.hatcherySupplierTxn.deleteMany({
        where: { supplier: { hatcheryOwnerId: existing.id } },
      });
      await tx.hatcherySupplier.deleteMany({
        where: { hatcheryOwnerId: existing.id },
      });
      await tx.hatcheryEggType.deleteMany({
        where: { hatcheryOwnerId: existing.id },
      });
      await tx.hatcheryParty.deleteMany({
        where: { hatcheryOwnerId: existing.id },
      });
      await tx.hatcheryBusiness.deleteMany({
        where: { ownerId: existing.id },
      });
      await tx.user.delete({ where: { id: existing.id } });
    });
  }
}

async function seedHatcheryDemoData() {
  console.log("Seeding demo hatchery data...");

  await cleanupExistingDemoUser([DEMO_HATCHERY_PHONE, DEMO_HATCHERY_PHONE_LEGACY]);

  const passwordHash = await bcrypt.hash(DEMO_HATCHERY_PASSWORD, 12);
  const owner = await prisma.user.create({
    data: {
      phone: DEMO_HATCHERY_PHONE,
      name: "Demo Hatchery Owner",
      password: passwordHash,
      role: UserRole.HATCHERY,
      status: UserStatus.ACTIVE,
      companyName: DEMO_HATCHERY_NAME,
      CompanyFarmLocation: "Kathmandu, Bagmati",
    },
  });

  await prisma.hatcheryBusiness.create({
    data: {
      name: DEMO_HATCHERY_NAME,
      contact: DEMO_HATCHERY_PHONE,
      address: "Kathmandu, Bagmati",
      ownerId: owner.id,
    },
  });

  const eggTypes = [];
  for (const eggTypeSeed of eggTypeSeeds) {
    eggTypes.push(
      await prisma.hatcheryEggType.create({
        data: {
          hatcheryOwnerId: owner.id,
          name: eggTypeSeed.name,
          isHatchable: eggTypeSeed.isHatchable,
        },
      })
    );
  }
  const hatchableEggTypes = eggTypes.filter((t) => t.isHatchable);

  const inventoryItems = [];
  for (const [index, itemSeed] of inventorySeeds.entries()) {
    inventoryItems.push(
      await prisma.hatcheryInventoryItem.create({
        data: {
          hatcheryOwnerId: owner.id,
          itemType: itemSeed.itemType,
          name: itemSeed.name,
          unit: itemSeed.unit,
          unitPrice: dec(itemSeed.unitPrice),
          effectiveUnitCost: dec(itemSeed.unitPrice),
          supplierKey: itemSeed.supplierKey,
          currentStock: dec(0),
          minStock: dec(itemSeed.minStock),
        },
      })
    );

    void index;
  }

  const inventoryByType = {
    FEED: inventoryItems.filter((item) => item.itemType === HatcheryInventoryItemType.FEED),
    MEDICINE: inventoryItems.filter((item) => item.itemType === HatcheryInventoryItemType.MEDICINE),
    CHICKS: inventoryItems.filter((item) => item.itemType === HatcheryInventoryItemType.CHICKS),
    OTHER: inventoryItems.filter((item) => item.itemType === HatcheryInventoryItemType.OTHER),
  };

  const partyMap = new Map<string, { id: string; balance: number }>();
  for (const partySeed of partySeeds) {
    const party = await prisma.hatcheryParty.create({
      data: {
        hatcheryOwnerId: owner.id,
        name: partySeed.name,
        phone: partySeed.phone,
        address: partySeed.address,
        openingBalance: dec(partySeed.openingBalance),
        balance: dec(partySeed.openingBalance),
      },
      select: { id: true },
    });
    partyMap.set(party.id, { id: party.id, balance: partySeed.openingBalance });
    if (partySeed.openingBalance !== 0) {
      await prisma.hatcheryPartyTxn.create({
        data: {
          partyId: party.id,
          type: HatcheryPartyTxnType.OPENING_BALANCE,
          date: daysAgo(45),
          amount: dec(partySeed.openingBalance),
          balanceAfter: dec(partySeed.openingBalance),
          sourceType: "OPENING_BALANCE",
          note: "Demo opening balance",
        },
      });
    }
  }

  const supplierMap = new Map<string, { id: string; balance: number }>();
  for (const [index, supplierSeed] of supplierSeeds.entries()) {
    const supplier = await prisma.hatcherySupplier.create({
      data: {
        hatcheryOwnerId: owner.id,
        name: supplierSeed.name,
        contact: `+9779830${String(index + 1).padStart(4, "0")}`,
        address: ["Kathmandu", "Lalitpur", "Bhaktapur", "Chitwan", "Pokhara", "Biratnagar", "Butwal", "Hetauda", "Dharan", "Nepalgunj", "Janakpur", "Bharatpur", "Damak", "Damauli", "Kirtipur"][index],
        openingBalance: dec(6500 + index * 850),
        balance: dec(6500 + index * 850),
      },
      select: { id: true },
    });

    const openingBalance = 6500 + index * 850;
    supplierMap.set(supplier.id, { id: supplier.id, balance: openingBalance });

    await prisma.hatcherySupplierTxn.create({
      data: {
        supplierId: supplier.id,
        type: HatcherySupplierTxnType.OPENING_BALANCE,
        amount: dec(openingBalance),
        balanceAfter: dec(openingBalance),
        date: daysAgo(60 - index),
        note: "Demo opening balance",
        reference: `${supplierSeed.name.slice(0, 3).toUpperCase()}-OPEN`,
      },
    });

    for (let p = 0; p < 4; p += 1) {
      const purchaseCategory = [HatcheryPurchaseCategory.FEED, HatcheryPurchaseCategory.MEDICINE, HatcheryPurchaseCategory.CHICKS, HatcheryPurchaseCategory.OTHER][(index + p) % 4];
      const itemSeed =
        purchaseCategory === HatcheryPurchaseCategory.FEED
          ? inventoryByType.FEED[(index + p) % inventoryByType.FEED.length]
          : purchaseCategory === HatcheryPurchaseCategory.MEDICINE
            ? inventoryByType.MEDICINE[(index + p) % inventoryByType.MEDICINE.length]
            : purchaseCategory === HatcheryPurchaseCategory.CHICKS
              ? inventoryByType.CHICKS[(index + p) % inventoryByType.CHICKS.length]
              : inventoryByType.OTHER[(index + p) % inventoryByType.OTHER.length];

      const quantity = purchaseCategory === HatcheryPurchaseCategory.CHICKS ? buildQty(450, 35, p) : buildQty(12, 2, p);
      const freeQuantity = purchaseCategory === HatcheryPurchaseCategory.CHICKS ? 25 + index : p % 3 === 0 ? 1 : 0;
      const unitPrice = Number(itemSeed.unitPrice);
      const amount = quantity * unitPrice;
      const balance = (supplierMap.get(supplier.id)?.balance ?? 0) + amount;

      const txn = await prisma.hatcherySupplierTxn.create({
        data: {
          supplierId: supplier.id,
          type: HatcherySupplierTxnType.PURCHASE,
          amount: dec(amount),
          balanceAfter: dec(balance),
          date: daysAgo(35 - index - p * 3),
          note: `${supplierSeed.name} purchase ${p + 1}`,
          purchaseCategory,
          reference: `${supplierSeed.name.slice(0, 3).toUpperCase()}-PUR-${p + 1}`,
        },
      });

      await prisma.hatcherySupplierPurchaseItem.create({
        data: {
          txnId: txn.id,
          itemName: `${itemSeed.name} lot ${p + 1}`,
          quantity: dec4(quantity),
          freeQuantity: dec4(freeQuantity),
          unit: itemSeed.unit,
          unitPrice: dec4(unitPrice),
          totalAmount: dec(amount),
        },
      });

      await prisma.hatcheryInventoryTxn.create({
        data: {
          itemId: itemSeed.id,
          type: HatcheryInventoryTxnType.PURCHASE,
          quantity: dec4(quantity + freeQuantity),
          unitPrice: dec4(unitPrice),
          amount: dec(amount),
          date: daysAgo(35 - index - p * 3),
          note: `${supplierSeed.name} stock`,
          sourceSupplierTxnId: txn.id,
        },
      });

      await prisma.hatcheryInventoryItem.update({
        where: { id: itemSeed.id },
        data: { currentStock: { increment: dec4(quantity + freeQuantity) } },
      });
      supplierMap.set(supplier.id, { id: supplier.id, balance });
    }

    for (let pay = 0; pay < 3; pay += 1) {
      const payment = 8000 + index * 700 + pay * 900;
      const balance = (supplierMap.get(supplier.id)?.balance ?? 0) - payment;
      await prisma.hatcherySupplierTxn.create({
        data: {
          supplierId: supplier.id,
          type: HatcherySupplierTxnType.PAYMENT,
          amount: dec(payment),
          balanceAfter: dec(balance),
          date: daysAgo(16 - index - pay * 2),
          note: `${supplierSeed.name} payment ${pay + 1}`,
          reference: `${supplierSeed.name.slice(0, 3).toUpperCase()}-PAY-${pay + 1}`,
        },
      });
      supplierMap.set(supplier.id, { id: supplier.id, balance });
    }

    await prisma.hatcherySupplier.update({
      where: { id: supplier.id },
      data: { balance: dec(supplierMap.get(supplier.id)?.balance ?? 0) },
    });
  }

  const parentBatchIds: string[] = [];
  for (let i = 0; i < 15; i += 1) {
    const batch = await prisma.hatcheryBatch.create({
      data: {
        hatcheryOwnerId: owner.id,
        type: HatcheryBatchType.PARENT_FLOCK,
        status: i % 4 === 0 ? HatcheryBatchStatus.CLOSED : HatcheryBatchStatus.ACTIVE,
        code: `HB-PF-${String(i + 1).padStart(3, "0")}`,
        name: `Parent Batch ${i + 1}`,
        startDate: daysAgo(45 + i * 2),
        endDate: i % 4 === 0 ? daysAgo(5 + i) : null,
        notes: `Demo parent batch ${i + 1}`,
        initialParents: 1400 + i * 55,
        currentParents: 1400 + i * 55,
        placedAt: daysAgo(44 + i * 2),
      },
    });
    parentBatchIds.push(batch.id);

    const chickItemA = inventoryByType.CHICKS[i % inventoryByType.CHICKS.length];
    const chickItemB = inventoryByType.CHICKS[(i + 1) % inventoryByType.CHICKS.length];
    await prisma.hatcheryBatchPlacement.createMany({
      data: [
        { batchId: batch.id, inventoryItemId: chickItemA.id, quantity: 180 + i * 6 },
        { batchId: batch.id, inventoryItemId: chickItemB.id, quantity: 150 + i * 5 },
      ],
    });

    await prisma.hatcheryBatchMortality.createMany({
      data: [
        { batchId: batch.id, date: daysAgo(22 - i), count: 7 + (i % 4), note: "Daily mortality" },
        { batchId: batch.id, date: daysAgo(18 - i), count: 4 + (i % 3), note: "Heat stress mortality" },
      ],
    });

    const feedItem = inventoryByType.FEED[i % inventoryByType.FEED.length];
    const medItem = inventoryByType.MEDICINE[i % inventoryByType.MEDICINE.length];
    const feedAmount = (16 + i * 2) * Number(feedItem.unitPrice);
    const medAmount = (7 + (i % 4)) * Number(medItem.unitPrice);
    const feedTxn = await prisma.hatcheryInventoryTxn.create({
      data: {
        itemId: feedItem.id,
        type: HatcheryInventoryTxnType.USAGE,
        quantity: dec4(16 + i * 2),
        unitPrice: feedItem.unitPrice,
        amount: dec(feedAmount),
        date: daysAgo(20 - i),
        note: `Batch expense for ${batch.code}`,
      },
    });
    const medTxn = await prisma.hatcheryInventoryTxn.create({
      data: {
        itemId: medItem.id,
        type: HatcheryInventoryTxnType.USAGE,
        quantity: dec4(7 + (i % 4)),
        unitPrice: medItem.unitPrice,
        amount: dec(medAmount),
        date: daysAgo(19 - i),
        note: `Batch expense for ${batch.code}`,
      },
    });

    await prisma.hatcheryBatchExpense.createMany({
      data: [
        {
          batchId: batch.id,
          date: daysAgo(20 - i),
          type: HatcheryBatchExpenseType.INVENTORY,
          category: "feed",
          itemName: feedItem.name,
          quantity: dec4(16 + i * 2),
          unit: feedItem.unit,
          unitPrice: feedItem.unitPrice,
          amount: dec(feedAmount),
          note: `Feed for ${batch.code}`,
          inventoryItemId: feedItem.id,
          inventoryTxnId: feedTxn.id,
        },
        {
          batchId: batch.id,
          date: daysAgo(19 - i),
          type: HatcheryBatchExpenseType.INVENTORY,
          category: "medicine",
          itemName: medItem.name,
          quantity: dec4(7 + (i % 4)),
          unit: medItem.unit,
          unitPrice: medItem.unitPrice,
          amount: dec(medAmount),
          note: `Medicine for ${batch.code}`,
          inventoryItemId: medItem.id,
          inventoryTxnId: medTxn.id,
        },
        {
          batchId: batch.id,
          date: daysAgo(17 - i),
          type: HatcheryBatchExpenseType.MANUAL,
          category: "labor",
          itemName: "Labor",
          amount: dec(5200 + i * 130),
          note: `Labor for ${batch.code}`,
        },
      ],
    });

    for (let p = 0; p < 2; p += 1) {
      const production = await prisma.hatcheryEggProduction.create({
        data: {
          batchId: batch.id,
          date: daysAgo(24 - i - p),
          note: `Production ${p + 1} for ${batch.code}`,
        },
      });

      const lines = [
        { eggTypeId: eggTypes[(i + p) % eggTypes.length].id, count: 650 + i * 20 + p * 40 },
        { eggTypeId: eggTypes[(i + p + 3) % eggTypes.length].id, count: 420 + i * 14 + p * 22 },
        { eggTypeId: eggTypes[(i + p + 6) % eggTypes.length].id, count: 180 + i * 8 + p * 12 },
      ];

      for (const line of lines) {
        await prisma.hatcheryEggProductionLine.create({
          data: {
            productionId: production.id,
            eggTypeId: line.eggTypeId,
            count: line.count,
          },
        });
        await prisma.hatcheryEggTxn.create({
          data: {
            batchId: batch.id,
            eggTypeId: line.eggTypeId,
            type: HatcheryEggTxnType.PRODUCTION,
            count: line.count,
            date: daysAgo(24 - i - p),
            sourceId: production.id,
            note: `Production ${p + 1} for ${batch.code}`,
          },
        });
        await prisma.hatcheryEggStock.upsert({
          where: { batchId_eggTypeId: { batchId: batch.id, eggTypeId: line.eggTypeId } },
          create: { batchId: batch.id, eggTypeId: line.eggTypeId, currentStock: line.count },
          update: { currentStock: { increment: line.count } },
        });
      }
    }

    const saleParty = partySeeds[i % partySeeds.length];
    const eggSaleParty = await prisma.hatcheryParty.findUnique({
      where: { hatcheryOwnerId_phone: { hatcheryOwnerId: owner.id, phone: saleParty.phone } },
      select: { id: true },
    });

    if (eggSaleParty) {
      const eggType = hatchableEggTypes[i % hatchableEggTypes.length];
      const eggSaleCount = 120 + i * 6;
      const eggSaleAmount = eggSaleCount * (6.1 + i * 0.08);
      await prisma.hatcheryEggSale.create({
        data: {
          batchId: batch.id,
          eggTypeId: eggType.id,
          date: daysAgo(10 - i),
          count: eggSaleCount,
          unitPrice: dec4(6.1 + i * 0.08),
          amount: dec(eggSaleAmount),
          partyId: eggSaleParty.id,
          note: `Egg sale for ${batch.code}`,
        },
      });
      await prisma.hatcheryEggTxn.create({
        data: {
          batchId: batch.id,
          eggTypeId: eggType.id,
          type: HatcheryEggTxnType.SALE,
          count: eggSaleCount,
          date: daysAgo(10 - i),
          sourceId: `${batch.code}:egg-sale`,
          note: `Egg sale for ${batch.code}`,
        },
      });
      const existingStock = await prisma.hatcheryEggStock.findUnique({
        where: { batchId_eggTypeId: { batchId: batch.id, eggTypeId: eggType.id } },
        select: { id: true },
      });
      if (existingStock) {
        await prisma.hatcheryEggStock.update({
          where: { id: existingStock.id },
          data: { currentStock: { decrement: eggSaleCount } },
        });
      } else {
        await prisma.hatcheryEggStock.create({
          data: {
            batchId: batch.id,
            eggTypeId: eggType.id,
            currentStock: 0,
          },
        });
      }
      const party = partyMap.get(eggSaleParty.id);
      if (party) {
        const balance = party.balance + eggSaleAmount;
        party.balance = balance;
        await prisma.hatcheryPartyTxn.create({
          data: {
            partyId: eggSaleParty.id,
            type: HatcheryPartyTxnType.SALE,
            date: daysAgo(10 - i),
            amount: dec(eggSaleAmount),
            balanceAfter: dec(balance),
            sourceType: "EGG_SALE",
            sourceId: batch.id,
            note: `Egg sale ${batch.code}`,
          },
        });
        await prisma.hatcheryParty.update({
          where: { id: eggSaleParty.id },
          data: { balance: dec(balance) },
        });
      }
    }

    if (i % 3 === 0) {
      const parentSaleParty = await prisma.hatcheryParty.findUnique({
        where: { hatcheryOwnerId_phone: { hatcheryOwnerId: owner.id, phone: partySeeds[(i + 4) % partySeeds.length].phone } },
        select: { id: true },
      });
      if (parentSaleParty) {
        const parentSaleCount = 12 + i * 2;
        const amount = (42 + i * 1.4) * (185 + i * 3);
        await prisma.hatcheryParentSale.create({
          data: {
            batchId: batch.id,
            date: daysAgo(8 - i),
            count: parentSaleCount,
            totalWeightKg: dec4(42 + i * 1.4),
            avgWeightKg: dec4((42 + i * 1.4) / parentSaleCount),
            ratePerKg: dec4(185 + i * 3),
            amount: dec(amount),
            partyId: parentSaleParty.id,
            note: `Parent sale for ${batch.code}`,
          },
        });
      }
    }
  }

  for (let i = 0; i < 15; i += 1) {
    const parentBatchId = parentBatchIds[i % parentBatchIds.length];
    const hatchableEggType = hatchableEggTypes[i % hatchableEggTypes.length];
    const eggsSetCount = 920 + i * 35;
    const infertile = 20 + (i % 5) * 3;
    const earlyDead = 10 + (i % 4) * 2;
    const lateDead = 6 + (i % 3);
    const fertile = eggsSetCount - infertile;
    const hatchedA = Math.floor(fertile * 0.55);
    const hatchedB = Math.floor(fertile * 0.25);
    const cull = Math.floor(fertile * 0.08);
    const unhatched = Math.max(0, fertile - hatchedA - hatchedB - cull - lateDead);

    const incubation = await prisma.hatcheryIncubationBatch.create({
      data: {
        hatcheryOwnerId: owner.id,
        parentBatchId,
        hatchableEggTypeId: hatchableEggType.id,
        stage: [HatcheryIncubationStage.SETTER, HatcheryIncubationStage.CANDLING, HatcheryIncubationStage.HATCHER, HatcheryIncubationStage.COMPLETED][i % 4],
        code: `HB-INC-${String(i + 1).padStart(3, "0")}`,
        name: `Incubation ${i + 1}`,
        startDate: daysAgo(28 - i),
        eggsSetCount,
        setterAt: daysAgo(27 - i),
        candledAt: i % 4 === 0 ? null : daysAgo(20 - i),
        transferredAt: i % 4 <= 1 ? null : daysAgo(14 - i),
        hatchedAt: i % 4 === 3 ? daysAgo(6 - i) : null,
        notes: `Demo incubation ${i + 1}`,
      },
    });

    await prisma.hatcheryEggMove.create({
      data: {
        incubationBatchId: incubation.id,
        parentBatchId,
        eggTypeId: hatchableEggType.id,
        count: eggsSetCount,
        date: daysAgo(28 - i),
      },
    });
    await prisma.hatcheryIncubationLoss.createMany({
      data: [
        { incubationBatchId: incubation.id, type: HatcheryIncubationLossType.INFERTILE, date: daysAgo(21 - i), count: infertile, note: "Candling infertile eggs" },
        { incubationBatchId: incubation.id, type: HatcheryIncubationLossType.EARLY_DEAD, date: daysAgo(18 - i), count: earlyDead, note: "Early mortality" },
        { incubationBatchId: incubation.id, type: HatcheryIncubationLossType.LATE_DEAD, date: daysAgo(7 - i), count: lateDead, note: "Late mortality" },
      ],
    });

    await prisma.hatcheryHatchResult.create({
      data: {
        incubationBatchId: incubation.id,
        date: daysAgo(6 - i),
        hatchedA,
        hatchedB,
        cull,
        lateDead,
        unhatched,
        note: `Hatch result ${i + 1}`,
      },
    });

    await prisma.hatcheryChickStock.createMany({
      data: [
        { incubationBatchId: incubation.id, grade: HatcheryChickGrade.A, currentStock: hatchedA },
        { incubationBatchId: incubation.id, grade: HatcheryChickGrade.B, currentStock: hatchedB },
        { incubationBatchId: incubation.id, grade: HatcheryChickGrade.CULL, currentStock: cull },
      ],
    });
    await prisma.hatcheryChickTxn.createMany({
      data: [
        { incubationBatchId: incubation.id, grade: HatcheryChickGrade.A, type: HatcheryChickTxnType.PRODUCTION, count: hatchedA, date: daysAgo(6 - i), sourceId: incubation.id, note: "A-grade production" },
        { incubationBatchId: incubation.id, grade: HatcheryChickGrade.B, type: HatcheryChickTxnType.PRODUCTION, count: hatchedB, date: daysAgo(6 - i), sourceId: incubation.id, note: "B-grade production" },
        { incubationBatchId: incubation.id, grade: HatcheryChickGrade.CULL, type: HatcheryChickTxnType.PRODUCTION, count: cull, date: daysAgo(6 - i), sourceId: incubation.id, note: "Cull production" },
      ],
    });

    const saleParty = await prisma.hatcheryParty.findUnique({
      where: { hatcheryOwnerId_phone: { hatcheryOwnerId: owner.id, phone: partySeeds[(i + 2) % partySeeds.length].phone } },
      select: { id: true },
    });
    const chickInventoryItem = inventoryByType.CHICKS[i % inventoryByType.CHICKS.length];
    const saleRows = [
      { grade: HatcheryChickGrade.A, count: Math.max(20, Math.min(hatchedA - 15, 70 + i * 2)), price: 96 + i * 1.5 },
      { grade: HatcheryChickGrade.B, count: Math.max(10, Math.min(hatchedB - 8, 35 + i)), price: 72 + i * 1.1 },
    ];
    for (const [saleIndex, sale] of saleRows.entries()) {
      if (!saleParty) continue;
      const amount = sale.count * sale.price;
      await prisma.hatcheryChickSale.create({
        data: {
          incubationBatchId: incubation.id,
          grade: sale.grade,
          date: daysAgo(3 - i + saleIndex),
          count: sale.count,
          unitPrice: dec4(sale.price),
          amount: dec(amount),
          partyId: saleParty.id,
          note: `Chick sale ${sale.grade} for incubation ${i + 1}`,
          inventoryItemId: chickInventoryItem.id,
        },
      });
      await prisma.hatcheryChickTxn.create({
        data: {
          incubationBatchId: incubation.id,
          grade: sale.grade,
          type: HatcheryChickTxnType.SALE,
          count: sale.count,
          date: daysAgo(3 - i + saleIndex),
          sourceId: `${incubation.id}:sale:${sale.grade}`,
          note: `Chick sale ${sale.grade}`,
        },
      });
      await prisma.hatcheryPartyTxn.create({
        data: {
          partyId: saleParty.id,
          type: HatcheryPartyTxnType.SALE,
          date: daysAgo(3 - i + saleIndex),
          amount: dec(amount),
          balanceAfter: dec((partyMap.get(saleParty.id)?.balance ?? 0) + amount),
          sourceType: "CHICK_SALE",
          sourceId: incubation.id,
          note: `Chick sale ${incubation.id}`,
        },
      });
      await prisma.hatcheryParty.update({
        where: { id: saleParty.id },
        data: { balance: { increment: dec(amount) } },
      });
      await prisma.hatcheryInventoryTxn.create({
        data: {
          itemId: chickInventoryItem.id,
          type: HatcheryInventoryTxnType.USAGE,
          quantity: dec4(sale.count),
          unitPrice: dec4(sale.price),
          amount: dec(amount),
          date: daysAgo(3 - i + saleIndex),
          note: `Chick sale usage ${incubation.id}`,
        },
      });
    }
  }

  console.log("Demo hatchery seed complete.");
  console.log({
    hatcheryPhone: DEMO_HATCHERY_PHONE,
    hatcheryPassword: DEMO_HATCHERY_PASSWORD,
    suppliers: supplierSeeds.length,
    inventoryItems: inventorySeeds.length,
    eggTypes: eggTypeSeeds.length,
    parties: partySeeds.length,
    batches: 15,
    incubations: 15,
  });
}

seedHatcheryDemoData()
  .catch((error) => {
    console.error("Demo hatchery seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
