jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    farm: { findMany: jest.fn() },
    batch: { findMany: jest.fn(), groupBy: jest.fn() },
    expense: { aggregate: jest.fn() },
    sale: { aggregate: jest.fn() },
  },
}));

jest.mock("../../src/services/farmerFcrService", () => ({
  ...jest.requireActual("../../src/services/farmerFcrService"),
  calculateFarmerBatchFcr: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
import { calculateFarmerBatchFcr } from "../../src/services/farmerFcrService";
import { getBatchPerformanceList } from "../../src/controller/dashboardController";

const db = prisma as any;
const fcr = calculateFarmerBatchFcr as jest.Mock;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

async function run(query: Record<string, string>) {
  const res = makeResponse();
  await getBatchPerformanceList({ userId: "farmer-1", query } as any, res);
  return res;
}

function batch(id: string, initialChicks = 1000) {
  return {
    id,
    batchNumber: `B-${id}`,
    farmId: "farm-1",
    farm: { name: "Farm 1" },
    status: "COMPLETED",
    batchType: "BROILER",
    startDate: new Date("2026-09-01T06:00:00Z"),
    endDate: new Date("2026-10-10T06:00:00Z"),
    initialChicks,
  };
}

describe("Farmer batch performance (Home profit graph)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.farm.findMany.mockResolvedValue([{ id: "farm-1" }, { id: "farm-2" }]);
    db.batch.groupBy.mockResolvedValue([{ batchType: "LAYERS" }, { batchType: "BROILER" }]);
    db.expense.aggregate.mockResolvedValue({ _sum: { amount: 300000 } });
    db.sale.aggregate.mockResolvedValue({ _sum: { amount: 360000 } });
    fcr.mockResolvedValue({ fcr: 1.6, currentFcr: 1.6, currentCfcr: 1.55, currentDeaths: 50, remainingAverageWeightKg: 0 });
  });

  it("returns the latest N batches and says when there are more", async () => {
    db.batch.findMany.mockResolvedValue(Array.from({ length: 9 }, (_, i) => batch(`b${i}`)));
    const res = await run({ limit: "8" });

    const call = db.batch.findMany.mock.calls[0][0];
    expect(call.take).toBe(9);
    expect(call.orderBy).toEqual([{ startDate: "desc" }, { id: "desc" }]);
    expect(call.where).toEqual({ farmId: { in: ["farm-1", "farm-2"] } });
    const body = res.json.mock.calls[0][0];
    expect(body.data).toHaveLength(8);
    expect(body.hasMore).toBe(true);
  });

  it("keeps the old behaviour without a limit", async () => {
    db.batch.findMany.mockResolvedValue([batch("b1")]);
    const res = await run({});
    expect(db.batch.findMany.mock.calls[0][0].take).toBeUndefined();
    expect(res.json.mock.calls[0][0].hasMore).toBe(false);
  });

  it("caps the limit at 60 and ignores unknown sort fields", async () => {
    db.batch.findMany.mockResolvedValue([]);
    await run({ limit: "999", sortBy: "password", sortOrder: "sideways" });
    const call = db.batch.findMany.mock.calls[0][0];
    expect(call.take).toBe(61);
    expect(call.orderBy).toEqual([{ startDate: "desc" }, { id: "desc" }]);
  });

  it("filters by one of the farmer's own farms and rejects other farms", async () => {
    db.batch.findMany.mockResolvedValue([]);
    await run({ farmId: "farm-2", limit: "8" });
    expect(db.batch.findMany.mock.calls[0][0].where).toEqual({ farmId: "farm-2" });

    const other = await run({ farmId: "someone-elses-farm" });
    expect(other.status).toHaveBeenCalledWith(400);
  });

  it("works out profit like the batch page and never divides by zero", async () => {
    db.batch.findMany.mockResolvedValue([batch("b1"), batch("b2", 0)]);
    const res = await run({ limit: "8" });
    const [first, second] = res.json.mock.calls[0][0].data;
    expect(first).toMatchObject({ salesAmount: 360000, expenses: 300000, profitLoss: 60000, mortalityRate: "5.00", farmId: "farm-1", batchType: "BROILER" });
    expect(first.endDate).toEqual(new Date("2026-10-10T06:00:00Z"));
    expect(second.mortalityRate).toBe("0.00");
  });

  it("counts only real deaths, not birds written off at closing", async () => {
    // 50 = 30 natural deaths + 20 birds left when the batch was closed
    db.batch.findMany.mockResolvedValue([{ ...batch("b1"), closureBirdCount: 20 }]);
    const res = await run({ limit: "8" });
    const [row] = res.json.mock.calls[0][0].data;
    expect(row.mortality).toBe(30);
    expect(row.mortalityRate).toBe("3.00");
  });

  it("shows today's FCR: final for closed, blank when an active batch's FCR is out of date", async () => {
    db.batch.findMany.mockResolvedValue([batch("closed"), { ...batch("active"), status: "ACTIVE", endDate: null }]);
    fcr.mockResolvedValueOnce({ fcr: 1.6, currentFcr: null, currentDeaths: 0 })
      .mockResolvedValueOnce({ fcr: 1.4, currentFcr: null, currentDeaths: 0 });
    const res = await run({ limit: "8" });
    const [closed, active] = res.json.mock.calls[0][0].data;
    expect(closed.currentFcr).toBe("1.60");
    expect(active.currentFcr).toBe("N/A");
  });

  it("layer batches: money is counted, FCR shows as not applicable", async () => {
    db.batch.findMany.mockResolvedValue([{ ...batch("layer"), batchType: "LAYERS" }]);
    fcr.mockResolvedValue({ fcr: null, currentFcr: null, currentCfcr: null, currentDeaths: 12 });
    const res = await run({ limit: "8" });
    const [row] = res.json.mock.calls[0][0].data;
    expect(row).toMatchObject({ batchType: "LAYERS", profitLoss: 60000, currentFcr: "N/A", cfcr: "N/A", mortality: 12 });
  });

  it("filters by batch type and lists which types exist", async () => {
    db.batch.findMany.mockResolvedValue([]);
    const res = await run({ limit: "8", batchType: "BROILER" });
    expect(db.batch.findMany.mock.calls[0][0].where).toEqual({ farmId: { in: ["farm-1", "farm-2"] }, batchType: "BROILER" });
    expect(res.json.mock.calls[0][0].availableTypes).toEqual(["BROILER", "LAYERS"]);

    await run({ limit: "8", batchType: "DUCKS" });
    expect(db.batch.findMany.mock.calls[1][0].where.batchType).toBeUndefined();
  });
});
