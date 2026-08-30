import "dotenv/config";
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
  NotificationStatus,
  StaffStatus,
} from "@prisma/client";
import prisma from "../utils/prisma";
import {
  daysAgo,
  decimal,
  DEMO_ACCOUNTS,
  hashDemoPassword,
  printDemoCredentials,
  upsertById,
  upsertDemoUser,
} from "./demoSeedUtils";

const account = DEMO_ACCOUNTS.hatchery;
const id = (suffix: string) => `p360-demo-hatchery-${suffix}-v1`;
const round2 = (value: number) => Math.round(value * 100) / 100;
const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

type InventoryKey =
  | "cobb-parents"
  | "ross-parents"
  | "grower-feed"
  | "layer-feed"
  | "vaccine"
  | "supplement"
  | "disinfectant"
  | "egg-trays"
  | "setter-trays";

type SupplierKey = "parent" | "feed" | "health" | "equipment";

type SupplierPurchaseItemSeed = {
  inventoryKey: InventoryKey;
  itemName: string;
  quantity: number;
  freeQuantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
};

type SupplierEventSeed = {
  key: string;
  supplierKey: SupplierKey;
  type: HatcherySupplierTxnType;
  date: Date;
  note: string;
  reference?: string;
  amount?: number;
  category?: HatcheryPurchaseCategory;
  items?: SupplierPurchaseItemSeed[];
};

type PartyKey = "metro" | "sunrise" | "egg-center" | "meat-house";

type PartySaleEvent = {
  key: string;
  partyKey: PartyKey;
  date: Date;
  amount: number;
  sourceType: "egg_sale" | "chick_sale" | "parent_sale";
  sourceId: string;
  note: string;
};

async function seedDemoHatchery(): Promise<void> {
  console.log("Seeding production-safe hatchery demo data...");
  const passwordHash = await hashDemoPassword(account);

  await prisma.$transaction(
    async (tx) => {
      const user = await upsertDemoUser(tx, account, passwordHash);

      await upsertById(tx.hatcheryBusiness, id("business"), {
        name: account.businessName,
        contact: account.phone,
        address: account.location,
        ownerId: user.id,
      });

      const supplierSeeds = [
        {
          key: "parent" as const,
          name: "Himalayan Parent Stock Farm",
          contact: "+9779855081001",
          address: "Kawasoti-8, Nawalpur",
        },
        {
          key: "feed" as const,
          name: "Narayani Feed Industries",
          contact: "+9779855081002",
          address: "Bharatpur-14, Chitwan",
        },
        {
          key: "health" as const,
          name: "Avian Health Nepal",
          contact: "+9779855081003",
          address: "Ratnanagar-2, Chitwan",
        },
        {
          key: "equipment" as const,
          name: "Precision Hatch Systems",
          contact: "+9779855081004",
          address: "Hetauda Industrial Area, Makwanpur",
        },
      ];

      const supplierIds: Record<SupplierKey, string> = {
        parent: id("supplier-parent"),
        feed: id("supplier-feed"),
        health: id("supplier-health"),
        equipment: id("supplier-equipment"),
      };

      for (const supplier of supplierSeeds) {
        await upsertById(tx.hatcherySupplier, supplierIds[supplier.key], {
          hatcheryOwnerId: user.id,
          name: supplier.name,
          contact: supplier.contact,
          address: supplier.address,
          openingBalance: decimal(0),
          balance: decimal(0),
        });
      }

      const cobbEffectiveCost = round4(546_000 / 4_250);
      const inventorySeeds: Array<{
        key: InventoryKey;
        supplierKey: SupplierKey;
        itemType: HatcheryInventoryItemType;
        name: string;
        unit: string;
        unitPrice: number;
        effectiveUnitCost: number;
        currentStock: number;
        minStock: number;
      }> = [
        {
          key: "cobb-parents",
          supplierKey: "parent",
          itemType: HatcheryInventoryItemType.CHICKS,
          name: "Cobb 500 Parent Stock Chicks",
          unit: "Birds",
          unitPrice: 130,
          effectiveUnitCost: cobbEffectiveCost,
          currentStock: 250,
          minStock: 200,
        },
        {
          key: "ross-parents",
          supplierKey: "parent",
          itemType: HatcheryInventoryItemType.CHICKS,
          name: "Ross 308 Parent Stock Chicks",
          unit: "Birds",
          unitPrice: 125,
          effectiveUnitCost: 125,
          currentStock: 100,
          minStock: 150,
        },
        {
          key: "grower-feed",
          supplierKey: "feed",
          itemType: HatcheryInventoryItemType.FEED,
          name: "Parent Breeder Grower Feed",
          unit: "Bag",
          unitPrice: 3450,
          effectiveUnitCost: 3450,
          currentStock: 80,
          minStock: 60,
        },
        {
          key: "layer-feed",
          supplierKey: "feed",
          itemType: HatcheryInventoryItemType.FEED,
          name: "Parent Breeder Layer Feed",
          unit: "Bag",
          unitPrice: 3580,
          effectiveUnitCost: 3580,
          currentStock: 70,
          minStock: 50,
        },
        {
          key: "vaccine",
          supplierKey: "health",
          itemType: HatcheryInventoryItemType.MEDICINE,
          name: "ND + IB Parent Flock Vaccine",
          unit: "Vial",
          unitPrice: 950,
          effectiveUnitCost: 950,
          currentStock: 18,
          minStock: 10,
        },
        {
          key: "supplement",
          supplierKey: "health",
          itemType: HatcheryInventoryItemType.MEDICINE,
          name: "Breeder Vitamin Mineral Supplement",
          unit: "Packet",
          unitPrice: 480,
          effectiveUnitCost: 480,
          currentStock: 35,
          minStock: 15,
        },
        {
          key: "disinfectant",
          supplierKey: "health",
          itemType: HatcheryInventoryItemType.MEDICINE,
          name: "Hatchery Biosecurity Disinfectant",
          unit: "Bottle",
          unitPrice: 720,
          effectiveUnitCost: 720,
          currentStock: 10,
          minStock: 12,
        },
        {
          key: "egg-trays",
          supplierKey: "equipment",
          itemType: HatcheryInventoryItemType.OTHER,
          name: "Reusable Hatching Egg Trays",
          unit: "PCS",
          unitPrice: 55,
          effectiveUnitCost: 55,
          currentStock: 480,
          minStock: 200,
        },
        {
          key: "setter-trays",
          supplierKey: "equipment",
          itemType: HatcheryInventoryItemType.OTHER,
          name: "Setter Machine Trays",
          unit: "PCS",
          unitPrice: 1250,
          effectiveUnitCost: 1250,
          currentStock: 80,
          minStock: 20,
        },
      ];

      const inventoryByKey = new Map(
        inventorySeeds.map((item) => [item.key, item]),
      );

      for (const item of inventorySeeds) {
        await upsertById(tx.hatcheryInventoryItem, id(`inventory-${item.key}`), {
          hatcheryOwnerId: user.id,
          itemType: item.itemType,
          name: item.name,
          unit: item.unit,
          unitPrice: decimal(item.unitPrice),
          effectiveUnitCost: decimal(item.effectiveUnitCost),
          supplierKey: `HATCHERY_SUPPLIER:${supplierIds[item.supplierKey]}`,
          currentStock: decimal(item.currentStock),
          minStock: decimal(item.minStock),
          deletedAt: null,
        });
      }

      const supplierEvents: SupplierEventSeed[] = [
        {
          key: "parent-opening",
          supplierKey: "parent",
          type: HatcherySupplierTxnType.OPENING_BALANCE,
          amount: 40_000,
          date: daysAgo(450),
          note: "Opening balance carried into Poultry360",
        },
        {
          key: "parent-ross-purchase",
          supplierKey: "parent",
          type: HatcherySupplierTxnType.PURCHASE,
          category: HatcheryPurchaseCategory.CHICKS,
          date: daysAgo(425),
          note: "Ross parent-stock chicks received for historical flock PF-002",
          reference: "HPSF-2081-640",
          items: [
            {
              inventoryKey: "ross-parents",
              itemName: "Ross 308 Parent Stock Chicks",
              quantity: 1100,
              freeQuantity: 0,
              unit: "Birds",
              unitPrice: 125,
              totalAmount: 137_500,
            },
          ],
        },
        {
          key: "parent-historical-payment",
          supplierKey: "parent",
          type: HatcherySupplierTxnType.PAYMENT,
          amount: 150_000,
          date: daysAgo(423),
          note: "Payment against historical Ross parent-stock invoice",
          reference: "BANK-HPSF-6401",
        },
        {
          key: "parent-cobb-purchase",
          supplierKey: "parent",
          type: HatcherySupplierTxnType.PURCHASE,
          category: HatcheryPurchaseCategory.CHICKS,
          date: daysAgo(220),
          note: "Cobb parent-stock chicks received for active flock PF-001",
          reference: "HPSF-2082-118",
          items: [
            {
              inventoryKey: "cobb-parents",
              itemName: "Cobb 500 Parent Stock Chicks",
              quantity: 4200,
              freeQuantity: 50,
              unit: "Birds",
              unitPrice: 130,
              totalAmount: 546_000,
            },
          ],
        },
        {
          key: "parent-payment",
          supplierKey: "parent",
          type: HatcherySupplierTxnType.PAYMENT,
          amount: 500_000,
          date: daysAgo(215),
          note: "Bank payment against parent-stock chick invoice",
          reference: "BANK-HPSF-7712",
        },
        {
          key: "feed-opening",
          supplierKey: "feed",
          type: HatcherySupplierTxnType.OPENING_BALANCE,
          amount: 25_000,
          date: daysAgo(400),
          note: "Opening feed supplier balance",
        },
        {
          key: "feed-grower-purchase",
          supplierKey: "feed",
          type: HatcherySupplierTxnType.PURCHASE,
          category: HatcheryPurchaseCategory.FEED,
          date: daysAgo(370),
          note: "Grower feed delivery for parent flocks",
          reference: "NFI-2082-344",
          items: [
            {
              inventoryKey: "grower-feed",
              itemName: "Parent Breeder Grower Feed",
              quantity: 220,
              freeQuantity: 0,
              unit: "Bag",
              unitPrice: 3450,
              totalAmount: 759_000,
            },
          ],
        },
        {
          key: "feed-layer-purchase",
          supplierKey: "feed",
          type: HatcherySupplierTxnType.PURCHASE,
          category: HatcheryPurchaseCategory.FEED,
          date: daysAgo(290),
          note: "Layer ration for parent flocks in production",
          reference: "NFI-2083-091",
          items: [
            {
              inventoryKey: "layer-feed",
              itemName: "Parent Breeder Layer Feed",
              quantity: 260,
              freeQuantity: 0,
              unit: "Bag",
              unitPrice: 3580,
              totalAmount: 930_800,
            },
          ],
        },
        {
          key: "feed-payment",
          supplierKey: "feed",
          type: HatcherySupplierTxnType.PAYMENT,
          amount: 1_500_000,
          date: daysAgo(60),
          note: "Consolidated payment against breeder feed invoices",
          reference: "BANK-NFI-8820",
        },
        {
          key: "health-vaccine-purchase",
          supplierKey: "health",
          type: HatcherySupplierTxnType.PURCHASE,
          category: HatcheryPurchaseCategory.MEDICINE,
          date: daysAgo(70),
          note: "Parent flock vaccination stock",
          reference: "AHN-2083-144",
          items: [
            {
              inventoryKey: "vaccine",
              itemName: "ND + IB Parent Flock Vaccine",
              quantity: 30,
              freeQuantity: 0,
              unit: "Vial",
              unitPrice: 950,
              totalAmount: 28_500,
            },
          ],
        },
        {
          key: "health-supplement-purchase",
          supplierKey: "health",
          type: HatcherySupplierTxnType.PURCHASE,
          category: HatcheryPurchaseCategory.MEDICINE,
          date: daysAgo(50),
          note: "Vitamin and mineral supplement delivery",
          reference: "AHN-2083-162",
          items: [
            {
              inventoryKey: "supplement",
              itemName: "Breeder Vitamin Mineral Supplement",
              quantity: 60,
              freeQuantity: 0,
              unit: "Packet",
              unitPrice: 480,
              totalAmount: 28_800,
            },
          ],
        },
        {
          key: "health-disinfectant-purchase",
          supplierKey: "health",
          type: HatcherySupplierTxnType.PURCHASE,
          category: HatcheryPurchaseCategory.MEDICINE,
          date: daysAgo(30),
          note: "Biosecurity disinfectant replenishment",
          reference: "AHN-2083-177",
          items: [
            {
              inventoryKey: "disinfectant",
              itemName: "Hatchery Biosecurity Disinfectant",
              quantity: 24,
              freeQuantity: 0,
              unit: "Bottle",
              unitPrice: 720,
              totalAmount: 17_280,
            },
          ],
        },
        {
          key: "health-payment",
          supplierKey: "health",
          type: HatcherySupplierTxnType.PAYMENT,
          amount: 60_000,
          date: daysAgo(20),
          note: "Part payment against veterinary supply invoices",
          reference: "CASH-AHN-2083-20",
        },
        {
          key: "equipment-purchase",
          supplierKey: "equipment",
          type: HatcherySupplierTxnType.PURCHASE,
          category: HatcheryPurchaseCategory.OTHER,
          date: daysAgo(100),
          note: "Reusable egg handling and setter equipment",
          reference: "PHS-2082-511",
          items: [
            {
              inventoryKey: "egg-trays",
              itemName: "Reusable Hatching Egg Trays",
              quantity: 600,
              freeQuantity: 0,
              unit: "PCS",
              unitPrice: 55,
              totalAmount: 33_000,
            },
            {
              inventoryKey: "setter-trays",
              itemName: "Setter Machine Trays",
              quantity: 80,
              freeQuantity: 0,
              unit: "PCS",
              unitPrice: 1250,
              totalAmount: 100_000,
            },
          ],
        },
        {
          key: "equipment-payment",
          supplierKey: "equipment",
          type: HatcherySupplierTxnType.PAYMENT,
          amount: 100_000,
          date: daysAgo(90),
          note: "Bank payment against equipment invoice",
          reference: "BANK-PHS-7341",
        },
      ];

      for (const supplier of supplierSeeds) {
        const events = supplierEvents
          .filter((event) => event.supplierKey === supplier.key)
          .sort((a, b) => a.date.getTime() - b.date.getTime());
        let runningBalance = 0;
        let openingBalance = 0;

        for (const event of events) {
          const amount =
            event.type === HatcherySupplierTxnType.PURCHASE
              ? (event.items ?? []).reduce(
                  (sum, item) => sum + item.totalAmount,
                  0,
                )
              : (event.amount ?? 0);

          if (event.type === HatcherySupplierTxnType.PAYMENT) {
            runningBalance -= amount;
          } else {
            runningBalance += amount;
          }
          if (event.type === HatcherySupplierTxnType.OPENING_BALANCE) {
            openingBalance = amount;
          }

          await upsertById(tx.hatcherySupplierTxn, id(`supplier-${event.key}`), {
            supplierId: supplierIds[event.supplierKey],
            type: event.type,
            amount: decimal(amount),
            balanceAfter: decimal(runningBalance),
            date: event.date,
            note: event.note,
            purchaseCategory: event.category ?? null,
            receiptImageUrl: null,
            reference: event.reference ?? null,
          });

          if (event.type !== HatcherySupplierTxnType.PURCHASE) continue;

          for (const item of event.items ?? []) {
            const inventory = inventoryByKey.get(item.inventoryKey);
            if (!inventory) {
              throw new Error(`Missing hatchery inventory seed: ${item.inventoryKey}`);
            }

            await upsertById(
              tx.hatcherySupplierPurchaseItem,
              id(`supplier-${event.key}-item-${item.inventoryKey}`),
              {
                txnId: id(`supplier-${event.key}`),
                itemName: item.itemName,
                quantity: decimal(item.quantity),
                freeQuantity: decimal(item.freeQuantity),
                unit: item.unit,
                unitPrice: decimal(item.unitPrice),
                totalAmount: decimal(item.totalAmount),
              },
            );

            await upsertById(
              tx.hatcheryInventoryTxn,
              id(`supplier-${event.key}-inventory-${item.inventoryKey}-paid`),
              {
                itemId: id(`inventory-${item.inventoryKey}`),
                type: HatcheryInventoryTxnType.PURCHASE,
                quantity: decimal(item.quantity),
                unitPrice: decimal(item.unitPrice),
                amount: decimal(item.totalAmount),
                date: event.date,
                note: `${item.itemName} purchased from ${supplier.name}`,
                sourceSupplierTxnId: id(`supplier-${event.key}`),
              },
            );

            if (item.freeQuantity > 0) {
              await upsertById(
                tx.hatcheryInventoryTxn,
                id(`supplier-${event.key}-inventory-${item.inventoryKey}-free`),
                {
                  itemId: id(`inventory-${item.inventoryKey}`),
                  type: HatcheryInventoryTxnType.PURCHASE,
                  quantity: decimal(item.freeQuantity),
                  unitPrice: decimal(0),
                  amount: decimal(0),
                  date: event.date,
                  note: "Free units received with purchase",
                  sourceSupplierTxnId: id(`supplier-${event.key}`),
                },
              );
            }
          }
        }

        await upsertById(tx.hatcherySupplier, supplierIds[supplier.key], {
          hatcheryOwnerId: user.id,
          name: supplier.name,
          contact: supplier.contact,
          address: supplier.address,
          openingBalance: decimal(openingBalance),
          balance: decimal(runningBalance),
        });
      }

      const activeBatchId = id("batch-active-cobb");
      const closedBatchId = id("batch-closed-ross");

      await upsertById(tx.hatcheryBatch, activeBatchId, {
        hatcheryOwnerId: user.id,
        type: HatcheryBatchType.PARENT_FLOCK,
        status: HatcheryBatchStatus.ACTIVE,
        code: "PF-001",
        name: "Cobb 500 Parent Flock – House A",
        startDate: daysAgo(210),
        endDate: null,
        notes: "Commercial parent flock supplying the current incubation cycle.",
        initialParents: 4000,
        currentParents: 3830,
        placedAt: daysAgo(210),
      });

      await upsertById(tx.hatcheryBatch, closedBatchId, {
        hatcheryOwnerId: user.id,
        type: HatcheryBatchType.PARENT_FLOCK,
        status: HatcheryBatchStatus.CLOSED,
        code: "PF-002",
        name: "Ross 308 Parent Flock – Completed Cycle",
        startDate: daysAgo(420),
        endDate: daysAgo(110),
        notes: "Completed parent flock retained for historical analytics.",
        initialParents: 1000,
        currentParents: 0,
        placedAt: daysAgo(420),
      });

      const placementSeeds = [
        {
          key: "active",
          batchId: activeBatchId,
          inventoryKey: "cobb-parents" as const,
          quantity: 4000,
          date: daysAgo(210),
        },
        {
          key: "closed",
          batchId: closedBatchId,
          inventoryKey: "ross-parents" as const,
          quantity: 1000,
          date: daysAgo(420),
        },
      ];

      for (const placement of placementSeeds) {
        const item = inventoryByKey.get(placement.inventoryKey)!;
        const amount = round2(item.effectiveUnitCost * placement.quantity);
        const inventoryTxnId = id(`inventory-usage-placement-${placement.key}`);

        await upsertById(tx.hatcheryBatchPlacement, id(`placement-${placement.key}`), {
          batchId: placement.batchId,
          inventoryItemId: id(`inventory-${placement.inventoryKey}`),
          quantity: placement.quantity,
        });
        await upsertById(tx.hatcheryInventoryTxn, inventoryTxnId, {
          itemId: id(`inventory-${placement.inventoryKey}`),
          type: HatcheryInventoryTxnType.USAGE,
          quantity: decimal(placement.quantity),
          unitPrice: decimal(item.effectiveUnitCost),
          amount: decimal(amount),
          date: placement.date,
          note: `Initial placement into ${placement.key === "active" ? "PF-001" : "PF-002"}`,
          sourceSupplierTxnId: null,
        });
        await upsertById(
          tx.hatcheryBatchExpense,
          id(`expense-placement-${placement.key}`),
          {
            batchId: placement.batchId,
            date: placement.date,
            type: HatcheryBatchExpenseType.INVENTORY,
            category: "CHICKS",
            itemName: item.name,
            quantity: decimal(placement.quantity),
            unit: item.unit,
            unitPrice: decimal(item.effectiveUnitCost),
            amount: decimal(amount),
            note: "Initial parent-flock placement",
            inventoryItemId: id(`inventory-${placement.inventoryKey}`),
            inventoryTxnId,
          },
        );
      }

      const inventoryExpenseSeeds = [
        {
          key: "active-grower-feed",
          batchId: activeBatchId,
          inventoryKey: "grower-feed" as const,
          quantity: 40,
          date: daysAgo(170),
          category: "FEED",
          note: "Grower ration used before the flock entered lay",
        },
        {
          key: "active-layer-feed",
          batchId: activeBatchId,
          inventoryKey: "layer-feed" as const,
          quantity: 140,
          date: daysAgo(42),
          category: "FEED",
          note: "Layer ration issued for the current production cycle",
        },
        {
          key: "active-vaccine",
          batchId: activeBatchId,
          inventoryKey: "vaccine" as const,
          quantity: 12,
          date: daysAgo(68),
          category: "MEDICINE",
          note: "ND and IB vaccination programme",
        },
        {
          key: "active-supplement",
          batchId: activeBatchId,
          inventoryKey: "supplement" as const,
          quantity: 25,
          date: daysAgo(45),
          category: "MEDICINE",
          note: "Breeder vitamin and mineral supplementation",
        },
        {
          key: "active-disinfectant",
          batchId: activeBatchId,
          inventoryKey: "disinfectant" as const,
          quantity: 14,
          date: daysAgo(12),
          category: "BIOSECURITY",
          note: "Routine hatchery and parent-house disinfection",
        },
        {
          key: "active-egg-trays",
          batchId: activeBatchId,
          inventoryKey: "egg-trays" as const,
          quantity: 120,
          date: daysAgo(55),
          category: "SUPPLIES",
          note: "Egg trays assigned to House A collection points",
        },
        {
          key: "closed-grower-feed",
          batchId: closedBatchId,
          inventoryKey: "grower-feed" as const,
          quantity: 100,
          date: daysAgo(360),
          category: "FEED",
          note: "Grower feed used by the completed Ross parent flock",
        },
        {
          key: "closed-layer-feed",
          batchId: closedBatchId,
          inventoryKey: "layer-feed" as const,
          quantity: 50,
          date: daysAgo(280),
          category: "FEED",
          note: "Layer feed used during the historical laying cycle",
        },
      ];

      for (const expense of inventoryExpenseSeeds) {
        const item = inventoryByKey.get(expense.inventoryKey)!;
        const amount = round2(item.effectiveUnitCost * expense.quantity);
        const inventoryTxnId = id(`inventory-usage-${expense.key}`);

        await upsertById(tx.hatcheryInventoryTxn, inventoryTxnId, {
          itemId: id(`inventory-${expense.inventoryKey}`),
          type: HatcheryInventoryTxnType.USAGE,
          quantity: decimal(expense.quantity),
          unitPrice: decimal(item.effectiveUnitCost),
          amount: decimal(amount),
          date: expense.date,
          note: `Batch expense: ${expense.category}`,
          sourceSupplierTxnId: null,
        });
        await upsertById(tx.hatcheryBatchExpense, id(`expense-${expense.key}`), {
          batchId: expense.batchId,
          date: expense.date,
          type: HatcheryBatchExpenseType.INVENTORY,
          category: expense.category,
          itemName: item.name,
          quantity: decimal(expense.quantity),
          unit: item.unit,
          unitPrice: decimal(item.effectiveUnitCost),
          amount: decimal(amount),
          note: expense.note,
          inventoryItemId: id(`inventory-${expense.inventoryKey}`),
          inventoryTxnId,
        });
      }

      const manualExpenseSeeds = [
        [
          "active-electricity",
          activeBatchId,
          daysAgo(8),
          "UTILITIES",
          "Setter, hatcher and ventilation electricity",
          86_500,
          "Current monthly electricity allocation",
        ],
        [
          "active-labor",
          activeBatchId,
          daysAgo(15),
          "LABOR",
          "Parent-house and incubation labour",
          124_000,
          "Monthly labour allocation",
        ],
        [
          "active-maintenance",
          activeBatchId,
          daysAgo(25),
          "MAINTENANCE",
          "Setter calibration and ventilation service",
          46_500,
          "Preventive maintenance completed",
        ],
        [
          "closed-electricity",
          closedBatchId,
          daysAgo(180),
          "UTILITIES",
          "Historical incubation electricity allocation",
          72_000,
          "Completed-cycle utility cost",
        ],
        [
          "closed-labor",
          closedBatchId,
          daysAgo(170),
          "LABOR",
          "Historical parent-flock labour",
          98_000,
          "Completed-cycle labour cost",
        ],
      ] as const;

      for (const [key, batchId, date, category, itemName, amount, note] of
        manualExpenseSeeds) {
        await upsertById(tx.hatcheryBatchExpense, id(`expense-${key}`), {
          batchId,
          date,
          type: HatcheryBatchExpenseType.MANUAL,
          category,
          itemName,
          quantity: null,
          unit: null,
          unitPrice: null,
          amount: decimal(amount),
          note,
          inventoryItemId: null,
          inventoryTxnId: null,
        });
      }

      const mortalitySeeds = [
        ["active-1", activeBatchId, daysAgo(175), 25, "Early adaptation loss"],
        ["active-2", activeBatchId, daysAgo(90), 20, "Routine flock mortality"],
        ["active-3", activeBatchId, daysAgo(18), 25, "Late-cycle mortality"],
        ["closed-1", closedBatchId, daysAgo(350), 20, "Early flock loss"],
        ["closed-2", closedBatchId, daysAgo(190), 20, "Production-cycle loss"],
      ] as const;
      for (const [key, batchId, date, count, note] of mortalitySeeds) {
        await upsertById(tx.hatcheryBatchMortality, id(`mortality-${key}`), {
          batchId,
          date,
          count,
          note,
        });
      }

      const eggTypeSeeds = [
        ["hatchable", "Hatchable Egg", true],
        ["table", "Table Egg", false],
        ["cracked", "Cracked Egg", false],
        ["reject", "Reject Egg", false],
      ] as const;
      for (const [key, name, isHatchable] of eggTypeSeeds) {
        await upsertById(tx.hatcheryEggType, id(`egg-type-${key}`), {
          hatcheryOwnerId: user.id,
          name,
          isHatchable,
        });
      }

      const partySeeds = [
        {
          key: "metro" as const,
          name: "Metro Poultry Farms",
          phone: "+9779845082001",
          address: "Pokhara-17, Kaski",
          openingBalance: 20_000,
          targetBalance: 145_000,
        },
        {
          key: "sunrise" as const,
          name: "Sunrise Chick Distributors",
          phone: "+9779845082002",
          address: "Butwal-10, Rupandehi",
          openingBalance: 0,
          targetBalance: 68_500,
        },
        {
          key: "egg-center" as const,
          name: "Bharatpur Hatching Egg Centre",
          phone: "+9779845082003",
          address: "Bharatpur-11, Chitwan",
          openingBalance: 0,
          targetBalance: 34_700,
        },
        {
          key: "meat-house" as const,
          name: "Annapurna Meat House",
          phone: "+9779845082004",
          address: "Narayangarh, Chitwan",
          openingBalance: 0,
          targetBalance: 19_400,
        },
      ];

      const partyIds: Record<PartyKey, string> = {
        metro: id("party-metro"),
        sunrise: id("party-sunrise"),
        "egg-center": id("party-egg-center"),
        "meat-house": id("party-meat-house"),
      };

      for (const party of partySeeds) {
        await upsertById(tx.hatcheryParty, partyIds[party.key], {
          hatcheryOwnerId: user.id,
          name: party.name,
          phone: party.phone,
          address: party.address,
          openingBalance: decimal(party.openingBalance),
          balance: decimal(0),
        });
      }

      const eggTotals = {
        active: { hatchable: 0, table: 0, cracked: 0 },
        closed: { hatchable: 0, table: 0, cracked: 0 },
      };

      const seedEggProduction = async (
        scope: "active" | "closed",
        batchId: string,
        key: string,
        date: Date,
        hatchable: number,
        table: number,
        cracked: number,
      ) => {
        const productionId = id(`egg-production-${key}`);
        await upsertById(tx.hatcheryEggProduction, productionId, {
          batchId,
          date,
          note:
            scope === "active"
              ? "Daily grading from Cobb 500 parent flock"
              : "Historical daily grading from completed Ross flock",
        });

        const lines = [
          ["hatchable", hatchable],
          ["table", table],
          ["cracked", cracked],
        ] as const;
        for (const [eggTypeKey, count] of lines) {
          await upsertById(
            tx.hatcheryEggProductionLine,
            id(`egg-production-${key}-${eggTypeKey}-line`),
            {
              productionId,
              eggTypeId: id(`egg-type-${eggTypeKey}`),
              count,
            },
          );
          await upsertById(
            tx.hatcheryEggTxn,
            id(`egg-production-${key}-${eggTypeKey}-txn`),
            {
              batchId,
              eggTypeId: id(`egg-type-${eggTypeKey}`),
              type: HatcheryEggTxnType.PRODUCTION,
              count,
              date,
              sourceId: productionId,
              note: "Egg production recorded after grading",
            },
          );
          eggTotals[scope][eggTypeKey] += count;
        }
      };

      for (let index = 0; index < 45; index += 1) {
        const ago = 44 - index;
        await seedEggProduction(
          "active",
          activeBatchId,
          `active-${String(ago).padStart(2, "0")}`,
          daysAgo(ago, 7),
          2780 + ((index * 37) % 221),
          145 + ((index * 11) % 61),
          12 + ((index * 5) % 17),
        );
      }

      for (let index = 0; index < 31; index += 1) {
        const ago = 300 - index;
        await seedEggProduction(
          "closed",
          closedBatchId,
          `closed-${ago}`,
          daysAgo(ago, 7),
          580 + ((index * 17) % 101),
          42 + ((index * 7) % 19),
          4 + ((index * 3) % 7),
        );
      }

      type HatchResultSeed = {
        hatchedAgo: number;
        hatchedA: number;
        hatchedB: number;
        cull: number;
        lateDead: number;
        unhatched: number;
        soldA: number;
        soldB: number;
        soldCull: number;
        priceA: number;
        priceB: number;
        priceCull: number;
        historical: boolean;
      };

      type IncubationSeed = {
        key: string;
        code: string;
        name: string;
        parentBatchId: string;
        startAgo: number;
        eggsSet: number;
        stage: HatcheryIncubationStage;
        candledAgo?: number;
        transferredAgo?: number;
        infertile?: number;
        earlyDead?: number;
        result?: HatchResultSeed;
      };

      const incubationSeeds: IncubationSeed[] = [
        {
          key: "in-001",
          code: "IN-001",
          name: "Cobb Cycle 01",
          parentBatchId: activeBatchId,
          startAgo: 40,
          eggsSet: 8000,
          stage: HatcheryIncubationStage.COMPLETED,
          candledAgo: 33,
          transferredAgo: 22,
          infertile: 600,
          earlyDead: 180,
          result: {
            hatchedAgo: 19,
            hatchedA: 6600,
            hatchedB: 300,
            cull: 80,
            lateDead: 140,
            unhatched: 100,
            soldA: 6200,
            soldB: 250,
            soldCull: 50,
            priceA: 95,
            priceB: 75,
            priceCull: 25,
            historical: false,
          },
        },
        {
          key: "in-002",
          code: "IN-002",
          name: "Cobb Cycle 02",
          parentBatchId: activeBatchId,
          startAgo: 34,
          eggsSet: 9000,
          stage: HatcheryIncubationStage.COMPLETED,
          candledAgo: 27,
          transferredAgo: 16,
          infertile: 650,
          earlyDead: 200,
          result: {
            hatchedAgo: 13,
            hatchedA: 7500,
            hatchedB: 350,
            cull: 80,
            lateDead: 120,
            unhatched: 100,
            soldA: 7200,
            soldB: 300,
            soldCull: 80,
            priceA: 98,
            priceB: 78,
            priceCull: 25,
            historical: false,
          },
        },
        {
          key: "in-003",
          code: "IN-003",
          name: "Cobb Cycle 03",
          parentBatchId: activeBatchId,
          startAgo: 28,
          eggsSet: 9500,
          stage: HatcheryIncubationStage.COMPLETED,
          candledAgo: 21,
          transferredAgo: 10,
          infertile: 700,
          earlyDead: 220,
          result: {
            hatchedAgo: 7,
            hatchedA: 7900,
            hatchedB: 380,
            cull: 80,
            lateDead: 120,
            unhatched: 100,
            soldA: 7600,
            soldB: 330,
            soldCull: 50,
            priceA: 97,
            priceB: 77,
            priceCull: 25,
            historical: false,
          },
        },
        {
          key: "in-004",
          code: "IN-004",
          name: "Cobb Cycle 04",
          parentBatchId: activeBatchId,
          startAgo: 22,
          eggsSet: 9000,
          stage: HatcheryIncubationStage.COMPLETED,
          candledAgo: 15,
          transferredAgo: 4,
          infertile: 620,
          earlyDead: 180,
          result: {
            hatchedAgo: 1,
            hatchedA: 7550,
            hatchedB: 350,
            cull: 80,
            lateDead: 120,
            unhatched: 100,
            soldA: 7200,
            soldB: 300,
            soldCull: 50,
            priceA: 99,
            priceB: 79,
            priceCull: 25,
            historical: false,
          },
        },
        {
          key: "in-005",
          code: "IN-005",
          name: "Cobb Cycle 05 – In Hatcher",
          parentBatchId: activeBatchId,
          startAgo: 18,
          eggsSet: 9000,
          stage: HatcheryIncubationStage.HATCHER,
          candledAgo: 11,
          transferredAgo: 0,
          infertile: 600,
          earlyDead: 180,
        },
        {
          key: "in-006",
          code: "IN-006",
          name: "Cobb Cycle 06 – Candled",
          parentBatchId: activeBatchId,
          startAgo: 8,
          eggsSet: 8500,
          stage: HatcheryIncubationStage.CANDLING,
          candledAgo: 1,
          infertile: 500,
          earlyDead: 150,
        },
        {
          key: "in-007",
          code: "IN-007",
          name: "Cobb Cycle 07 – Setter",
          parentBatchId: activeBatchId,
          startAgo: 3,
          eggsSet: 8000,
          stage: HatcheryIncubationStage.SETTER,
        },
        {
          key: "in-008",
          code: "IN-008",
          name: "Ross Historical Cycle 01",
          parentBatchId: closedBatchId,
          startAgo: 292,
          eggsSet: 5000,
          stage: HatcheryIncubationStage.COMPLETED,
          candledAgo: 285,
          transferredAgo: 274,
          infertile: 400,
          earlyDead: 120,
          result: {
            hatchedAgo: 271,
            hatchedA: 4100,
            hatchedB: 200,
            cull: 50,
            lateDead: 70,
            unhatched: 60,
            soldA: 4100,
            soldB: 200,
            soldCull: 50,
            priceA: 88,
            priceB: 68,
            priceCull: 20,
            historical: true,
          },
        },
        {
          key: "in-009",
          code: "IN-009",
          name: "Ross Historical Cycle 02",
          parentBatchId: closedBatchId,
          startAgo: 282,
          eggsSet: 6000,
          stage: HatcheryIncubationStage.COMPLETED,
          candledAgo: 275,
          transferredAgo: 264,
          infertile: 450,
          earlyDead: 150,
          result: {
            hatchedAgo: 261,
            hatchedA: 4950,
            hatchedB: 250,
            cull: 50,
            lateDead: 80,
            unhatched: 70,
            soldA: 4950,
            soldB: 250,
            soldCull: 50,
            priceA: 90,
            priceB: 70,
            priceCull: 20,
            historical: true,
          },
        },
        {
          key: "in-010",
          code: "IN-010",
          name: "Ross Historical Cycle 03",
          parentBatchId: closedBatchId,
          startAgo: 272,
          eggsSet: 6000,
          stage: HatcheryIncubationStage.COMPLETED,
          candledAgo: 265,
          transferredAgo: 254,
          infertile: 420,
          earlyDead: 130,
          result: {
            hatchedAgo: 251,
            hatchedA: 5000,
            hatchedB: 250,
            cull: 50,
            lateDead: 80,
            unhatched: 70,
            soldA: 5000,
            soldB: 250,
            soldCull: 50,
            priceA: 92,
            priceB: 72,
            priceCull: 20,
            historical: true,
          },
        },
      ];

      const activeEggsSet = incubationSeeds
        .filter((seed) => seed.parentBatchId === activeBatchId)
        .reduce((sum, seed) => sum + seed.eggsSet, 0);
      const closedEggsSet = incubationSeeds
        .filter((seed) => seed.parentBatchId === closedBatchId)
        .reduce((sum, seed) => sum + seed.eggsSet, 0);

      for (const incubation of incubationSeeds) {
        const incubationId = id(`incubation-${incubation.key}`);
        await upsertById(tx.hatcheryIncubationBatch, incubationId, {
          hatcheryOwnerId: user.id,
          parentBatchId: incubation.parentBatchId,
          hatchableEggTypeId: id("egg-type-hatchable"),
          stage: incubation.stage,
          code: incubation.code,
          name: incubation.name,
          startDate: daysAgo(incubation.startAgo),
          eggsSetCount: incubation.eggsSet,
          setterAt: daysAgo(incubation.startAgo),
          candledAt:
            incubation.candledAgo === undefined
              ? null
              : daysAgo(incubation.candledAgo),
          transferredAt:
            incubation.transferredAgo === undefined
              ? null
              : daysAgo(incubation.transferredAgo),
          hatchedAt: incubation.result
            ? daysAgo(incubation.result.hatchedAgo)
            : null,
          notes: `Demo incubation linked to ${incubation.parentBatchId === activeBatchId ? "PF-001" : "PF-002"}`,
        });

        await upsertById(tx.hatcheryEggMove, id(`egg-move-${incubation.key}`), {
          incubationBatchId: incubationId,
          parentBatchId: incubation.parentBatchId,
          eggTypeId: id("egg-type-hatchable"),
          count: incubation.eggsSet,
          date: daysAgo(incubation.startAgo),
        });

        if ((incubation.infertile ?? 0) > 0) {
          await upsertById(
            tx.hatcheryIncubationLoss,
            id(`loss-${incubation.key}-infertile`),
            {
              incubationBatchId: incubationId,
              type: HatcheryIncubationLossType.INFERTILE,
              date: daysAgo(incubation.candledAgo!),
              count: incubation.infertile!,
              note: "Removed during candling",
            },
          );
        }
        if ((incubation.earlyDead ?? 0) > 0) {
          await upsertById(
            tx.hatcheryIncubationLoss,
            id(`loss-${incubation.key}-early-dead`),
            {
              incubationBatchId: incubationId,
              type: HatcheryIncubationLossType.EARLY_DEAD,
              date: daysAgo(incubation.candledAgo!),
              count: incubation.earlyDead!,
              note: "Early embryonic loss identified during candling",
            },
          );
        }

        if (!incubation.result) continue;
        const result = incubation.result;
        const hatchResultId = id(`hatch-result-${incubation.key}`);
        await upsertById(tx.hatcheryHatchResult, hatchResultId, {
          incubationBatchId: incubationId,
          date: daysAgo(result.hatchedAgo),
          hatchedA: result.hatchedA,
          hatchedB: result.hatchedB,
          cull: result.cull,
          lateDead: result.lateDead,
          unhatched: result.unhatched,
          note: "Final grading completed after hatch pull",
        });

        const gradeProduction = [
          [HatcheryChickGrade.A, "a", result.hatchedA],
          [HatcheryChickGrade.B, "b", result.hatchedB],
          [HatcheryChickGrade.CULL, "cull", result.cull],
        ] as const;
        for (const [grade, gradeKey, count] of gradeProduction) {
          await upsertById(
            tx.hatcheryChickTxn,
            id(`chick-production-${incubation.key}-${gradeKey}`),
            {
              incubationBatchId: incubationId,
              grade,
              type: HatcheryChickTxnType.PRODUCTION,
              count,
              date: daysAgo(result.hatchedAgo),
              sourceId: hatchResultId,
              note: "Chicks graded at hatch pull",
            },
          );
        }
      }

      const partySales: PartySaleEvent[] = [];

      for (const incubation of incubationSeeds) {
        if (!incubation.result) continue;
        const result = incubation.result;
        const incubationId = id(`incubation-${incubation.key}`);
        const saleAgo = Math.max(0, result.hatchedAgo - 1);
        const chickSaleSeeds = [
          {
            grade: HatcheryChickGrade.A,
            gradeKey: "a",
            count: result.soldA,
            produced: result.hatchedA,
            price: result.priceA,
            partyKey: (result.historical ? "sunrise" : "metro") as PartyKey,
          },
          {
            grade: HatcheryChickGrade.B,
            gradeKey: "b",
            count: result.soldB,
            produced: result.hatchedB,
            price: result.priceB,
            partyKey: "sunrise" as PartyKey,
          },
          {
            grade: HatcheryChickGrade.CULL,
            gradeKey: "cull",
            count: result.soldCull,
            produced: result.cull,
            price: result.priceCull,
            partyKey: "sunrise" as PartyKey,
          },
        ];

        for (const saleSeed of chickSaleSeeds) {
          const saleId = id(
            `chick-sale-${incubation.key}-${saleSeed.gradeKey}`,
          );
          const amount = round2(saleSeed.count * saleSeed.price);
          const date = daysAgo(saleAgo, 11);

          await upsertById(tx.hatcheryChickSale, saleId, {
            incubationBatchId: incubationId,
            grade: saleSeed.grade,
            date,
            count: saleSeed.count,
            unitPrice: decimal(saleSeed.price),
            amount: decimal(amount),
            partyId: partyIds[saleSeed.partyKey],
            note: `${incubation.code} ${saleSeed.grade} grade chick dispatch`,
            inventoryItemId: null,
          });
          await upsertById(
            tx.hatcheryChickTxn,
            id(`chick-sale-${incubation.key}-${saleSeed.gradeKey}-txn`),
            {
              incubationBatchId: incubationId,
              grade: saleSeed.grade,
              type: HatcheryChickTxnType.SALE,
              count: -saleSeed.count,
              date,
              sourceId: saleId,
              note: "Chick sale dispatch",
            },
          );
          await upsertById(
            tx.hatcheryChickStock,
            id(`chick-stock-${incubation.key}-${saleSeed.gradeKey}`),
            {
              incubationBatchId: incubationId,
              grade: saleSeed.grade,
              currentStock: saleSeed.produced - saleSeed.count,
            },
          );

          partySales.push({
            key: `chick-${incubation.key}-${saleSeed.gradeKey}`,
            partyKey: saleSeed.partyKey,
            date,
            amount,
            sourceType: "chick_sale",
            sourceId: saleId,
            note: `${incubation.code} ${saleSeed.grade} grade chicks`,
          });
        }
      }

      const activeHatchableSaleTotal =
        eggTotals.active.hatchable - activeEggsSet - 12_500;
      const activeTableSaleTotal = eggTotals.active.table - 900;
      const activeCrackedSaleTotal = eggTotals.active.cracked - 150;
      const closedHatchableSaleTotal =
        eggTotals.closed.hatchable - closedEggsSet;

      if (
        activeHatchableSaleTotal <= 40_000 ||
        activeTableSaleTotal <= 0 ||
        activeCrackedSaleTotal <= 0 ||
        closedHatchableSaleTotal <= 0
      ) {
        throw new Error("Hatchery egg seed reconciliation produced invalid stock");
      }

      const eggSaleSeeds: Array<{
        key: string;
        batchId: string;
        eggTypeKey: "hatchable" | "table" | "cracked";
        date: Date;
        count: number;
        unitPrice: number;
        partyKey: PartyKey | null;
        note: string;
      }> = [
        {
          key: "active-hatchable-1",
          batchId: activeBatchId,
          eggTypeKey: "hatchable",
          date: daysAgo(2, 12),
          count: 20_000,
          unitPrice: 18,
          partyKey: "egg-center",
          note: "Graded hatching eggs supplied under weekly contract",
        },
        {
          key: "active-hatchable-2",
          batchId: activeBatchId,
          eggTypeKey: "hatchable",
          date: daysAgo(1, 12),
          count: 20_000,
          unitPrice: 18.25,
          partyKey: "egg-center",
          note: "Second weekly hatching egg dispatch",
        },
        {
          key: "active-hatchable-cash",
          batchId: activeBatchId,
          eggTypeKey: "hatchable",
          date: daysAgo(0, 10),
          count: activeHatchableSaleTotal - 40_000,
          unitPrice: 18.5,
          partyKey: null,
          note: "Farm-gate cash sale of surplus hatching eggs",
        },
        {
          key: "active-table-1",
          batchId: activeBatchId,
          eggTypeKey: "table",
          date: daysAgo(5, 13),
          count: Math.floor(activeTableSaleTotal * 0.6),
          unitPrice: 13,
          partyKey: "egg-center",
          note: "Sale of non-settable table eggs",
        },
        {
          key: "active-table-2",
          batchId: activeBatchId,
          eggTypeKey: "table",
          date: daysAgo(0, 13),
          count:
            activeTableSaleTotal - Math.floor(activeTableSaleTotal * 0.6),
          unitPrice: 13.5,
          partyKey: "egg-center",
          note: "Current table egg dispatch",
        },
        {
          key: "active-cracked",
          batchId: activeBatchId,
          eggTypeKey: "cracked",
          date: daysAgo(0, 14),
          count: activeCrackedSaleTotal,
          unitPrice: 6,
          partyKey: null,
          note: "Discount cash sale of cracked eggs",
        },
        {
          key: "closed-hatchable-1",
          batchId: closedBatchId,
          eggTypeKey: "hatchable",
          date: daysAgo(269, 12),
          count: Math.floor(closedHatchableSaleTotal / 2),
          unitPrice: 16,
          partyKey: "egg-center",
          note: "Historical hatching egg dispatch",
        },
        {
          key: "closed-hatchable-2",
          batchId: closedBatchId,
          eggTypeKey: "hatchable",
          date: daysAgo(268, 12),
          count:
            closedHatchableSaleTotal -
            Math.floor(closedHatchableSaleTotal / 2),
          unitPrice: 16.5,
          partyKey: "egg-center",
          note: "Final hatching egg dispatch from PF-002",
        },
        {
          key: "closed-table",
          batchId: closedBatchId,
          eggTypeKey: "table",
          date: daysAgo(267, 12),
          count: eggTotals.closed.table,
          unitPrice: 11,
          partyKey: "egg-center",
          note: "Historical table egg sale",
        },
        {
          key: "closed-cracked",
          batchId: closedBatchId,
          eggTypeKey: "cracked",
          date: daysAgo(267, 14),
          count: eggTotals.closed.cracked,
          unitPrice: 5,
          partyKey: "egg-center",
          note: "Historical cracked egg sale",
        },
      ];

      for (const sale of eggSaleSeeds) {
        const saleId = id(`egg-sale-${sale.key}`);
        const amount = round2(sale.count * sale.unitPrice);
        await upsertById(tx.hatcheryEggSale, saleId, {
          batchId: sale.batchId,
          eggTypeId: id(`egg-type-${sale.eggTypeKey}`),
          date: sale.date,
          count: sale.count,
          unitPrice: decimal(sale.unitPrice),
          amount: decimal(amount),
          partyId: sale.partyKey ? partyIds[sale.partyKey] : null,
          note: sale.note,
        });
        await upsertById(tx.hatcheryEggTxn, id(`egg-sale-${sale.key}-txn`), {
          batchId: sale.batchId,
          eggTypeId: id(`egg-type-${sale.eggTypeKey}`),
          type: HatcheryEggTxnType.SALE,
          count: -sale.count,
          date: sale.date,
          sourceId: saleId,
          note: sale.note,
        });

        if (sale.partyKey) {
          partySales.push({
            key: `egg-${sale.key}`,
            partyKey: sale.partyKey,
            date: sale.date,
            amount,
            sourceType: "egg_sale",
            sourceId: saleId,
            note: sale.note,
          });
        }
      }

      const eggStockSeeds = [
        ["active-hatchable", activeBatchId, "hatchable", 12_500],
        ["active-table", activeBatchId, "table", 900],
        ["active-cracked", activeBatchId, "cracked", 150],
        ["active-reject", activeBatchId, "reject", 0],
        ["closed-hatchable", closedBatchId, "hatchable", 0],
        ["closed-table", closedBatchId, "table", 0],
        ["closed-cracked", closedBatchId, "cracked", 0],
        ["closed-reject", closedBatchId, "reject", 0],
      ] as const;
      for (const [key, batchId, eggTypeKey, currentStock] of eggStockSeeds) {
        await upsertById(tx.hatcheryEggStock, id(`egg-stock-${key}`), {
          batchId,
          eggTypeId: id(`egg-type-${eggTypeKey}`),
          currentStock,
        });
      }

      const parentSaleSeeds = [
        {
          key: "active",
          batchId: activeBatchId,
          date: daysAgo(10, 11),
          count: 100,
          totalWeightKg: 340,
          ratePerKg: 250,
          partyKey: "meat-house" as const,
          note: "Sale of selected non-performing parent birds",
        },
        {
          key: "closed",
          batchId: closedBatchId,
          date: daysAgo(112, 11),
          count: 960,
          totalWeightKg: 3264,
          ratePerKg: 225,
          partyKey: "meat-house" as const,
          note: "Final depopulation sale for completed PF-002",
        },
      ];
      for (const sale of parentSaleSeeds) {
        const saleId = id(`parent-sale-${sale.key}`);
        const avgWeightKg = round4(sale.totalWeightKg / sale.count);
        const amount = round2(sale.totalWeightKg * sale.ratePerKg);
        await upsertById(tx.hatcheryParentSale, saleId, {
          batchId: sale.batchId,
          date: sale.date,
          count: sale.count,
          totalWeightKg: decimal(sale.totalWeightKg),
          avgWeightKg: decimal(avgWeightKg),
          ratePerKg: decimal(sale.ratePerKg),
          amount: decimal(amount),
          partyId: partyIds[sale.partyKey],
          note: sale.note,
        });
        partySales.push({
          key: `parent-${sale.key}`,
          partyKey: sale.partyKey,
          date: sale.date,
          amount,
          sourceType: "parent_sale",
          sourceId: saleId,
          note: sale.note,
        });
      }

      for (const party of partySeeds) {
        const sales = partySales.filter((sale) => sale.partyKey === party.key);
        const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
        const paymentAmount = round2(
          party.openingBalance + totalSales - party.targetBalance,
        );
        if (paymentAmount <= 0) {
          throw new Error(`Invalid payment reconciliation for ${party.name}`);
        }

        const paymentId = id(`party-${party.key}-payment`);
        const paymentDate = daysAgo(0, 16);
        await upsertById(tx.hatcheryPartyPayment, paymentId, {
          partyId: partyIds[party.key],
          date: paymentDate,
          amount: decimal(paymentAmount),
          method: party.key === "sunrise" ? "Bank transfer" : "Cheque / bank",
          note: "Consolidated payment against outstanding invoices",
        });

        const ledgerEvents: Array<{
          key: string;
          type: HatcheryPartyTxnType;
          date: Date;
          amount: number;
          sourceType: string;
          sourceId: string | null;
          note: string;
        }> = [
          ...(party.openingBalance > 0
            ? [
                {
                  key: "opening",
                  type: HatcheryPartyTxnType.OPENING_BALANCE,
                  date: daysAgo(500),
                  amount: party.openingBalance,
                  sourceType: "opening_balance",
                  sourceId: null,
                  note: "Opening customer balance",
                },
              ]
            : []),
          ...sales.map((sale) => ({
            key: sale.key,
            type: HatcheryPartyTxnType.SALE,
            date: sale.date,
            amount: sale.amount,
            sourceType: sale.sourceType,
            sourceId: sale.sourceId,
            note: sale.note,
          })),
          {
            key: "payment",
            type: HatcheryPartyTxnType.PAYMENT,
            date: paymentDate,
            amount: -paymentAmount,
            sourceType: "payment",
            sourceId: paymentId,
            note: "Consolidated payment received",
          },
        ].sort((a, b) => {
          const dateOrder = a.date.getTime() - b.date.getTime();
          return dateOrder === 0 ? a.key.localeCompare(b.key) : dateOrder;
        });

        let runningBalance = 0;
        for (const event of ledgerEvents) {
          runningBalance = round2(runningBalance + event.amount);
          await upsertById(
            tx.hatcheryPartyTxn,
            id(`party-${party.key}-${event.key}-txn`),
            {
              partyId: partyIds[party.key],
              type: event.type,
              date: event.date,
              amount: decimal(event.amount),
              balanceAfter: decimal(runningBalance),
              sourceType: event.sourceType,
              sourceId: event.sourceId,
              note: event.note,
            },
          );
        }

        await upsertById(tx.hatcheryParty, partyIds[party.key], {
          hatcheryOwnerId: user.id,
          name: party.name,
          phone: party.phone,
          address: party.address,
          openingBalance: decimal(party.openingBalance),
          balance: decimal(runningBalance),
        });
      }

      const receivedByItem = new Map<InventoryKey, number>();
      for (const event of supplierEvents) {
        for (const item of event.items ?? []) {
          receivedByItem.set(
            item.inventoryKey,
            (receivedByItem.get(item.inventoryKey) ?? 0) +
              item.quantity +
              item.freeQuantity,
          );
        }
      }
      const usedByItem = new Map<InventoryKey, number>();
      for (const placement of placementSeeds) {
        usedByItem.set(
          placement.inventoryKey,
          (usedByItem.get(placement.inventoryKey) ?? 0) + placement.quantity,
        );
      }
      for (const expense of inventoryExpenseSeeds) {
        usedByItem.set(
          expense.inventoryKey,
          (usedByItem.get(expense.inventoryKey) ?? 0) + expense.quantity,
        );
      }
      for (const item of inventorySeeds) {
        const reconciledStock =
          (receivedByItem.get(item.key) ?? 0) -
          (usedByItem.get(item.key) ?? 0);
        if (reconciledStock !== item.currentStock) {
          throw new Error(
            `Inventory reconciliation failed for ${item.name}: expected ${item.currentStock}, calculated ${reconciledStock}`,
          );
        }
      }

      for (const incubation of incubationSeeds) {
        if (!incubation.result) continue;
        const result = incubation.result;
        const fertileEggs =
          incubation.eggsSet -
          (incubation.infertile ?? 0) -
          (incubation.earlyDead ?? 0);
        const recordedOutcome =
          result.hatchedA +
          result.hatchedB +
          result.cull +
          result.lateDead +
          result.unhatched;
        if (fertileEggs !== recordedOutcome) {
          throw new Error(
            `Hatch result reconciliation failed for ${incubation.code}`,
          );
        }
        if (
          result.soldA > result.hatchedA ||
          result.soldB > result.hatchedB ||
          result.soldCull > result.cull
        ) {
          throw new Error(
            `Chick stock reconciliation failed for ${incubation.code}`,
          );
        }
      }

      const staffSeeds = [
        {
          key: "rajesh",
          name: "Rajesh Mahato",
          startDate: daysAgo(430),
          endDate: null,
          status: StaffStatus.ACTIVE,
          monthlyAmount: 32_000,
          paymentAmount: 64_000,
          paidAt: daysAgo(10),
          note: "Two months salary for incubation operations",
        },
        {
          key: "mina",
          name: "Mina Gurung",
          startDate: daysAgo(320),
          endDate: null,
          status: StaffStatus.ACTIVE,
          monthlyAmount: 30_000,
          paymentAmount: 30_000,
          paidAt: daysAgo(15),
          note: "Monthly salary for egg grading and chick dispatch",
        },
        {
          key: "dipak",
          name: "Dipak Chaudhary",
          startDate: daysAgo(280),
          endDate: daysAgo(45),
          status: StaffStatus.STOPPED,
          monthlyAmount: 27_000,
          paymentAmount: 18_000,
          paidAt: daysAgo(48),
          note: "Final partial salary settlement",
        },
      ];
      for (const staff of staffSeeds) {
        const staffId = id(`staff-${staff.key}`);
        await upsertById(tx.staff, staffId, {
          ownerId: user.id,
          name: staff.name,
          startDate: staff.startDate,
          endDate: staff.endDate,
          status: staff.status,
        });
        await upsertById(tx.staffSalary, id(`staff-${staff.key}-salary`), {
          staffId,
          monthlyAmount: decimal(staff.monthlyAmount),
          effectiveFrom: staff.startDate,
        });
        await upsertById(tx.staffPayment, id(`staff-${staff.key}-payment`), {
          staffId,
          amount: decimal(staff.paymentAmount),
          paidAt: staff.paidAt,
          note: staff.note,
          receiptImageUrl: null,
        });
      }

      const notificationSeeds = [
        {
          key: "low-disinfectant",
          type: "LOW_INVENTORY",
          title: "Disinfectant stock below minimum",
          body: "10 bottles remain against a minimum stock level of 12.",
          status: NotificationStatus.UNREAD,
          createdAt: daysAgo(1),
          data: { url: "/hatchery/dashboard/inventory" },
        },
        {
          key: "hatcher-ready",
          type: "HATCHERY_STAGE",
          title: "IN-005 transferred to hatcher",
          body: "Prepare chick boxes and grading space for the upcoming hatch pull.",
          status: NotificationStatus.UNREAD,
          createdAt: daysAgo(0),
          data: {
            url: `/hatchery/dashboard/incubations/${id("incubation-in-005")}`,
          },
        },
        {
          key: "party-balance",
          type: "PAYMENT_DUE",
          title: "Customer balances need follow-up",
          body: "Review outstanding hatchery party balances after today's dispatches.",
          status: NotificationStatus.READ,
          createdAt: daysAgo(3),
          data: { url: "/hatchery/dashboard/parties" },
        },
      ];
      for (const notification of notificationSeeds) {
        await upsertById(
          tx.notification,
          id(`notification-${notification.key}`),
          {
            userId: user.id,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            data: notification.data,
            status: notification.status,
            createdAt: notification.createdAt,
            readAt:
              notification.status === NotificationStatus.READ
                ? daysAgo(2)
                : null,
          },
        );
      }
    },
    { maxWait: 10_000, timeout: 300_000 },
  );

  printDemoCredentials("Hatchery", account);
}

seedDemoHatchery()
  .catch((error) => {
    console.error("Hatchery demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
