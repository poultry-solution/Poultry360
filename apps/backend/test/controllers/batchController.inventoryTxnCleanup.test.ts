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
    mortality: {
      count: jest.fn(),
      deleteMany: jest.fn(),
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
    db.mortality.count.mockResolvedValue(0);

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
    db.mortality.count.mockResolvedValue(0);

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
    db.mortality.count.mockResolvedValue(0);

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

  describe("closed-batch deletion when only system mortality exists", () => {
    it("allows delete when the only mortality row is BATCH_CLOSURE (mis-entered batch recovery)", async () => {
      // A batch was created, immediately closed (the only mortality is the
      // app-generated BATCH_CLOSURE row for remaining birds). No sales, no
      // feed, no vaccinations. The owner wants to roll it back.
      const batch = targetBatch();
      // `_count.mortalities` reflects total rows — including the system one —
      // and must no longer block the delete. The non-system filter does.
      batch._count.mortalities = 1;
      db.batch.findFirst.mockResolvedValue(batch);
      db.expense.findMany.mockResolvedValue([]);
      db.inventoryUsage.count.mockResolvedValue(1);
      db.inventoryUsage.findMany.mockResolvedValue([
        { id: "usage-1", itemId: "item-chicks", quantity: 100 },
      ]);
      // No user-recorded deaths; only the BATCH_CLOSURE row.
      db.mortality.count.mockResolvedValue(0);

      const res = makeResponse();
      await deleteBatch(
        { params: { id: "batch-to-delete" }, ...owner } as any,
        res,
      );

      // The non-system mortality query must filter out BATCH_CLOSURE while
      // explicitly including rows with reason=NULL (users can record
      // mortality without a reason; plain NOT would silently drop them).
      expect(db.mortality.count).toHaveBeenCalledWith({
        where: {
          batchId: "batch-to-delete",
          OR: [
            { reason: null },
            { reason: { not: "BATCH_CLOSURE" } },
          ],
        },
      });
      // Delete proceeded: batch was removed.
      expect(db.batch.delete).toHaveBeenCalledWith({ where: { id: "batch-to-delete" } });
      // And the success response was sent.
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it("blocks delete when a user-recorded mortality (non-BATCH_CLOSURE) exists", async () => {
      const batch = targetBatch();
      batch._count.mortalities = 2;
      db.batch.findFirst.mockResolvedValue(batch);
      db.expense.findMany.mockResolvedValue([]);
      db.inventoryUsage.count.mockResolvedValue(1);
      db.inventoryUsage.findMany.mockResolvedValue([
        { id: "usage-1", itemId: "item-chicks", quantity: 100 },
      ]);
      // One real death the farmer logged.
      db.mortality.count.mockResolvedValue(1);

      const res = makeResponse();
      await deleteBatch(
        { params: { id: "batch-to-delete" }, ...owner } as any,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/Cannot delete batch/i),
        })
      );
      expect(db.batch.delete).not.toHaveBeenCalled();
    });

    it("blocks delete when a user mortality has reason=NULL (reasonless entry)", async () => {
      // Users can record mortality without a reason. A naive
      // `NOT { reason: "BATCH_CLOSURE" }` filter would silently drop
      // NULL rows due to SQL three-valued logic, leaving the batch
      // appearing deletable. This test guards the explicit OR check.
      const batch = targetBatch();
      batch._count.mortalities = 2; // one BATCH_CLOSURE, one reasonless user entry
      db.batch.findFirst.mockResolvedValue(batch);
      db.expense.findMany.mockResolvedValue([]);
      db.inventoryUsage.count.mockResolvedValue(1);
      db.inventoryUsage.findMany.mockResolvedValue([
        { id: "usage-1", itemId: "item-chicks", quantity: 100 },
      ]);
      // The repository must return 1 for the "reasonless-or-not-BATCH_CLOSURE"
      // filter even though the one real entry has reason=NULL.
      db.mortality.count.mockResolvedValue(1);

      const res = makeResponse();
      await deleteBatch(
        { params: { id: "batch-to-delete" }, ...owner } as any,
        res,
      );

      // Guard the actual where-clause shape so a regression that drops the
      // `reason: null` branch is caught here.
      expect(db.mortality.count).toHaveBeenCalledWith({
        where: {
          batchId: "batch-to-delete",
          OR: [
            { reason: null },
            { reason: { not: "BATCH_CLOSURE" } },
          ],
        },
      });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(db.batch.delete).not.toHaveBeenCalled();
    });
  });
});
