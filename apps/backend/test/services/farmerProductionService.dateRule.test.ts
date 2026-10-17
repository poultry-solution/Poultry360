jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: { $transaction: jest.fn() },
}));

jest.mock("../../src/services/farmerInventoryDomain", () => ({
  ...jest.requireActual("../../src/services/farmerInventoryDomain"),
  ensureFarmerInventoryCategory: jest.fn(),
  getFarmerInventoryUnitCosts: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
import { getFarmerInventoryUnitCosts } from "../../src/services/farmerInventoryDomain";
import { FarmerProductionService } from "../../src/services/farmerProductionService";
import { ProductionValidationError } from "../../src/services/productionDomain";

const mockedPrisma = prisma as unknown as { $transaction: jest.Mock };
const mockedUnitCosts = getFarmerInventoryUnitCosts as jest.Mock;

function makeTx(firstPurchase: Date | null) {
  return {
    inventoryItem: {
      findMany: jest.fn().mockResolvedValue([
        { id: "maize-40", name: "Maize", unitPrice: 40, createdAt: new Date("2026-10-07T09:00:00.000Z") },
      ]),
      updateMany: jest.fn(),
    },
    farmerManufacturedProduct: {
      findMany: jest.fn().mockResolvedValue([{ id: "grower", name: "Grower", outputItemType: "FEED" }]),
    },
    inventoryTransaction: {
      groupBy: jest
        .fn()
        .mockResolvedValue(firstPurchase ? [{ itemId: "maize-40", _min: { date: firstPurchase } }] : []),
    },
    farmerProductionRun: { create: jest.fn() },
  };
}

const request = (date: string) => ({
  farmerId: "farmer-1",
  date,
  inputs: [{ inventoryItemId: "maize-40", quantity: 100 }],
  outputs: [{ productId: "grower", quantity: 100, costAllocationPercent: 100 }],
});

describe("FarmerProductionService.create date rule", () => {
  beforeEach(() => jest.clearAllMocks());

  it("refuses a lot bought after the production date and writes nothing", async () => {
    const tx = makeTx(new Date("2026-10-07T08:45:00.000Z"));
    mockedPrisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await expect(FarmerProductionService.create(request("2026-10-05T00:00:00.000Z"))).rejects.toThrow(
      ProductionValidationError
    );
    expect(mockedUnitCosts).not.toHaveBeenCalled();
    expect(tx.inventoryItem.updateMany).not.toHaveBeenCalled();
    expect(tx.farmerProductionRun.create).not.toHaveBeenCalled();
  });

  it("lets a lot bought on the production day through", async () => {
    const tx = makeTx(new Date("2026-10-07T08:45:00.000Z"));
    mockedPrisma.$transaction.mockImplementation((cb: any) => cb(tx));
    mockedUnitCosts.mockRejectedValue(new Error("reached cost step"));

    await expect(FarmerProductionService.create(request("2026-10-07T00:00:00.000Z"))).rejects.toThrow(
      "reached cost step"
    );
    expect(mockedUnitCosts).toHaveBeenCalled();
  });

  it("uses the lot's created date when it has no purchase record", async () => {
    const tx = makeTx(null);
    mockedPrisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await expect(FarmerProductionService.create(request("2026-10-06T00:00:00.000Z"))).rejects.toThrow(
      "Maize was bought on"
    );
  });
});
