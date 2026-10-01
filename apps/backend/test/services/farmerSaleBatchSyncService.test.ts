import { SalesItemType, WeightSource } from "@prisma/client";
import {
  saleGeneratedWeightNote,
  syncFarmerSaleBatchRecords,
} from "../../src/services/farmerSaleBatchSyncService";

function createTransactionMock() {
  return {
    mortality: {
      findMany: jest.fn().mockResolvedValue([{ batchId: "batch-1" }]),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue({ id: "mortality-1" }),
    },
    birdWeight: {
      findMany: jest.fn().mockResolvedValue([{ batchId: "batch-1" }]),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue({ id: "weight-1" }),
      findFirst: jest.fn().mockResolvedValue({ avgWeight: 3 }),
    },
    batch: {
      update: jest.fn().mockResolvedValue({ id: "batch-1" }),
    },
  };
}

describe("Farmer sale batch record sync", () => {
  it("updates and restores linked rows without leaving stale values", async () => {
    const tx = createTransactionMock();
    const saleId = "sale-1";
    const editedDate = new Date("2026-10-02T00:00:00.000Z");

    await syncFarmerSaleBatchRecords(tx as never, {
      saleId,
      oldBatchId: "batch-1",
      newBatchId: "batch-1",
      itemType: SalesItemType.Chicken_Meat,
      date: editedDate,
      quantity: 10,
      weight: 30,
    });

    expect(tx.mortality.deleteMany).toHaveBeenLastCalledWith({
      where: { saleId },
    });
    expect(tx.mortality.create).toHaveBeenLastCalledWith({
      data: {
        date: editedDate,
        count: 10,
        reason: "SLAUGHTERED_FOR_SALE",
        batchId: "batch-1",
        saleId,
      },
    });
    expect(tx.birdWeight.create).toHaveBeenLastCalledWith({
      data: {
        batchId: "batch-1",
        date: editedDate,
        avgWeight: 3,
        sampleCount: 10,
        source: WeightSource.SALE,
        notes: saleGeneratedWeightNote(saleId),
      },
    });

    const originalDate = new Date("2026-10-01T00:00:00.000Z");
    await syncFarmerSaleBatchRecords(tx as never, {
      saleId,
      oldBatchId: "batch-1",
      newBatchId: "batch-1",
      itemType: SalesItemType.Chicken_Meat,
      date: originalDate,
      quantity: 20,
      weight: 40,
    });

    expect(tx.mortality.deleteMany).toHaveBeenCalledTimes(2);
    expect(tx.birdWeight.deleteMany).toHaveBeenCalledTimes(2);
    expect(tx.mortality.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        date: originalDate,
        count: 20,
        batchId: "batch-1",
      }),
    });
    expect(tx.birdWeight.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        date: originalDate,
        avgWeight: 2,
        sampleCount: 20,
      }),
    });
    expect(tx.batch.update).toHaveBeenLastCalledWith({
      where: { id: "batch-1" },
      data: { currentWeight: 3 },
    });
  });

  it("cleans every old batch when a sale is moved", async () => {
    const tx = createTransactionMock();
    tx.mortality.findMany.mockResolvedValue([
      { batchId: "batch-old" },
      { batchId: "batch-stale" },
    ]);
    tx.birdWeight.findMany.mockResolvedValue([{ batchId: "batch-stale" }]);
    tx.birdWeight.findFirst
      .mockResolvedValueOnce({ avgWeight: 1.8 })
      .mockResolvedValueOnce({ avgWeight: 2.4 })
      .mockResolvedValueOnce(null);

    const affected = await syncFarmerSaleBatchRecords(tx as never, {
      saleId: "sale-2",
      oldBatchId: "batch-old",
      newBatchId: "batch-new",
      itemType: SalesItemType.Chicken_Meat,
      date: new Date("2026-10-03T00:00:00.000Z"),
      quantity: 5,
      weight: 12,
    });

    expect(affected).toEqual(["batch-old", "batch-new", "batch-stale"]);
    expect(tx.batch.update).toHaveBeenCalledTimes(3);
    expect(tx.mortality.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ batchId: "batch-new", count: 5 }),
    });
    expect(tx.birdWeight.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ batchId: "batch-new", avgWeight: 2.4 }),
    });
  });
});
