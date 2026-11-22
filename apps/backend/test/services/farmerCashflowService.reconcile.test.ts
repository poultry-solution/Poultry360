/**
 * Reconciliation-wizard behaviour for farmerCashflowService.reconcile. Prisma
 * is mocked; the tests focus on branching: drawer == computed vs more vs less,
 * once-only semantics, and the new-user auto-seed path on
 * getReconciliationStatus.
 */

jest.mock("../../src/utils/prisma", () => {
  const m: any = {
    cashAccount: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    cashMovement: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    farmerCashSettings: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  m.$transaction = jest.fn((fn: (tx: any) => unknown) => fn(m));
  return { __esModule: true, default: m };
});

jest.mock("../../src/utils/nepalBsDate", () => ({
  getNepalBsTodayString: jest.fn(() => "2083-06-26"),
  toNepalBsDayString: jest.fn(() => "2083-06-26"),
  prevBsDate: jest.fn((bs: string) => bs),
}));

import { Prisma } from "@prisma/client";
import prisma from "../../src/utils/prisma";
import {
  CashflowError,
  getReconciliationStatus,
  reconcile,
} from "../../src/services/farmerCashflowService";

const db = prisma as any;

const cashAccount = {
  id: "cash-1",
  userId: "u1",
  type: "CASH",
  name: "Cash",
  openingBalance: new Prisma.Decimal(0),
  openingBsDate: "2000-01-01",
  archivedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  db.cashAccount.findFirst.mockResolvedValue(cashAccount);
});

describe("getReconciliationStatus", () => {
  it("auto-seeds a reconciled settings row for brand-new users with zero movements", async () => {
    db.farmerCashSettings.findUnique.mockResolvedValue(null);
    db.cashMovement.findMany.mockResolvedValue([]);
    db.farmerCashSettings.create.mockResolvedValue({ id: "s-new" });

    const status = await getReconciliationStatus("u1");

    expect(status).toEqual({ needsReconciliation: false, computedCash: 0 });
    expect(db.farmerCashSettings.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          reconciledAt: expect.any(Date),
        }),
      }),
    );
  });

  it("prompts the wizard when movements exist but no settings row does — backfill path", async () => {
    // Phase 2 backfill wrote mirror rows but never touched FarmerCashSettings.
    // The farmer opens /cashflow for the first time after backfill and must
    // get the wizard.
    db.farmerCashSettings.findUnique.mockResolvedValue(null);
    db.cashMovement.findMany.mockResolvedValue([
      {
        id: "m-1",
        userId: "u1",
        accountId: "cash-1",
        bsDate: "2083-01-01",
        direction: "IN",
        amount: new Prisma.Decimal(500),
        category: "SALE_RECEIPT",
        sourceType: "SALE_PAYMENT",
        sourceId: "sp-1",
        transferId: null,
        partyName: "Ram",
        notes: null,
        createdAt: new Date(),
      },
    ]);

    const status = await getReconciliationStatus("u1");

    expect(status).toEqual({ needsReconciliation: true, computedCash: 500 });
    // Crucially: we did NOT auto-seed the settings row — leaving it absent so
    // reconcile() can create it with the correct reconciledAt stamp when the
    // farmer actually confirms.
    expect(db.farmerCashSettings.create).not.toHaveBeenCalled();
    expect(db.farmerCashSettings.update).not.toHaveBeenCalled();
  });

  it("flags needsReconciliation=true when backfilled settings have no reconciledAt", async () => {
    db.farmerCashSettings.findUnique.mockResolvedValue({
      id: "s-1",
      userId: "u1",
      reconciledAt: null,
    });
    db.cashMovement.findMany.mockResolvedValue([
      {
        id: "m-1",
        userId: "u1",
        accountId: "cash-1",
        bsDate: "2083-01-01",
        direction: "IN",
        amount: new Prisma.Decimal(500),
        category: "SALE_RECEIPT",
        sourceType: "SALE_PAYMENT",
        sourceId: "sp-1",
        transferId: null,
        partyName: "Ram",
        notes: null,
        createdAt: new Date(),
      },
    ]);

    const status = await getReconciliationStatus("u1");
    expect(status.needsReconciliation).toBe(true);
    expect(status.computedCash).toBe(500);
  });

  it("returns needsReconciliation=false once reconciledAt is stamped", async () => {
    db.farmerCashSettings.findUnique.mockResolvedValue({
      id: "s-1",
      userId: "u1",
      reconciledAt: new Date("2026-10-11T00:00:00Z"),
    });
    db.cashMovement.findMany.mockResolvedValue([]);

    const status = await getReconciliationStatus("u1");
    expect(status.needsReconciliation).toBe(false);
  });

  it("back-fills reconciledAt when a zero-movement user has an un-stamped settings row", async () => {
    // Edge case: someone created the settings row manually or via an earlier
    // code path but never reconciled. With zero movements there's nothing to
    // anchor against, so we stamp now() so their first auto-posted sale later
    // doesn't trigger a surprise wizard.
    db.farmerCashSettings.findUnique.mockResolvedValue({
      id: "s-stale",
      userId: "u1",
      reconciledAt: null,
    });
    db.cashMovement.findMany.mockResolvedValue([]);

    const status = await getReconciliationStatus("u1");

    expect(status.needsReconciliation).toBe(false);
    expect(db.farmerCashSettings.update).toHaveBeenCalledWith({
      where: { id: "s-stale" },
      data: { reconciledAt: expect.any(Date) },
    });
  });
});

describe("reconcile", () => {
  it("drawer equals computed → stamps reconciledAt, no adjustment", async () => {
    db.farmerCashSettings.findUnique.mockResolvedValue({
      id: "s-1",
      userId: "u1",
      reconciledAt: null,
    });
    db.cashMovement.findMany.mockResolvedValue([
      {
        id: "m-1",
        userId: "u1",
        accountId: "cash-1",
        bsDate: "2083-01-01",
        direction: "IN",
        amount: new Prisma.Decimal(500),
        category: "SALE_RECEIPT",
        sourceType: "SALE_PAYMENT",
        sourceId: "sp-1",
        transferId: null,
        partyName: "Ram",
        notes: null,
        createdAt: new Date(),
      },
    ]);

    const result = await reconcile("u1", "u1", 500);

    expect(result.computed).toBe(500);
    expect(result.drawer).toBe(500);
    expect(result.diff).toBe(0);
    expect(result.adjustmentMovementId).toBeNull();
    expect(db.cashMovement.create).not.toHaveBeenCalled();
    expect(db.farmerCashSettings.update).toHaveBeenCalledWith({
      where: { id: "s-1" },
      data: { reconciledAt: expect.any(Date) },
    });
  });

  it("drawer above computed → posts an IN OPENING_ADJUSTMENT", async () => {
    db.farmerCashSettings.findUnique.mockResolvedValue({
      id: "s-1",
      userId: "u1",
      reconciledAt: null,
    });
    db.cashMovement.findMany.mockResolvedValue([
      {
        id: "m-1",
        userId: "u1",
        accountId: "cash-1",
        bsDate: "2083-01-01",
        direction: "IN",
        amount: new Prisma.Decimal(500),
        category: "SALE_RECEIPT",
        sourceType: "SALE_PAYMENT",
        sourceId: "sp-1",
        transferId: null,
        partyName: "Ram",
        notes: null,
        createdAt: new Date(),
      },
    ]);
    db.cashMovement.create.mockResolvedValue({ id: "adj-1" });

    const result = await reconcile("u1", "u1", 600);

    expect(result.diff).toBe(100);
    expect(result.adjustmentMovementId).toBe("adj-1");
    const createArg = db.cashMovement.create.mock.calls[0][0].data;
    expect(createArg).toMatchObject({
      direction: "IN",
      category: "OPENING_ADJUSTMENT",
      sourceType: "OPENING_ADJUSTMENT",
      sourceId: "s-1",
      accountId: "cash-1",
      bsDate: "2083-06-26",
    });
    expect(createArg.amount).toEqual(new Prisma.Decimal(100));
  });

  it("drawer below computed → posts an OUT OPENING_ADJUSTMENT", async () => {
    db.farmerCashSettings.findUnique.mockResolvedValue({
      id: "s-1",
      userId: "u1",
      reconciledAt: null,
    });
    db.cashMovement.findMany.mockResolvedValue([
      {
        id: "m-1",
        userId: "u1",
        accountId: "cash-1",
        bsDate: "2083-01-01",
        direction: "IN",
        amount: new Prisma.Decimal(500),
        category: "SALE_RECEIPT",
        sourceType: "SALE_PAYMENT",
        sourceId: "sp-1",
        transferId: null,
        partyName: "Ram",
        notes: null,
        createdAt: new Date(),
      },
    ]);
    db.cashMovement.create.mockResolvedValue({ id: "adj-2" });

    const result = await reconcile("u1", "u1", 450);

    expect(result.diff).toBe(-50);
    expect(result.adjustmentMovementId).toBe("adj-2");
    const createArg = db.cashMovement.create.mock.calls[0][0].data;
    expect(createArg.direction).toBe("OUT");
    expect(createArg.amount).toEqual(new Prisma.Decimal(50));
  });

  it("refuses a second reconcile with 409 Already reconciled", async () => {
    db.farmerCashSettings.findUnique.mockResolvedValue({
      id: "s-1",
      userId: "u1",
      reconciledAt: new Date(),
    });

    await expect(reconcile("u1", "u1", 500)).rejects.toEqual(
      expect.objectContaining({
        status: 409,
      }),
    );
    expect(db.farmerCashSettings.update).not.toHaveBeenCalled();
    expect(db.cashMovement.create).not.toHaveBeenCalled();
  });

  it("refuses a negative drawer with 400", async () => {
    await expect(reconcile("u1", "u1", -10)).rejects.toBeInstanceOf(
      CashflowError,
    );
    expect(db.farmerCashSettings.findUnique).not.toHaveBeenCalled();
  });

  it("auto-creates the settings row (reconciledAt=null) when none exists", async () => {
    db.farmerCashSettings.findUnique.mockResolvedValue(null);
    db.farmerCashSettings.create.mockResolvedValue({ id: "s-fresh" });
    db.cashMovement.findMany.mockResolvedValue([]);

    const result = await reconcile("u1", "u1", 0);
    // 0 drawer == 0 computed → no adjustment, but settings row created & stamped.
    expect(result.adjustmentMovementId).toBeNull();
    expect(db.farmerCashSettings.create).toHaveBeenCalled();
    expect(db.farmerCashSettings.update).toHaveBeenCalledWith({
      where: { id: "s-fresh" },
      data: { reconciledAt: expect.any(Date) },
    });
  });
});
