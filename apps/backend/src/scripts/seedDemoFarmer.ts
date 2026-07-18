import bcrypt from "bcrypt";
import {
  BatchStatus,
  BatchType,
  CategoryType,
  InventoryItemType,
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
    expenses: totalExpenses,
    sales: totalSales,
    dueBalance: totalDue,
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
