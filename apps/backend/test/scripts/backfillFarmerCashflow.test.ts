jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    user: { findMany: jest.fn() },
    cashMovement: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    cashAccount: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    salePayment: { findMany: jest.fn() },
    customerTransaction: { findMany: jest.fn() },
    expense: { findMany: jest.fn() },
    entityTransaction: { findMany: jest.fn() },
    staffPayment: { findMany: jest.fn() },
    $disconnect: jest.fn(),
  };
  return { __esModule: true, default: client };
});

jest.mock("../../src/utils/nepalBsDate", () => ({
  toNepalBsDayString: jest.fn(() => "2083-06-26"),
  getNepalBsTodayString: jest.fn(() => "2083-06-26"),
  prevBsDate: jest.fn((bs: string) => bs),
}));

import prisma from "../../src/utils/prisma";
import { runBackfill } from "../../src/scripts/backfillFarmerCashflow";

const db = prisma as any;

function queueFindMany(fn: jest.Mock, rows: unknown[]) {
  // One batch of rows, then an empty list to end the cursor loop.
  fn.mockResolvedValueOnce(rows).mockResolvedValueOnce([]);
}

function queueEmptyAllTables() {
  queueFindMany(db.salePayment.findMany, []);
  queueFindMany(db.customerTransaction.findMany, []);
  queueFindMany(db.expense.findMany, []);
  queueFindMany(db.entityTransaction.findMany, []);
  queueFindMany(db.staffPayment.findMany, []);
}

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) — we also need to flush any leftover
  // `mockResolvedValueOnce` queue entries from prior tests. Each queueFindMany
  // call queues two values, but an empty-table loop only consumes the first,
  // so one `[]` lingers unless implementations are fully reset.
  jest.resetAllMocks();
  // ensureCashAccount: cash row already exists, no create.
  db.cashAccount.findFirst.mockResolvedValue({
    id: "cash-acc-1",
    userId: "u1",
    type: "CASH",
    name: "Cash",
    openingBalance: 0,
    openingBsDate: "2000-01-01",
    archivedAt: null,
  });
  db.cashMovement.findFirst.mockResolvedValue(null);
  db.cashMovement.create.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: "m-created", ...data }),
  );
  const { toNepalBsDayString } = require("../../src/utils/nepalBsDate") as {
    toNepalBsDayString: jest.Mock;
  };
  toNepalBsDayString.mockReturnValue("2083-06-26");
});

describe("backfillFarmerCashflow", () => {
  it("skips users with pre-existing MANUAL rows unless --force", async () => {
    db.user.findMany.mockResolvedValue([{ id: "u1" }]);
    db.cashMovement.findFirst.mockResolvedValueOnce({ id: "manual-1" });

    const summary = await runBackfill({});
    expect(summary.usersSkipped).toEqual([
      { userId: "u1", reason: "has_manual_movements" },
    ]);
    expect(summary.usersIncluded).toBe(0);
    expect(db.cashMovement.create).not.toHaveBeenCalled();
  });

  it("--force includes users with manual rows", async () => {
    db.user.findMany.mockResolvedValue([{ id: "u1" }]);
    queueEmptyAllTables();

    const summary = await runBackfill({ force: true });
    expect(summary.usersSkipped).toEqual([]);
    expect(summary.usersIncluded).toBe(1);
    // --force bypasses the MANUAL check — findFirst for manual rows is skipped.
    expect(db.cashMovement.findFirst).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", sourceType: "MANUAL" } }),
    );
  });

  it("dry-run writes zero rows but counts them", async () => {
    db.user.findMany.mockResolvedValue([{ id: "u1" }]);
    db.cashMovement.findFirst.mockResolvedValue(null);
    queueFindMany(db.salePayment.findMany, [
      {
        id: "sp-1",
        amount: 500,
        date: new Date("2026-10-11T00:00:00Z"),
        description: null,
        sale: {
          customer: { name: "Ram", userId: "u1" },
          farm: { ownerId: "u1" },
        },
      },
    ]);
    queueFindMany(db.customerTransaction.findMany, []);
    queueFindMany(db.expense.findMany, []);
    queueFindMany(db.entityTransaction.findMany, []);
    queueFindMany(db.staffPayment.findMany, []);

    const summary = await runBackfill({ dryRun: true });
    expect(summary.dryRun).toBe(true);
    expect(summary.counts.salePayments.scanned).toBe(1);
    expect(summary.counts.salePayments.inserted).toBe(1);
    expect(db.cashMovement.create).not.toHaveBeenCalled();
  });

  it("mirrors one row per source table with the correct shape", async () => {
    db.user.findMany.mockResolvedValue([{ id: "u1" }]);
    db.cashMovement.findFirst.mockResolvedValue(null);
    const saleDate = new Date("2026-10-11T00:00:00Z");

    queueFindMany(db.salePayment.findMany, [
      {
        id: "sp-1",
        amount: 500,
        date: saleDate,
        description: null,
        sale: {
          customer: { name: "Ram", userId: "u1" },
          farm: { ownerId: "u1" },
        },
      },
    ]);
    queueFindMany(db.customerTransaction.findMany, [
      {
        id: "ct-1",
        amount: 300,
        date: saleDate,
        description: "Weekly collection",
        customer: { name: "Sita" },
      },
    ]);
    queueFindMany(db.expense.findMany, [
      {
        id: "e-1",
        amount: 1200,
        date: saleDate,
        description: null,
        category: { name: "Transport" },
      },
    ]);
    queueFindMany(db.entityTransaction.findMany, [
      {
        id: "et-1",
        amount: 4500,
        date: saleDate,
        description: null,
        dealer: { name: "Blue Dealer" },
      },
    ]);
    queueFindMany(db.staffPayment.findMany, [
      {
        id: "spay-1",
        amount: 8000,
        paidAt: saleDate,
        note: null,
        staff: { name: "Hari" },
      },
    ]);

    const summary = await runBackfill({ runId: "run-1" });

    expect(summary.counts.salePayments.inserted).toBe(1);
    expect(summary.counts.customerReceipts.inserted).toBe(1);
    expect(summary.counts.expenses.inserted).toBe(1);
    expect(summary.counts.supplierPayments.inserted).toBe(1);
    expect(summary.counts.staffPayments.inserted).toBe(1);
    expect(db.cashMovement.create).toHaveBeenCalledTimes(5);

    const created = (db.cashMovement.create as jest.Mock).mock.calls.map(
      (c) => c[0].data,
    );
    const bySource = Object.fromEntries(
      created.map((d: any) => [d.sourceType, d]),
    );

    expect(bySource.SALE_PAYMENT).toMatchObject({
      userId: "u1",
      accountId: "cash-acc-1",
      direction: "IN",
      category: "SALE_RECEIPT",
      sourceType: "SALE_PAYMENT",
      sourceId: "sp-1",
      partyName: "Ram",
      backfillRunId: "run-1",
      recordedById: "u1",
      bsDate: "2083-06-26",
    });
    expect(bySource.CUSTOMER_RECEIPT).toMatchObject({
      direction: "IN",
      category: "SALE_RECEIPT",
      sourceType: "CUSTOMER_RECEIPT",
      sourceId: "ct-1",
      partyName: "Sita",
      notes: "Weekly collection",
    });
    expect(bySource.EXPENSE).toMatchObject({
      direction: "OUT",
      category: "EXPENSE",
      sourceType: "EXPENSE",
      sourceId: "e-1",
      partyName: "Transport",
    });
    expect(bySource.SUPPLIER_PAYMENT).toMatchObject({
      direction: "OUT",
      category: "PAYMENT_TO_DEALER",
      sourceType: "SUPPLIER_PAYMENT",
      sourceId: "et-1",
      partyName: "Blue Dealer",
    });
    expect(bySource.STAFF_PAYMENT).toMatchObject({
      direction: "OUT",
      category: "EXPENSE",
      sourceType: "STAFF_PAYMENT",
      sourceId: "spay-1",
      partyName: "Hari",
    });
  });

  it("is idempotent — second run finds existing rows and inserts nothing", async () => {
    db.user.findMany.mockResolvedValue([{ id: "u1" }]);
    db.cashMovement.findFirst.mockResolvedValue(null);
    queueFindMany(db.salePayment.findMany, [
      {
        id: "sp-1",
        amount: 500,
        date: new Date(),
        description: null,
        sale: {
          customer: { name: "Ram", userId: "u1" },
          farm: { ownerId: "u1" },
        },
      },
    ]);
    queueFindMany(db.customerTransaction.findMany, []);
    queueFindMany(db.expense.findMany, []);
    queueFindMany(db.entityTransaction.findMany, []);
    queueFindMany(db.staffPayment.findMany, []);

    // Second pass: existing mirror row for the same (userId, sourceType, sourceId).
    (db.cashMovement.findFirst as jest.Mock).mockReset();
    db.cashMovement.findFirst
      .mockResolvedValueOnce(null) // the MANUAL skip check
      .mockResolvedValue({ id: "already-there" }); // every source-row check

    const summary = await runBackfill({});
    expect(summary.counts.salePayments.scanned).toBe(1);
    expect(summary.counts.salePayments.inserted).toBe(0);
    expect(summary.counts.salePayments.skippedExisting).toBe(1);
    expect(db.cashMovement.create).not.toHaveBeenCalled();
  });

  it("scopes OWNER users only", async () => {
    db.user.findMany.mockResolvedValue([]);
    const summary = await runBackfill({});
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ role: "OWNER" }) }),
    );
    expect(summary.usersSeen).toBe(0);
  });

  it("excludes inventory-backed expenses via the where clause", async () => {
    db.user.findMany.mockResolvedValue([{ id: "u1" }]);
    db.cashMovement.findFirst.mockResolvedValue(null);
    queueEmptyAllTables();

    await runBackfill({});

    // The Expense query must filter `inventoryUsages: { none: {} }` so
    // feed/vaccine purchases that were already paid via SUPPLIER_PAYMENT
    // aren't double-counted here.
    expect(db.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          inventoryUsages: { none: {} },
          farm: { ownerId: "u1" },
        }),
      }),
    );
  });

  it("excludes soft-deleted CustomerTransactions via the where clause", async () => {
    db.user.findMany.mockResolvedValue([{ id: "u1" }]);
    db.cashMovement.findFirst.mockResolvedValue(null);
    queueEmptyAllTables();

    await runBackfill({});

    expect(db.customerTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: "RECEIPT",
          deletedAt: null,
          customer: { userId: "u1" },
        }),
      }),
    );
  });

  it("scopes EntityTransaction to farmer-owned dealers only", async () => {
    db.user.findMany.mockResolvedValue([{ id: "u1" }]);
    db.cashMovement.findFirst.mockResolvedValue(null);
    queueEmptyAllTables();

    await runBackfill({});

    expect(db.entityTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: "PAYMENT",
          dealer: { userId: "u1" },
        }),
      }),
    );
  });

  it("falls back to 'Walk-in customer' when a SalePayment has no customer", async () => {
    db.user.findMany.mockResolvedValue([{ id: "u1" }]);
    db.cashMovement.findFirst.mockResolvedValue(null);
    queueFindMany(db.salePayment.findMany, [
      {
        id: "sp-walkin",
        amount: 1000,
        date: new Date(),
        description: null,
        sale: {
          customer: null,
          farm: { ownerId: "u1" },
        },
      },
    ]);
    queueFindMany(db.customerTransaction.findMany, []);
    queueFindMany(db.expense.findMany, []);
    queueFindMany(db.entityTransaction.findMany, []);
    queueFindMany(db.staffPayment.findMany, []);

    await runBackfill({});
    const created = (db.cashMovement.create as jest.Mock).mock.calls[0][0]
      .data;
    expect(created.partyName).toBe("Walk-in customer");
    expect(created.sourceType).toBe("SALE_PAYMENT");
  });

  it("passes the AD date through toNepalBsDayString for bsDate", async () => {
    const { toNepalBsDayString } = require("../../src/utils/nepalBsDate") as {
      toNepalBsDayString: jest.Mock;
    };
    db.user.findMany.mockResolvedValue([{ id: "u1" }]);
    db.cashMovement.findFirst.mockResolvedValue(null);
    const staffDate = new Date("2026-10-11T22:00:00Z"); // UTC — would land next day in Nepal
    queueFindMany(db.salePayment.findMany, []);
    queueFindMany(db.customerTransaction.findMany, []);
    queueFindMany(db.expense.findMany, []);
    queueFindMany(db.entityTransaction.findMany, []);
    queueFindMany(db.staffPayment.findMany, [
      {
        id: "spay-tz",
        amount: 1,
        paidAt: staffDate,
        note: null,
        staff: { name: "Hari" },
      },
    ]);

    await runBackfill({});
    expect(toNepalBsDayString).toHaveBeenCalledWith(staffDate);
  });
});
