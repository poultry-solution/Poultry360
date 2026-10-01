jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
  },
}));

jest.mock("../../src/services/hatcheryInventoryService", () => ({
  HatcheryInventoryService: {
    upsertItemAndApplyPurchase: jest.fn(),
  },
}));

import { HatcheryPurchaseCategory, HatcherySex } from "@prisma/client";
import prisma from "../../src/utils/prisma";
import { HatcheryInventoryService } from "../../src/services/hatcheryInventoryService";
import { HatcherySupplierService } from "../../src/services/hatcherySupplierService";

const mockedPrisma = prisma as unknown as { $transaction: jest.Mock };
const mockedInventory = HatcheryInventoryService as unknown as {
  upsertItemAndApplyPurchase: jest.Mock;
};

function makeTransactionClient() {
  return {
    hatcherySupplier: {
      findFirst: jest.fn().mockResolvedValue({
        id: "supplier-1",
        balance: 100,
      }),
      update: jest.fn().mockResolvedValue({ id: "supplier-1" }),
    },
    hatcherySupplierTxn: {
      create: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ id: "purchase-1", ...data, items: [] }),
        ),
    },
  };
}

function purchaseInput(receiptImageUrl?: string) {
  return {
    supplierId: "supplier-1",
    hatcheryOwnerId: "hatchery-1",
    category: HatcheryPurchaseCategory.FEED,
    items: [
      {
        itemName: "Starter Feed",
        quantity: 2,
        unit: "bag",
        unitPrice: 100,
        totalAmount: 200,
        sex: HatcherySex.NA,
      },
    ],
    date: new Date("2026-10-01T00:00:00.000Z"),
    receiptImageUrl,
  };
}

describe("Hatchery supplier purchase bill", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedInventory.upsertItemAndApplyPurchase.mockResolvedValue(undefined);
  });

  it("stores a trimmed bill URL without changing purchase values", async () => {
    const tx = makeTransactionClient();
    mockedPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await HatcherySupplierService.addPurchaseTxn(
      purchaseInput(
        "  https://res.cloudinary.com/demo/image/upload/purchase-bills/bill.jpg  ",
      ),
    );

    expect(tx.hatcherySupplierTxn.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: 200,
        balanceAfter: 300,
        receiptImageUrl:
          "https://res.cloudinary.com/demo/image/upload/purchase-bills/bill.jpg",
      }),
      include: { items: true },
    });
    expect(mockedInventory.upsertItemAndApplyPurchase).toHaveBeenCalledTimes(1);
  });

  it("keeps old requests valid when no bill is sent", async () => {
    const tx = makeTransactionClient();
    mockedPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await HatcherySupplierService.addPurchaseTxn(purchaseInput());

    expect(tx.hatcherySupplierTxn.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ receiptImageUrl: null }),
      include: { items: true },
    });
  });
});
