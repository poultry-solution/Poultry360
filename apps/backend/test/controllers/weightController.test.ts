jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    birdWeight: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("../../src/services/farmerFcrService", () => ({
  endOfNepalDay: jest.fn((date: Date) => date),
  startOfNepalDay: jest.fn((date: Date) => date),
  refreshFarmerFcrHistorySafely: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
import { refreshFarmerFcrHistorySafely } from "../../src/services/farmerFcrService";
import { deleteBirdWeight } from "../../src/controller/weightController";

const mockedPrisma = prisma as unknown as {
  birdWeight: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};
const mockedRefreshFcr = refreshFarmerFcrHistorySafely as jest.Mock;

function makeResponse() {
  const response: any = {
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

function makeWeight(overrides: Record<string, unknown> = {}) {
  return {
    id: "weight-1",
    batchId: "batch-1",
    source: "MANUAL",
    batch: {
      status: "ACTIVE",
      farm: { ownerId: "owner-1", managers: [] },
    },
    ...overrides,
  };
}

describe("deleteBirdWeight", () => {
  const tx = {
    birdWeight: {
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    batch: { update: jest.fn() },
    batchFcrHistory: { deleteMany: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    mockedRefreshFcr.mockResolvedValue(undefined);
  });

  it("deletes an active manual weight and clears derived FCR history", async () => {
    mockedPrisma.birdWeight.findUnique.mockResolvedValue(makeWeight());
    tx.birdWeight.findFirst.mockResolvedValue({
      id: "weight-older",
      avgWeight: 1.25,
    });
    const response = makeResponse();

    await deleteBirdWeight({
      params: { batchId: "batch-1", weightId: "weight-1" },
      userId: "owner-1",
      role: "OWNER",
    } as any, response);

    expect(tx.birdWeight.delete).toHaveBeenCalledWith({ where: { id: "weight-1" } });
    expect(tx.birdWeight.findFirst).toHaveBeenCalledWith({
      where: { batchId: "batch-1" },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    });
    expect(tx.batch.update).toHaveBeenCalledWith({
      where: { id: "batch-1" },
      data: { currentWeight: 1.25 },
    });
    expect(tx.batchFcrHistory.deleteMany).toHaveBeenCalledWith({
      where: { batchId: "batch-1" },
    });
    expect(mockedRefreshFcr).toHaveBeenCalledWith("batch-1");
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      message: "Weight record deleted successfully",
    });
  });

  it("sets the cached current weight to null when no weight remains", async () => {
    mockedPrisma.birdWeight.findUnique.mockResolvedValue(makeWeight());
    tx.birdWeight.findFirst.mockResolvedValue(null);
    const response = makeResponse();

    await deleteBirdWeight({
      params: { batchId: "batch-1", weightId: "weight-1" },
      userId: "owner-1",
      role: "OWNER",
    } as any, response);

    expect(tx.batch.update).toHaveBeenCalledWith({
      where: { id: "batch-1" },
      data: { currentWeight: null },
    });
  });

  it("does not delete a weight from a closed batch", async () => {
    mockedPrisma.birdWeight.findUnique.mockResolvedValue(makeWeight({
      batch: {
        status: "COMPLETED",
        farm: { ownerId: "owner-1", managers: [] },
      },
    }));
    const response = makeResponse();

    await deleteBirdWeight({
      params: { batchId: "batch-1", weightId: "weight-1" },
      userId: "owner-1",
      role: "OWNER",
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      message: "Cannot delete weight from a closed batch",
    });
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not delete sale-generated weight", async () => {
    mockedPrisma.birdWeight.findUnique.mockResolvedValue(makeWeight({ source: "SALE" }));
    const response = makeResponse();

    await deleteBirdWeight({
      params: { batchId: "batch-1", weightId: "weight-1" },
      userId: "owner-1",
      role: "OWNER",
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });
});
