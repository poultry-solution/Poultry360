import {
  CategoryType,
  InventoryItemType,
  InventoryTransactionType,
  Prisma,
  PurchaseCategory,
} from "@prisma/client";

type InventoryDb = Pick<
  Prisma.TransactionClient,
  "inventoryTransaction" | "category"
>;

export const PURCHASE_CATEGORY_TO_ITEM_TYPE: Record<
  PurchaseCategory,
  InventoryItemType
> = {
  FEED: InventoryItemType.FEED,
  MEDICINE: InventoryItemType.MEDICINE,
  CHICKS: InventoryItemType.CHICKS,
  EQUIPMENT: InventoryItemType.EQUIPMENT,
  RAW_MATERIAL: InventoryItemType.RAW_MATERIAL,
  OTHER: InventoryItemType.OTHER,
};

export const INVENTORY_CATEGORY_NAMES: Record<InventoryItemType, string> = {
  FEED: "Feed",
  CHICKS: "Chicks",
  MEDICINE: "Medicine",
  EQUIPMENT: "Equipment",
  RAW_MATERIAL: "Raw Material",
  OTHER: "Other",
};

export const ensureFarmerInventoryCategory = async (
  tx: InventoryDb,
  userId: string,
  itemType: InventoryItemType
) => {
  const name = INVENTORY_CATEGORY_NAMES[itemType];
  return tx.category.upsert({
    where: {
      userId_type_name: { userId, type: CategoryType.INVENTORY, name },
    },
    update: {},
    create: {
      userId,
      type: CategoryType.INVENTORY,
      name,
      description: `Category for ${name} items`,
    },
  });
};

export const getFarmerInventoryUnitCosts = async (
  tx: InventoryDb,
  itemIds: string[]
) => {
  const uniqueIds = [...new Set(itemIds)];
  if (uniqueIds.length === 0) return new Map<string, Prisma.Decimal>();

  const rows = await tx.inventoryTransaction.groupBy({
    by: ["itemId"],
    where: {
      itemId: { in: uniqueIds },
      type: {
        in: [
          InventoryTransactionType.PURCHASE,
          InventoryTransactionType.PRODUCTION_OUTPUT,
        ],
      },
    },
    _sum: { totalAmount: true, quantity: true },
  });

  return new Map(
    rows.map((row) => {
      const quantity = new Prisma.Decimal(row._sum.quantity ?? 0);
      const amount = new Prisma.Decimal(row._sum.totalAmount ?? 0);
      return [
        row.itemId,
        quantity.gt(0) ? amount.div(quantity).toDecimalPlaces(4) : new Prisma.Decimal(0),
      ];
    })
  );
};
