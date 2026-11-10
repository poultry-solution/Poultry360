jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    farm: { findUnique: jest.fn() },
    batch: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inventoryItem: { findFirst: jest.fn(), updateMany: jest.fn() },
    inventoryUsage: { create: jest.fn() },
    expense: { create: jest.fn() },
    inventoryTransaction: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("../../src/services/farmerFcrService", () => ({
  calculateFarmerBatchFcr: jest.fn(),
  endOfNepalDay: jest.fn(),
  getFarmerBatchFcrHistory: jest.fn(),
  refreshFarmerFcrHistorySafely: jest.fn(),
  startOfNepalDay: jest.fn(),
}));

jest.mock("../../src/services/farmerInventoryDomain", () => ({
  getFarmerInventoryUnitCosts: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
import { refreshFarmerFcrHistorySafely } from "../../src/services/farmerFcrService";
import { getFarmerInventoryUnitCosts } from "../../src/services/farmerInventoryDomain";
import { createBatch, updateBatch } from "../../src/controller/batchController";

const mockedPrisma = prisma as unknown as {
  farm: { findUnique: jest.Mock };
  batch: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  inventoryItem: { findFirst: jest.Mock; updateMany: jest.Mock };
  inventoryUsage: { create: jest.Mock };
  expense: { create: jest.Mock };
  inventoryTransaction: { create: jest.Mock };
  $transaction: jest.Mock;
};
const mockedRefresh = refreshFarmerFcrHistorySafely as jest.Mock;
const mockedInventoryCosts = getFarmerInventoryUnitCosts as jest.Mock;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

function existingBatch(status: "ACTIVE" | "COMPLETED") {
  return {
    id: "batch-1",
    batchNumber: "B-1",
    farmId: "farm-1",
    batchType: "BROILER",
    status,
    farm: {
      ownerId: "farmer-1",
    },
  };
}

describe("Farmer batch cFCR (account standard, no per-batch settings)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRefresh.mockResolvedValue(undefined);
    mockedPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockedPrisma) => unknown) =>
        callback(mockedPrisma),
    );
  });

  it("creates a Broiler batch without per-batch cFCR settings (the account standard is used)", async () => {
    mockedPrisma.farm.findUnique.mockResolvedValue({
      id: "farm-1",
      ownerId: "farmer-1",
    });
    mockedPrisma.batch.findUnique.mockResolvedValue(null);
    mockedInventoryCosts.mockResolvedValue(new Map([["chicks-1", 10]]));
    mockedPrisma.inventoryItem.findFirst.mockResolvedValue({
      id: "chicks-1",
      name: "Broiler chicks",
      currentStock: 100,
      unitPrice: 10,
      categoryId: "category-1",
    });
    mockedPrisma.batch.create.mockResolvedValue({
      id: "batch-1",
      farmId: "farm-1",
      batchNumber: "B-1",
    });
    mockedPrisma.inventoryUsage.create.mockResolvedValue({ id: "usage-1" });
    mockedPrisma.expense.create.mockResolvedValue({ id: "expense-1" });
    mockedPrisma.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    mockedPrisma.inventoryTransaction.create.mockResolvedValue({ id: "tx-1" });
    const response = makeResponse();

    await createBatch(
      {
        userId: "farmer-1",
        role: "OWNER",
        body: {
          batchNumber: "B-1",
          batchType: "BROILER",
          farmId: "farm-1",
          startDate: "2026-10-01T00:00:00.000Z",
          initialChickWeight: 0.045,
          chicksInventory: [{ itemId: "chicks-1", quantity: 100 }],
        },
      } as any,
      response,
    );

    const created = mockedPrisma.batch.create.mock.calls[0][0].data;
    expect(created).not.toHaveProperty("cfcrTargetWeightKg");
    expect(created).not.toHaveProperty("cfcrCorrectionFactorPerKg");
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it("refuses cFCR fields when creating a batch", async () => {
    const response = makeResponse();
    await createBatch(
      {
        userId: "farmer-1",
        role: "OWNER",
        body: {
          batchNumber: "B-1",
          batchType: "BROILER",
          farmId: "farm-1",
          startDate: "2026-10-01T00:00:00.000Z",
          initialChickWeight: 0.045,
          cfcrTargetWeightKg: 2,
          chicksInventory: [{ itemId: "chicks-1", quantity: 100 }],
        },
      } as any,
      response,
    );
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "cFCR is set once for all batches in Settings." }),
    );
    expect(mockedPrisma.batch.create).not.toHaveBeenCalled();
  });

  it.each([
    ["an active batch", "ACTIVE" as const, { cfcrTargetWeightKg: 2.2, cfcrCorrectionFactorPerKg: 0.4 }],
    ["a closed batch", "COMPLETED" as const, { cfcrTargetWeightKg: 2.2 }],
    ["only the correction", "ACTIVE" as const, { cfcrCorrectionFactorPerKg: -0.1 }],
  ])("refuses per-batch cFCR changes on %s", async (_label, status, body) => {
    mockedPrisma.batch.findFirst.mockResolvedValue(existingBatch(status));
    const response = makeResponse();

    await updateBatch(
      { params: { id: "batch-1" }, userId: "farmer-1", role: "OWNER", body } as any,
      response,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "cFCR is set once for all batches in Settings." }),
    );
    expect(mockedPrisma.batch.update).not.toHaveBeenCalled();
    expect(mockedRefresh).not.toHaveBeenCalled();
  });
});
