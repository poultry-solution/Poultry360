/**
 * Regression test for the fuzzy-match batch-delete bug.
 *
 * Before this fix, deleteBatch removed InventoryTransaction rows by matching
 * `description contains "batch <batchNumber>"` plus `itemId IN (...)`. Batch
 * numbers are unique per farm (not per user), so an owner with two farms both
 * running "batch 42" using the same InventoryItem could lose the sibling
 * batch's transactions when deleting just one of them.
 *
 * After the fix, deletion is scoped by `batchId: id` (the new FK), so sibling
 * batches with the same batchNumber are untouched.
 */

jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    batch: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    inventoryUsage: {
      count: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    inventoryTransaction: {
      deleteMany: jest.fn(),
    },
    inventoryItem: {
      update: jest.fn(),
    },
  };
  client.$transaction = jest.fn((fn: (tx: any) => unknown) => fn(client));
  return { __esModule: true, default: client };
});

import prisma from "../../src/utils/prisma";
import { deleteBatch } from "../../src/controller/batchController";

const db = prisma as any;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

beforeEach(() => jest.clearAllMocks());

describe("deleteBatch — inventory transaction cleanup is scoped by FK", () => {
  const owner = { userId: "owner-1", role: "OWNER" };

  function targetBatch() {
    return {
      id: "batch-to-delete",
      batchNumber: "B-42",
      farm: { ownerId: "owner-1" },
      _count: {
        expenses: 0,
        sales: 0,
        mortalities: 0,
        vaccinations: 0,
        feedConsumptions: 0,
        birdWeights: 0,
      },
    };
  }

  it("deletes transactions by batchId, not by batchNumber text match", async () => {
    db.batch.findFirst.mockResolvedValue(targetBatch());
    db.expense.findMany.mockResolvedValue([]);
    db.inventoryUsage.count.mockResolvedValue(1);
    db.inventoryUsage.findMany.mockResolvedValue([
      { id: "usage-1", itemId: "item-chicks", quantity: 100 },
    ]);

    const res = makeResponse();
    await deleteBatch(
      { params: { id: "batch-to-delete" }, ...owner } as any,
      res,
    );

    // Primary (post-migration) cleanup uses the FK, scoped only by batchId.
    expect(db.inventoryTransaction.deleteMany).toHaveBeenCalledWith({
      where: { batchId: "batch-to-delete", type: "USAGE" },
    });
  });

  it("does not touch sibling batches that share the same batchNumber on a different farm", async () => {
    // Owner has two farms, each with a batch numbered "B-42" using the same chicks item.
    // The deleteMany call that runs for batch-to-delete must not accidentally match
    // sibling-batch's transactions.
    db.batch.findFirst.mockResolvedValue(targetBatch());
    db.expense.findMany.mockResolvedValue([]);
    db.inventoryUsage.count.mockResolvedValue(1);
    db.inventoryUsage.findMany.mockResolvedValue([
      { id: "usage-1", itemId: "item-chicks", quantity: 100 },
    ]);

    const res = makeResponse();
    await deleteBatch(
      { params: { id: "batch-to-delete" }, ...owner } as any,
      res,
    );

    const calls = db.inventoryTransaction.deleteMany.mock.calls;
    // Every deleteMany call must scope by either batchId=target OR by
    // batchId=null (the narrow legacy fallback). Neither can match the
    // sibling batch's transactions, which have batchId=<sibling id>.
    for (const call of calls) {
      const where = call[0].where;
      const okScope =
        where.batchId === "batch-to-delete" ||
        where.batchId === null;
      expect(okScope).toBe(true);
    }
  });

  it("legacy fallback is narrowed to batchId IS NULL (post-migration rows untouched)", async () => {
    db.batch.findFirst.mockResolvedValue(targetBatch());
    db.expense.findMany.mockResolvedValue([]);
    db.inventoryUsage.count.mockResolvedValue(1);
    db.inventoryUsage.findMany.mockResolvedValue([
      { id: "usage-1", itemId: "item-chicks", quantity: 100 },
    ]);

    const res = makeResponse();
    await deleteBatch(
      { params: { id: "batch-to-delete" }, ...owner } as any,
      res,
    );

    // Second call is the legacy fallback — must include `batchId: null`.
    const legacyCall = db.inventoryTransaction.deleteMany.mock.calls[1];
    expect(legacyCall[0].where.batchId).toBeNull();
    expect(legacyCall[0].where.description).toBeDefined();
  });
});
