import bcrypt from "bcrypt";
import {
  BatchStatus,
  BatchType,
  CategoryType,
  InventoryItemType,
  PurchaseCategory,
  Prisma,
  SalesItemType,
  TransactionType,
  UserRole,
  UserStatus,
} from "@prisma/client";
import prisma from "../utils/prisma";

const DEMO_OWNER_PHONE = "+9779800000001";
const DEMO_OWNER_PHONE_LEGACY = "9800000001";
const DEMO_OWNER_PASSWORD = "demo12345";

const FARM_NAMES = [
  "Sunrise Poultry Farm",
  "Green Valley Farm",
  "Hillside Hatch Farm",
  "Golden Egg Farm",
  "Riverbend Poultry",
  "Silver Leaf Farm",
  "Evergreen Layers",
  "Mountain View Farm",
  "Blue Sky Poultry",
  "Harvest Nest Farm",
  "Lakeside Broilers",
  "Prairie Pulse Farm",
];

const SUPPLIER_LEDGER_SEEDS = [
  {
    name: "Alpha Feed Depot",
    contact: "+9779801000001",
    address: "Kalanki, Kathmandu",
    openingBalance: 18000,
    purchases: [
      {
        itemName: "Starter Feed",
        purchaseCategory: PurchaseCategory.FEED,
        quantity: 24,
        freeQuantity: 2,
        unit: "Bag",
        unitPrice: 3200,
        amount: 76800,
        date: 34,
        description: "Starter feed purchase for broiler cycle",
        reference: "FD-1001",
      },
      {
        itemName: "Grower Feed",
        purchaseCategory: PurchaseCategory.FEED,
        quantity: 20,
        freeQuantity: 0,
        unit: "Bag",
        unitPrice: 3350,
        amount: 67000,
        date: 27,
        description: "Grower feed top-up",
        reference: "FD-1008",
      },
      {
        itemName: "Broiler Finisher",
        purchaseCategory: PurchaseCategory.FEED,
        quantity: 18,
        freeQuantity: 1,
        unit: "Bag",
        unitPrice: 3525,
        amount: 63450,
        date: 20,
        description: "Broiler finisher stock",
        reference: "FD-1016",
      },
      {
        itemName: "Mineral Mix",
        purchaseCategory: PurchaseCategory.OTHER,
        quantity: 12,
        freeQuantity: 0,
        unit: "Packet",
        unitPrice: 850,
        amount: 10200,
        date: 14,
        description: "Mineral supplement for feed",
        reference: "FD-1021",
      },
      {
        itemName: "Layer Feed",
        purchaseCategory: PurchaseCategory.FEED,
        quantity: 16,
        freeQuantity: 0,
        unit: "Bag",
        unitPrice: 3380,
        amount: 54080,
        date: 9,
        description: "Layer feed replenishment",
        reference: "FD-1029",
      },
      {
        itemName: "Starter Feed",
        purchaseCategory: PurchaseCategory.FEED,
        quantity: 14,
        freeQuantity: 0,
        unit: "Bag",
        unitPrice: 3240,
        amount: 45360,
        date: 4,
        description: "Emergency starter feed refill",
        reference: "FD-1036",
      },
    ],
    payments: [
      { amount: 60000, date: 22, description: "Partial settlement", reference: "RCPT-FD-201", purchaseIndex: 0 },
      { amount: 25000, date: 12, description: "Mid-cycle payment", reference: "RCPT-FD-202", purchaseIndex: 2 },
      { amount: 18000, date: 2, description: "Cash payment", reference: "RCPT-FD-203" },
    ],
  },
  {
    name: "Prime Medicine Supplies",
    contact: "+9779801000002",
    address: "Baneshwor, Kathmandu",
    openingBalance: 12000,
    purchases: [
      {
        itemName: "Vaccination Kit",
        purchaseCategory: PurchaseCategory.MEDICINE,
        quantity: 6,
        freeQuantity: 0,
        unit: "Bottle",
        unitPrice: 850,
        amount: 5100,
        date: 33,
        description: "Vaccination kit supply",
        reference: "MD-2001",
        expiryDate: 180,
      },
      {
        itemName: "Antibiotic Pack",
        purchaseCategory: PurchaseCategory.MEDICINE,
        quantity: 10,
        freeQuantity: 1,
        unit: "Strip",
        unitPrice: 420,
        amount: 4200,
        date: 25,
        description: "Antibiotic strips with free unit",
        reference: "MD-2007",
        expiryDate: 140,
      },
      {
        itemName: "Electrolyte Mix",
        purchaseCategory: PurchaseCategory.MEDICINE,
        quantity: 14,
        freeQuantity: 0,
        unit: "Packet",
        unitPrice: 260,
        amount: 3640,
        date: 18,
        description: "Heat-stress support",
        reference: "MD-2015",
        expiryDate: 120,
      },
      {
        itemName: "Vitamin Pack",
        purchaseCategory: PurchaseCategory.MEDICINE,
        quantity: 12,
        freeQuantity: 0,
        unit: "Bottle",
        unitPrice: 390,
        amount: 4680,
        date: 13,
        description: "Vitamin support purchase",
        reference: "MD-2020",
        expiryDate: 90,
      },
      {
        itemName: "Disinfectant",
        purchaseCategory: PurchaseCategory.MEDICINE,
        quantity: 8,
        freeQuantity: 0,
        unit: "Bottle",
        unitPrice: 620,
        amount: 4960,
        date: 8,
        description: "Farm sanitation stock",
        reference: "MD-2028",
        expiryDate: 210,
      },
      {
        itemName: "Vaccine Booster",
        purchaseCategory: PurchaseCategory.MEDICINE,
        quantity: 7,
        freeQuantity: 0,
        unit: "Bottle",
        unitPrice: 910,
        amount: 6370,
        date: 3,
        description: "Booster round",
        reference: "MD-2034",
        expiryDate: 170,
      },
    ],
    payments: [
      { amount: 7000, date: 21, description: "Cheque payment", reference: "PMT-MD-301", purchaseIndex: 0 },
      { amount: 8500, date: 10, description: "Online transfer", reference: "PMT-MD-302", purchaseIndex: 3 },
      { amount: 5000, date: 1, description: "Final settlement", reference: "PMT-MD-303" },
    ],
  },
  {
    name: "ChickLink Hatchery Supplier",
    contact: "+9779801000003",
    address: "Tokha, Kathmandu",
    openingBalance: 15000,
    purchases: [
      {
        itemName: "Broiler Chicks",
        purchaseCategory: PurchaseCategory.CHICKS,
        quantity: 1200,
        freeQuantity: 50,
        unit: "Birds",
        unitPrice: 95,
        amount: 114000,
        date: 31,
        description: "Broiler chicks lot 1",
        reference: "CH-3001",
      },
      {
        itemName: "Broiler Chicks",
        purchaseCategory: PurchaseCategory.CHICKS,
        quantity: 1000,
        freeQuantity: 25,
        unit: "Birds",
        unitPrice: 97,
        amount: 97000,
        date: 23,
        description: "Broiler chicks lot 2",
        reference: "CH-3008",
      },
      {
        itemName: "Layer Chicks",
        purchaseCategory: PurchaseCategory.CHICKS,
        quantity: 800,
        freeQuantity: 40,
        unit: "Birds",
        unitPrice: 110,
        amount: 88000,
        date: 16,
        description: "Layer chicks lot 1",
        reference: "CH-3015",
      },
      {
        itemName: "Layer Chicks",
        purchaseCategory: PurchaseCategory.CHICKS,
        quantity: 650,
        freeQuantity: 20,
        unit: "Birds",
        unitPrice: 112,
        amount: 72800,
        date: 11,
        description: "Layer chicks lot 2",
        reference: "CH-3020",
      },
      {
        itemName: "Broiler Chicks",
        purchaseCategory: PurchaseCategory.CHICKS,
        quantity: 900,
        freeQuantity: 30,
        unit: "Birds",
        unitPrice: 98,
        amount: 88200,
        date: 6,
        description: "Broiler chicks lot 3",
        reference: "CH-3028",
      },
      {
        itemName: "Vaccination Boost Pack",
        purchaseCategory: PurchaseCategory.MEDICINE,
        quantity: 18,
        freeQuantity: 2,
        unit: "Bottle",
        unitPrice: 450,
        amount: 8100,
        date: 2,
        description: "Support medicine for new batches",
        reference: "CH-3034",
        expiryDate: 160,
      },
    ],
    payments: [
      { amount: 90000, date: 20, description: "Advance payment", reference: "HATCH-401", purchaseIndex: 0 },
      { amount: 50000, date: 9, description: "Bulk transfer", reference: "HATCH-402", purchaseIndex: 2 },
      { amount: 30000, date: 1, description: "Closing payment", reference: "HATCH-403" },
    ],
  },
  {
    name: "FarmCare General Supplies",
    contact: "+9779801000004",
    address: "Lalitpur, Bagmati",
    openingBalance: 8000,
    purchases: [
      {
        itemName: "Brooding Lamps",
        purchaseCategory: PurchaseCategory.OTHER,
        quantity: 18,
        freeQuantity: 0,
        unit: "PCS",
        unitPrice: 1200,
        amount: 21600,
        date: 29,
        description: "Brooding equipment purchase",
        reference: "OT-4001",
      },
      {
        itemName: "Water Nipples",
        purchaseCategory: PurchaseCategory.OTHER,
        quantity: 200,
        freeQuantity: 10,
        unit: "PCS",
        unitPrice: 55,
        amount: 11000,
        date: 22,
        description: "Drink line accessories",
        reference: "OT-4007",
      },
      {
        itemName: "Plastic Crates",
        purchaseCategory: PurchaseCategory.OTHER,
        quantity: 45,
        freeQuantity: 0,
        unit: "PCS",
        unitPrice: 380,
        amount: 17100,
        date: 17,
        description: "Transport crates",
        reference: "OT-4013",
      },
      {
        itemName: "Feed Scoops",
        purchaseCategory: PurchaseCategory.OTHER,
        quantity: 60,
        freeQuantity: 0,
        unit: "PCS",
        unitPrice: 140,
        amount: 8400,
        date: 11,
        description: "Daily feeding tools",
        reference: "OT-4019",
      },
      {
        itemName: "Thermometer Set",
        purchaseCategory: PurchaseCategory.OTHER,
        quantity: 12,
        freeQuantity: 0,
        unit: "Set",
        unitPrice: 950,
        amount: 11400,
        date: 6,
        description: "Temperature monitoring",
        reference: "OT-4026",
      },
      {
        itemName: "Disinfection Mats",
        purchaseCategory: PurchaseCategory.OTHER,
        quantity: 20,
        freeQuantity: 0,
        unit: "PCS",
        unitPrice: 260,
        amount: 5200,
        date: 2,
        description: "Entry biosecurity",
        reference: "OT-4031",
      },
    ],
    payments: [
      { amount: 12000, date: 18, description: "Partial payment", reference: "PAY-OT-501", purchaseIndex: 1 },
      { amount: 15000, date: 5, description: "Bulk cash settlement", reference: "PAY-OT-502", purchaseIndex: 4 },
    ],
  },
];

const dec = (value: number) => new Prisma.Decimal(value.toFixed(2));

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

type LedgerSupplierProfile = {
  itemPrefix: string;
  purchaseCategory: PurchaseCategory;
  unit: string;
  baseUnitPrice: number;
  unitPriceStep: number;
  baseQuantity: number;
  quantityStep: number;
  paymentRatio: number;
  expiryBaseDays?: number;
};

function getLedgerSupplierProfile(name: string): LedgerSupplierProfile {
  if (name.includes("Feed")) {
    return {
      itemPrefix: "Feed Batch",
      purchaseCategory: PurchaseCategory.FEED,
      unit: "Bag",
      baseUnitPrice: 3150,
      unitPriceStep: 35,
      baseQuantity: 10,
      quantityStep: 1,
      paymentRatio: 0.42,
    };
  }

  if (name.includes("Medicine")) {
    return {
      itemPrefix: "Medicine Lot",
      purchaseCategory: PurchaseCategory.MEDICINE,
      unit: "Bottle",
      baseUnitPrice: 280,
      unitPriceStep: 18,
      baseQuantity: 8,
      quantityStep: 1,
      paymentRatio: 0.5,
      expiryBaseDays: 120,
    };
  }

  if (name.includes("Hatchery")) {
    return {
      itemPrefix: "Chick Lot",
      purchaseCategory: PurchaseCategory.CHICKS,
      unit: "Birds",
      baseUnitPrice: 92,
      unitPriceStep: 2,
      baseQuantity: 520,
      quantityStep: 25,
      paymentRatio: 0.48,
    };
  }

  return {
    itemPrefix: "Supply Lot",
    purchaseCategory: PurchaseCategory.OTHER,
    unit: "PCS",
    baseUnitPrice: 140,
    unitPriceStep: 22,
    baseQuantity: 16,
    quantityStep: 2,
    paymentRatio: 0.44,
  };
}

function buildSupplementalPurchases(
  supplierName: string
): Array<{
  itemName: string;
  purchaseCategory: PurchaseCategory;
  quantity: number;
  freeQuantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  date: number;
  description: string;
  reference: string;
  expiryDate?: number;
}> {
  const profile = getLedgerSupplierProfile(supplierName);

  return Array.from({ length: 10 }, (_, index) => {
    const sequence = index + 1;
    const quantity = profile.baseQuantity + index * profile.quantityStep;
    const unitPrice = profile.baseUnitPrice + index * profile.unitPriceStep;
    const freeQuantity =
      profile.purchaseCategory === PurchaseCategory.CHICKS
        ? index % 2 === 0
          ? 20 + index * 2
          : 0
        : index % 3 === 0
          ? 1
          : 0;
    const amount = quantity * unitPrice;

    return {
      itemName: `${profile.itemPrefix} ${sequence}`,
      purchaseCategory: profile.purchaseCategory,
      quantity,
      freeQuantity,
      unit: profile.unit,
      unitPrice,
      amount,
      date: Math.max(1, 12 - index),
      description: `${supplierName} supplemental purchase ${sequence}`,
      reference: `${supplierName.slice(0, 3).toUpperCase()}-EX-${String(sequence).padStart(2, "0")}`,
      ...(profile.expiryBaseDays
        ? { expiryDate: profile.expiryBaseDays - index * 3 }
        : {}),
    };
  });
}

function buildSupplementalPayments(
  supplierName: string,
  purchases: Array<{ id: string; amount: number }>
): Array<{
  amount: number;
  date: number;
  description: string;
  reference: string;
  purchaseIndex?: number;
}> {
  const profile = getLedgerSupplierProfile(supplierName);

  return Array.from({ length: 10 }, (_, index) => {
    const linkedPurchase = purchases[index % purchases.length];
    const rawAmount = linkedPurchase
      ? Math.round(Number(linkedPurchase.amount) * profile.paymentRatio)
      : 5000 + index * 650;
    const amount = Math.max(1000, Math.round(rawAmount / 100) * 100);

    return {
      amount,
      date: Math.max(1, 11 - index),
      description: `${supplierName} payment ${index + 1}`,
      reference: `${supplierName.slice(0, 3).toUpperCase()}-PAY-${String(index + 1).padStart(2, "0")}`,
      purchaseIndex: purchases.length > 0 ? index % purchases.length : undefined,
    };
  });
}

async function main() {
  console.log("Seeding demo farmer data...");

  const existingDemoUser = await prisma.user.findFirst({
    where: {
      phone: {
        in: [DEMO_OWNER_PHONE, DEMO_OWNER_PHONE_LEGACY],
      },
    },
  });

  if (existingDemoUser) {
    const farmIds = (
      await prisma.farm.findMany({
        where: { ownerId: existingDemoUser.id },
        select: { id: true },
      })
    ).map((farm) => farm.id);

    const batchIds = farmIds.length
      ? (
          await prisma.batch.findMany({
            where: { farmId: { in: farmIds } },
            select: { id: true },
          })
        ).map((batch) => batch.id)
      : [];

    const saleIds = farmIds.length
      ? (
          await prisma.sale.findMany({
            where: { farmId: { in: farmIds } },
            select: { id: true },
          })
        ).map((sale) => sale.id)
      : [];

    const itemIds = (
      await prisma.inventoryItem.findMany({
        where: { userId: existingDemoUser.id },
        select: { id: true },
      })
    ).map((item) => item.id);

    await prisma.$transaction(async (tx) => {
      await tx.salePayment.deleteMany({
        where: { saleId: { in: saleIds } },
      });
      await tx.sale.deleteMany({
        where: { farmId: { in: farmIds } },
      });
      await tx.inventoryUsage.deleteMany({
        where: { farmId: { in: farmIds } },
      });
      await tx.expense.deleteMany({
        where: { farmId: { in: farmIds } },
      });
      await tx.batchNote.deleteMany({
        where: { batchId: { in: batchIds } },
      });
      await tx.batch.deleteMany({
        where: { farmId: { in: farmIds } },
      });
      await tx.inventoryTransaction.deleteMany({
        where: { itemId: { in: itemIds } },
      });
      await tx.inventoryItem.deleteMany({
        where: { userId: existingDemoUser.id },
      });
      await tx.dealer.deleteMany({
        where: { userId: existingDemoUser.id },
      });
      await tx.reminder.deleteMany({
        where: {
          OR: [{ userId: existingDemoUser.id }, { farmId: { in: farmIds } }],
        },
      });
      await tx.category.deleteMany({
        where: { userId: existingDemoUser.id },
      });
      await tx.userOnboardingPayment.deleteMany({
        where: { userId: existingDemoUser.id },
      });
      await tx.user.deleteMany({
        where: { id: existingDemoUser.id },
      });
    });
  }

  const passwordHash = await bcrypt.hash(DEMO_OWNER_PASSWORD, 12);

  const owner = await prisma.user.create({
    data: {
      phone: DEMO_OWNER_PHONE,
      name: "Demo Farmer Owner",
      password: passwordHash,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      companyName: "Demo Poultry Holdings",
      CompanyFarmLocation: "Kathmandu, Bagmati",
    },
  });

  const categories = {
    feedExpense: await prisma.category.create({
      data: {
        userId: owner.id,
        name: "Feed",
        type: CategoryType.EXPENSE,
        description: "Demo feed expense category",
      },
    }),
    medicineExpense: await prisma.category.create({
      data: {
        userId: owner.id,
        name: "Medicine",
        type: CategoryType.EXPENSE,
        description: "Demo medicine expense category",
      },
    }),
    labourExpense: await prisma.category.create({
      data: {
        userId: owner.id,
        name: "Labour",
        type: CategoryType.EXPENSE,
        description: "Demo labour expense category",
      },
    }),
    utilityExpense: await prisma.category.create({
      data: {
        userId: owner.id,
        name: "Utilities",
        type: CategoryType.EXPENSE,
        description: "Demo utility expense category",
      },
    }),
    broilerSale: await prisma.category.create({
      data: {
        userId: owner.id,
        name: "Broiler Sales",
        type: CategoryType.SALES,
        description: "Demo broiler sale category",
      },
    }),
    eggSale: await prisma.category.create({
      data: {
        userId: owner.id,
        name: "Egg Sales",
        type: CategoryType.SALES,
        description: "Demo egg sale category",
      },
    }),
    inventory: await prisma.category.create({
      data: {
        userId: owner.id,
        name: "Inventory",
        type: CategoryType.INVENTORY,
        description: "Demo inventory category",
      },
    }),
  };

  const inventoryItems = {
    starterFeed: await prisma.inventoryItem.create({
      data: {
        userId: owner.id,
        categoryId: categories.inventory.id,
        name: "Starter Feed",
        description: "High-protein starter feed",
        currentStock: dec(900),
        unit: "Bag",
        minStock: dec(100),
        itemType: InventoryItemType.FEED,
        unitPrice: dec(3200),
        supplierKey: "DEMO:FEED:STARTER",
        expiryDateKey: "NO_EXPIRY",
      },
    }),
    growerFeed: await prisma.inventoryItem.create({
      data: {
        userId: owner.id,
        categoryId: categories.inventory.id,
        name: "Grower Feed",
        description: "Grower feed for mid-cycle birds",
        currentStock: dec(700),
        unit: "Bag",
        minStock: dec(80),
        itemType: InventoryItemType.FEED,
        unitPrice: dec(3400),
        supplierKey: "DEMO:FEED:GROWER",
        expiryDateKey: "NO_EXPIRY",
      },
    }),
    vaccine: await prisma.inventoryItem.create({
      data: {
        userId: owner.id,
        categoryId: categories.inventory.id,
        name: "Vaccination Kit",
        description: "Medicine and vaccine stock",
        currentStock: dec(420),
        unit: "Bottle",
        minStock: dec(50),
        itemType: InventoryItemType.MEDICINE,
        unitPrice: dec(850),
        supplierKey: "DEMO:MEDICINE:VAX",
        expiryDate: daysFromNow(240),
        expiryDateKey: "EXP-240",
      },
    }),
    equipment: await prisma.inventoryItem.create({
      data: {
        userId: owner.id,
        categoryId: categories.inventory.id,
        name: "Brooding Equipment",
        description: "Reusable equipment stock",
        currentStock: dec(45),
        unit: "PCS",
        minStock: dec(10),
        itemType: InventoryItemType.EQUIPMENT,
        unitPrice: dec(6200),
        supplierKey: "DEMO:EQUIPMENT:BRD",
        expiryDateKey: "NO_EXPIRY",
      },
    }),
  };

  const inventoryPurchases = [
    { item: inventoryItems.starterFeed, quantity: 1200, unitPrice: 3200, date: daysAgo(40) },
    { item: inventoryItems.growerFeed, quantity: 1000, unitPrice: 3400, date: daysAgo(36) },
    { item: inventoryItems.vaccine, quantity: 600, unitPrice: 850, date: daysAgo(32) },
    { item: inventoryItems.equipment, quantity: 80, unitPrice: 6200, date: daysAgo(60) },
  ];

  for (const purchase of inventoryPurchases) {
    await prisma.inventoryTransaction.create({
      data: {
        type: TransactionType.PURCHASE,
        quantity: dec(purchase.quantity),
        unitPrice: dec(purchase.unitPrice),
        totalAmount: dec(purchase.quantity * purchase.unitPrice),
        date: purchase.date,
        description: `Seeded stock for ${purchase.item.name}`,
        unit: purchase.item.unit,
        itemId: purchase.item.id,
      },
    });
  }

  let totalSupplierPurchases = 0;
  let totalSupplierPayments = 0;
  let totalSupplierBalance = 0;
  let totalSuppliers = 0;

  for (const supplierSeed of SUPPLIER_LEDGER_SEEDS) {
    const dealer = await prisma.dealer.create({
      data: {
        userId: owner.id,
        name: supplierSeed.name,
        contact: supplierSeed.contact,
        address: supplierSeed.address,
      },
    });

    const purchaseTxns: Array<{ id: string; amount: number }> = [];
    const supplementalPurchases = buildSupplementalPurchases(supplierSeed.name);

    const openingBalanceTxn = await prisma.entityTransaction.create({
      data: {
        type: TransactionType.OPENING_BALANCE,
        amount: dec(supplierSeed.openingBalance),
        quantity: null,
        freeQuantity: null,
        itemName: null,
        date: daysAgo(45),
        description: "Opening balance",
        reference: `${dealer.name.slice(0, 4).toUpperCase()}-OPEN-001`,
        imageUrl: null,
        dealerId: dealer.id,
        entityType: "DEALER",
        entityId: dealer.id,
        paymentToPurchaseId: null,
      },
    });

    let supplierBalance = Number(openingBalanceTxn.amount);
    let supplierPurchases = 0;
    let supplierPayments = 0;

    for (const purchase of supplierSeed.purchases) {
      const txn = await prisma.entityTransaction.create({
        data: {
          type: TransactionType.PURCHASE,
          amount: dec(purchase.amount),
          quantity: purchase.quantity,
          freeQuantity: purchase.freeQuantity,
          itemName: purchase.itemName,
          date: daysAgo(purchase.date),
          description: purchase.description,
          reference: purchase.reference,
          imageUrl: null,
          dealerId: dealer.id,
          entityType: "DEALER",
          entityId: dealer.id,
          purchaseCategory: purchase.purchaseCategory,
          unit: purchase.unit,
          unitPrice: dec(purchase.unitPrice),
          expiryDate:
            purchase.purchaseCategory === PurchaseCategory.MEDICINE && purchase.expiryDate
              ? daysFromNow(purchase.expiryDate)
              : null,
          paymentToPurchaseId: null,
        },
      });

      purchaseTxns.push({ id: txn.id, amount: purchase.amount });
      supplierPurchases += purchase.amount;
      supplierBalance += purchase.amount;
    }

    for (const purchase of supplementalPurchases) {
      const txn = await prisma.entityTransaction.create({
        data: {
          type: TransactionType.PURCHASE,
          amount: dec(purchase.amount),
          quantity: purchase.quantity,
          freeQuantity: purchase.freeQuantity,
          itemName: purchase.itemName,
          date: daysAgo(purchase.date),
          description: purchase.description,
          reference: purchase.reference,
          imageUrl: null,
          dealerId: dealer.id,
          entityType: "DEALER",
          entityId: dealer.id,
          purchaseCategory: purchase.purchaseCategory,
          unit: purchase.unit,
          unitPrice: dec(purchase.unitPrice),
          expiryDate:
            purchase.purchaseCategory === PurchaseCategory.MEDICINE && purchase.expiryDate
              ? daysFromNow(purchase.expiryDate)
              : null,
          paymentToPurchaseId: null,
        },
      });

      purchaseTxns.push({ id: txn.id, amount: purchase.amount });
      supplierPurchases += purchase.amount;
      supplierBalance += purchase.amount;
    }

    const supplementalPayments = buildSupplementalPayments(
      supplierSeed.name,
      purchaseTxns
    );

    for (const payment of [...supplierSeed.payments, ...supplementalPayments]) {
      const targetPurchase = payment.purchaseIndex !== undefined
        ? purchaseTxns[payment.purchaseIndex]
        : null;

      const txn = await prisma.entityTransaction.create({
        data: {
          type: TransactionType.PAYMENT,
          amount: dec(payment.amount),
          quantity: null,
          freeQuantity: null,
          itemName: null,
          date: daysAgo(payment.date),
          description: payment.description,
          reference: payment.reference,
          imageUrl: null,
          dealerId: dealer.id,
          entityType: "DEALER",
          entityId: dealer.id,
          paymentToPurchaseId: targetPurchase?.id || null,
        },
      });

      supplierPayments += payment.amount;
      supplierBalance -= payment.amount;

      // Keep the transaction object reachable in case future seed expansion needs it.
      void txn;
    }

    await prisma.dealer.update({
      where: { id: dealer.id },
      data: {
        balance: dec(supplierBalance),
        totalPurchases: dec(supplierPurchases),
        totalPayments: dec(supplierPayments),
      },
    });

    totalSupplierPurchases += supplierPurchases;
    totalSupplierPayments += supplierPayments;
    totalSupplierBalance += supplierBalance;
    totalSuppliers += 1;
  }

  let totalSales = 0;
  let totalDue = 0;
  let totalExpenses = 0;
  let totalBatches = 0;
  let totalReminders = 0;

  for (let i = 0; i < FARM_NAMES.length; i += 1) {
    const code = String(i + 1).padStart(2, "0");
    const farm = await prisma.farm.create({
      data: {
        ownerId: owner.id,
        name: FARM_NAMES[i],
        capacity: 2200 + i * 180,
        description: `Demo farm ${i + 1} used for load testing and pagination.`,
      },
    });

    const batches = [
      await prisma.batch.create({
        data: {
          farmId: farm.id,
          batchNumber: `${code}-BR-01`,
          startDate: daysAgo(16 + i),
          endDate: null,
          status: BatchStatus.ACTIVE,
          batchType: BatchType.BROILER,
          initialChicks: 1200 + i * 25,
          currentWeight: dec(1.35 + i * 0.03),
          notes: "Active broiler batch.",
        },
      }),
      await prisma.batch.create({
        data: {
          farmId: farm.id,
          batchNumber: `${code}-BR-02`,
          startDate: daysAgo(55 + i),
          endDate: daysAgo(8 + i),
          status: BatchStatus.COMPLETED,
          batchType: BatchType.BROILER,
          initialChicks: 1000 + i * 20,
          currentWeight: dec(2.05 + i * 0.02),
          notes: "Closed broiler batch.",
        },
      }),
      await prisma.batch.create({
        data: {
          farmId: farm.id,
          batchNumber: `${code}-LY-01`,
          startDate: daysAgo(145 + i),
          endDate: daysAgo(12 + i),
          status: BatchStatus.COMPLETED,
          batchType: BatchType.LAYERS,
          initialChicks: 800 + i * 15,
          currentWeight: dec(1.9 + i * 0.01),
          notes: "Closed layer batch.",
        },
      }),
    ];

    totalBatches += batches.length;

    for (const [batchIndex, batch] of batches.entries()) {
      await prisma.batchNote.create({
        data: {
          batchId: batch.id,
          date: daysAgo(3 + batchIndex),
          description: `Seed note for ${batch.batchNumber}.`,
        },
      });
    }

    const expenseRows = [
      {
        categoryId: categories.feedExpense.id,
        date: daysAgo(6 + i),
        amount: 38500 + i * 850,
        description: `Feed top-up for ${farm.name}`,
        quantity: 10 + i,
        unitPrice: 3850,
        batchId: batches[0].id,
      },
      {
        categoryId: categories.medicineExpense.id,
        date: daysAgo(5 + i),
        amount: 6200 + i * 150,
        description: `Medicine and vaccines for ${farm.name}`,
        quantity: 4 + (i % 3),
        unitPrice: 1550,
        batchId: batches[1].id,
      },
      {
        categoryId: categories.labourExpense.id,
        date: daysAgo(4 + i),
        amount: 7400 + i * 120,
        description: `Daily labour cost for ${farm.name}`,
        quantity: null,
        unitPrice: null,
        batchId: null,
      },
      {
        categoryId: categories.utilityExpense.id,
        date: daysAgo(2 + i),
        amount: 3200 + i * 90,
        description: `Electricity and water for ${farm.name}`,
        quantity: null,
        unitPrice: null,
        batchId: null,
      },
    ];

    const createdExpenses: Array<{ id: string }> = [];
    for (const row of expenseRows) {
      const expense = await prisma.expense.create({
        data: {
          farmId: farm.id,
          batchId: row.batchId,
          categoryId: row.categoryId,
          date: row.date,
          amount: dec(row.amount),
          description: row.description,
          quantity: row.quantity !== null ? dec(row.quantity) : null,
          unitPrice: row.unitPrice !== null ? dec(row.unitPrice) : null,
          weight: null,
        },
      });
      createdExpenses.push(expense);
      totalExpenses += Number(expense.amount);
    }

    const salesRows = [
      {
        categoryId: categories.broilerSale.id,
        date: daysAgo(3 + i),
        amount: 64250 + i * 720,
        quantity: 920 + i * 18,
        unitPrice: 69.83,
        description: `Broiler batch sale for ${farm.name}`,
        isCredit: false,
        paidAmount: 64250 + i * 720,
        dueAmount: 0,
        batchId: batches[1].id,
        itemType: SalesItemType.Chicken_Meat,
      },
      {
        categoryId: categories.broilerSale.id,
        date: daysAgo(2 + i),
        amount: 42800 + i * 640,
        quantity: 610 + i * 12,
        unitPrice: 70.16,
        description: `Credit broiler sale for ${farm.name}`,
        isCredit: true,
        paidAmount: 28000 + i * 300,
        dueAmount: 14800 + i * 340,
        batchId: batches[1].id,
        itemType: SalesItemType.Chicken_Meat,
      },
      {
        categoryId: categories.eggSale.id,
        date: daysAgo(1 + i),
        amount: 18300 + i * 210,
        quantity: 3420 + i * 40,
        unitPrice: 5.35,
        description: `Egg sale for ${farm.name}`,
        isCredit: false,
        paidAmount: 18300 + i * 210,
        dueAmount: 0,
        batchId: batches[2].id,
        itemType: SalesItemType.EGGS,
      },
      {
        categoryId: categories.broilerSale.id,
        date: daysAgo(7 + i),
        amount: 12900 + i * 160,
        quantity: 180 + i * 5,
        unitPrice: 71.67,
        description: `Small live bird sale for ${farm.name}`,
        isCredit: i % 2 === 0,
        paidAmount: i % 2 === 0 ? 9000 + i * 100 : 12900 + i * 160,
        dueAmount: i % 2 === 0 ? 3900 + i * 60 : 0,
        batchId: batches[0].id,
        itemType: SalesItemType.Chicken_Meat,
      },
    ];

    for (const [saleIndex, row] of salesRows.entries()) {
      const sale = await prisma.sale.create({
        data: {
          invoiceNumber: `DM-${code}-${String(saleIndex + 1).padStart(2, "0")}`,
          farmId: farm.id,
          batchId: row.batchId,
          categoryId: row.categoryId,
          date: row.date,
          amount: dec(row.amount),
          quantity: dec(row.quantity),
          unitPrice: dec(row.unitPrice),
          description: row.description,
          itemType: row.itemType,
          isCredit: row.isCredit,
          paidAmount: dec(row.paidAmount),
          dueAmount: dec(row.dueAmount),
        },
      });

      totalSales += Number(sale.amount);
      totalDue += Number(sale.dueAmount ?? 0);

      if (row.isCredit && row.dueAmount > 0) {
        const firstPayment = Math.max(1000, Math.floor(row.paidAmount * 0.6));
        const secondPayment = row.paidAmount - firstPayment;

        await prisma.salePayment.create({
          data: {
            saleId: sale.id,
            amount: dec(firstPayment),
            date: daysAgo(1 + i),
            description: `First payment for ${sale.invoiceNumber}`,
          },
        });

        await prisma.salePayment.create({
          data: {
            saleId: sale.id,
            amount: dec(secondPayment),
            date: daysAgo(i),
            description: `Second payment for ${sale.invoiceNumber}`,
          },
        });
      }
    }

    const feedUsage = await prisma.inventoryUsage.create({
      data: {
        farmId: farm.id,
        batchId: batches[0].id,
        itemId: inventoryItems.starterFeed.id,
        expenseId: createdExpenses[0].id,
        date: daysAgo(4 + i),
        quantity: dec(9 + (i % 4)),
        unitPrice: dec(3200),
        totalAmount: dec((9 + (i % 4)) * 3200),
        notes: `Starter feed usage for ${farm.name}`,
      },
    });

    const medicineUsage = await prisma.inventoryUsage.create({
      data: {
        farmId: farm.id,
        batchId: batches[1].id,
        itemId: inventoryItems.vaccine.id,
        expenseId: createdExpenses[1].id,
        date: daysAgo(3 + i),
        quantity: dec(2 + (i % 3)),
        unitPrice: dec(850),
        totalAmount: dec((2 + (i % 3)) * 850),
        notes: `Medicine usage for ${farm.name}`,
      },
    });

    await prisma.reminder.createMany({
      data: [
        {
          userId: owner.id,
          farmId: farm.id,
          batchId: batches[0].id,
          title: `Vaccination check for ${farm.name}`,
          reminderDate: daysFromNow(2 + i),
          isNoticed: false,
        },
        {
          userId: owner.id,
          farmId: farm.id,
          batchId: batches[1].id,
          title: `Collect credit balance for ${farm.name}`,
          reminderDate: daysFromNow(4 + i),
          isNoticed: false,
        },
      ],
    });

    totalReminders += 2;

    await prisma.inventoryItem.update({
      where: { id: inventoryItems.starterFeed.id },
      data: {
        currentStock: new Prisma.Decimal(
          inventoryItems.starterFeed.currentStock.toNumber() -
            feedUsage.quantity.toNumber()
        ),
      },
    });

    await prisma.inventoryItem.update({
      where: { id: inventoryItems.vaccine.id },
      data: {
        currentStock: new Prisma.Decimal(
          inventoryItems.vaccine.currentStock.toNumber() -
            medicineUsage.quantity.toNumber()
        ),
      },
    });
  }

  console.log("Demo farmer seed complete.");
  console.log({
    ownerPhone: DEMO_OWNER_PHONE,
    ownerPassword: DEMO_OWNER_PASSWORD,
    farms: FARM_NAMES.length,
    batches: totalBatches,
    suppliers: totalSuppliers,
    expenses: totalExpenses,
    sales: totalSales,
    dueBalance: totalDue,
    supplierPurchases: totalSupplierPurchases,
    supplierPayments: totalSupplierPayments,
    supplierBalance: totalSupplierBalance,
    reminders: totalReminders,
  });
}

main()
  .catch((error) => {
    console.error("Demo farmer seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
