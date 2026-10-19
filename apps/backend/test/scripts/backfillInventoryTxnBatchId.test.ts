jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    inventoryTransaction: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    batch: {
      findMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return { __esModule: true, default: client };
});

import prisma from "../../src/utils/prisma";
import {
  extractBatchRefs,
  runBackfill,
} from "../../src/scripts/backfillInventoryTxnBatchId";

const db = prisma as any;

describe("extractBatchRefs", () => {
  it("extracts a cuid id from the expense-site description", () => {
    expect(
      extractBatchRefs("Usage recorded for farm-x - Batch cmvdt7kqz00uiij5f5ye398vy"),
    ).toEqual({ id: "cmvdt7kqz00uiij5f5ye398vy" });
  });

  it("extracts a seed-slug id (non-cuid shape)", () => {
    expect(
      extractBatchRefs("Usage recorded for ... - Batch p360-demo-farmer-batch-broiler-active-v1"),
    ).toEqual({ id: "p360-demo-farmer-batch-broiler-active-v1" });
  });

  it("extracts a multi-word batch number from the chicks-allocation description", () => {
    expect(extractBatchRefs("Chicks allocated to batch Shrawan-24-Farm 1")).toEqual({
      number: "Shrawan-24-Farm 1",
    });
  });

  it("extracts a batch number from a legacy '<thing> issued to batch <no>' description", () => {
    expect(extractBatchRefs("Finisher feed issued to batch BRO-2083-04")).toEqual({
      number: "BRO-2083-04",
    });
  });

  it("extracts a single-word batch number", () => {
    expect(extractBatchRefs("Chicks allocated to batch B-1")).toEqual({
      number: "B-1",
    });
  });

  it("returns null for unrelated descriptions", () => {
    expect(extractBatchRefs("Opening stock entry")).toBeNull();
    expect(extractBatchRefs(null)).toBeNull();
    expect(extractBatchRefs(undefined)).toBeNull();
  });
});

describe("runBackfill", () => {
  beforeEach(() => jest.clearAllMocks());

  function queueRows(rows: Array<{ id: string; description: string; userId: string }>) {
    // First call returns the rows, second call returns [] so the loop exits.
    db.inventoryTransaction.findMany
      .mockResolvedValueOnce(
        rows.map((r) => ({
          id: r.id,
          description: r.description,
          item: { userId: r.userId },
        })),
      )
      .mockResolvedValueOnce([]);
  }

  it("links an unambiguous row by id and reports it as linked", async () => {
    queueRows([
      { id: "txn-1", description: "Usage recorded for farm-x - Batch cmbatch1aaaaaaaaaaaaaaaaa", userId: "u1" },
    ]);
    db.batch.findMany.mockResolvedValueOnce([{ id: "cmbatch1aaaaaaaaaaaaaaaaa" }]);

    const counts = await runBackfill();

    expect(counts.linked).toBe(1);
    expect(counts.skippedAmbiguous).toBe(0);
    expect(db.inventoryTransaction.update).toHaveBeenCalledWith({
      where: { id: "txn-1" },
      data: { batchId: "cmbatch1aaaaaaaaaaaaaaaaa" },
    });
    // ID path: looked up by id, scoped by owner.
    expect(db.batch.findMany.mock.calls[0][0].where.id).toBe("cmbatch1aaaaaaaaaaaaaaaaa");
    expect(db.batch.findMany.mock.calls[0][0].where.farm).toEqual({ ownerId: "u1" });
  });

  it("links by batch number when no id is in the description", async () => {
    queueRows([
      { id: "txn-2", description: "Chicks allocated to batch B-42", userId: "u1" },
    ]);
    db.batch.findMany.mockResolvedValueOnce([{ id: "cmbatch42aaaaaaaaaaaaaaaa" }]);

    const counts = await runBackfill();

    expect(counts.linked).toBe(1);
    expect(db.batch.findMany.mock.calls[0][0].where.batchNumber).toBe("B-42");
    expect(db.inventoryTransaction.update).toHaveBeenCalledWith({
      where: { id: "txn-2" },
      data: { batchId: "cmbatch42aaaaaaaaaaaaaaaa" },
    });
  });

  it("skips rows where multiple batches match (ambiguous collision)", async () => {
    queueRows([
      { id: "txn-3", description: "Chicks allocated to batch B-42", userId: "u1" },
    ]);
    db.batch.findMany.mockResolvedValueOnce([{ id: "cmbatch42aaaaaaaaaaaaaaaaa" }, { id: "cmbatch42aaaaaaaaaaaaaaaab" }]);

    const counts = await runBackfill();

    expect(counts.linked).toBe(0);
    expect(counts.skippedAmbiguous).toBe(1);
    expect(db.inventoryTransaction.update).not.toHaveBeenCalled();
  });

  it("skips rows with unparseable descriptions", async () => {
    queueRows([
      { id: "txn-4", description: "Random stock adjustment", userId: "u1" },
      { id: "txn-5", description: "", userId: "u1" },
    ]);

    const counts = await runBackfill();

    expect(counts.skippedNoParse).toBe(1);
    expect(counts.skippedNoDescription).toBe(1);
    expect(counts.linked).toBe(0);
    expect(db.batch.findMany).not.toHaveBeenCalled();
  });

  it("counts no-match when the parsed ref exists in no batch owned by the user", async () => {
    queueRows([
      { id: "txn-6", description: "Chicks allocated to batch Ghost", userId: "u1" },
    ]);
    db.batch.findMany.mockResolvedValueOnce([]);

    const counts = await runBackfill();

    expect(counts.skippedNoMatch).toBe(1);
    expect(counts.linked).toBe(0);
  });

  it("does not write in dry-run mode", async () => {
    queueRows([
      { id: "txn-7", description: "Chicks allocated to batch B-7", userId: "u1" },
    ]);
    db.batch.findMany.mockResolvedValueOnce([{ id: "cmbatch7aaaaaaaaaaaaaaaaa" }]);

    const counts = await runBackfill({ dryRun: true });

    expect(counts.linked).toBe(1);
    expect(db.inventoryTransaction.update).not.toHaveBeenCalled();
  });
});
