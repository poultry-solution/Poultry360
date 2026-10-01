jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
  },
}));

jest.mock("../../src/services/farmerInventoryDomain", () => ({
  ensureFarmerInventoryCategory: jest.fn(),
  getFarmerInventoryUnitCosts: jest.fn(),
  PURCHASE_CATEGORY_TO_ITEM_TYPE: {
    FEED: "FEED",
    MEDICINE: "MEDICINE",
    CHICKS: "CHICKS",
    RAW_MATERIAL: "RAW_MATERIAL",
    OTHER: "OTHER",
  },
}));

import { PurchaseCategory } from "@prisma/client";
import prisma from "../../src/utils/prisma";
import { ensureFarmerInventoryCategory } from "../../src/services/farmerInventoryDomain";
import { InventoryService } from "../../src/services/inventoryService";

const mockedPrisma = prisma as unknown as {
  $transaction: jest.Mock;
};
const mockedEnsureCategory = ensureFarmerInventoryCategory as jest.Mock;

function makeTransactionClient() {
  return {
    inventoryItem: {
      upsert: jest.fn().mockResolvedValue({
        id: "item-1",
        categoryId: "category-1",
        kgPerUnit: null,
      }),
      update: jest.fn().mockResolvedValue({ id: "item-1" }),
    },
    expense: {
      create: jest.fn().mockResolvedValue({ id: "expense-1" }),
    },
    inventoryTransaction: {
      create: jest.fn().mockResolvedValue({ id: "inventory-txn-1" }),
    },
    entityTransaction: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: "entity-txn-1", ...data }),
      ),
    },
  };
}

function purchaseInput(imageUrl?: string) {
  return {
    dealerId: "supplier-1",
    itemName: "Starter Feed",
    quantity: 2,
    unitPrice: 100,
    totalAmount: 200,
    date: new Date("2026-10-01T00:00:00.000Z"),
    purchaseCategory: PurchaseCategory.FEED,
    userId: "farmer-1",
    imageUrl,
  };
}

describe("Farmer supplier purchase bill", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureCategory.mockResolvedValue({ id: "category-1" });
  });

  it("stores a trimmed bill URL on the purchase transaction", async () => {
    const tx = makeTransactionClient();
    mockedPrisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    await InventoryService.processSupplierPurchase(
      purchaseInput("  https://res.cloudinary.com/demo/image/upload/purchase-bills/bill.jpg  "),
    );

    expect(tx.entityTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "PURCHASE",
        imageUrl: "https://res.cloudinary.com/demo/image/upload/purchase-bills/bill.jpg",
      }),
    });
    expect(tx.expense.create).toHaveBeenCalledTimes(1);
    expect(tx.inventoryTransaction.create).toHaveBeenCalledTimes(1);
  });

  it("keeps old purchase requests compatible when no bill is sent", async () => {
    const tx = makeTransactionClient();
    mockedPrisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    await InventoryService.processSupplierPurchase(purchaseInput());

    expect(tx.entityTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "PURCHASE",
        imageUrl: null,
      }),
    });
  });
});
