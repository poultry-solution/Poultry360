/**
 * Phase 2 hatchery auto-post helpers. Prisma transaction client is mocked —
 * these tests assert the shape of the write (direction/category/sourceType),
 * the idempotency path (find-then-update vs find-then-create), and the
 * account-ownership + active guards shared with dealer/farmer.
 *
 * End-to-end integration (service `addPayment` → CashMovement in one tx) is
 * covered by controller/service integration tests. This file covers the
 * primitive helpers only.
 */

jest.mock("../../src/utils/nepalBsDate", () => ({
  toNepalBsDayString: jest.fn(() => "2083-04-10"),
}));

import { CashflowError } from "../../src/common/cashflow/errors";
import {
  deleteHatcheryBatchExpenseMovement,
  deleteHatcheryPartyPaymentMovement,
  deleteHatcherySupplierPaymentMovement,
  postHatcheryBatchExpenseMovement,
  postHatcheryPartyPaymentMovement,
  postHatcherySupplierPaymentMovement,
} from "../../src/services/hatcheryCashflowAutoPost";
import { Prisma } from "@prisma/client";

type MockedTx = {
  cashAccount: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  cashMovement: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
  user: { findUnique: jest.Mock };
};

function tx(): MockedTx {
  return {
    cashAccount: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    cashMovement: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: "hatchery-user-1" }),
    },
  };
}

const activeAccount = (overrides: Partial<Record<string, unknown>> = {}) => ({
  userId: "hatchery-user-1",
  archivedAt: null,
  ...overrides,
});

const baseDate = new Date("2026-11-22T06:15:00.000Z");

// ─── HatcheryPartyPayment — party pays the hatchery (IN) ────────────────────

describe("postHatcheryPartyPaymentMovement", () => {
  const base = {
    userId: "hatchery-user-1",
    hatcheryPartyPaymentId: "hpp-1",
    accountId: "cash-1",
    amount: 2500,
    date: baseDate,
    partyName: "Ganga Traders",
    recordedById: "hatchery-user-1",
  };

  it("creates an IN / SALE_RECEIPT / HATCHERY_PARTY_PAYMENT movement on first call", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.cashMovement.findFirst.mockResolvedValueOnce(null);

    await postHatcheryPartyPaymentMovement({ tx: t as unknown as Prisma.TransactionClient, ...base });

    expect(t.cashMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "hatchery-user-1",
        accountId: "cash-1",
        bsDate: "2083-04-10",
        direction: "IN",
        category: "SALE_RECEIPT",
        sourceType: "HATCHERY_PARTY_PAYMENT",
        sourceId: "hpp-1",
        partyName: "Ganga Traders",
      }),
    });
  });

  it("updates in place on second call (idempotency)", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.cashMovement.findFirst.mockResolvedValueOnce({ id: "cm-1" });

    await postHatcheryPartyPaymentMovement({
      tx: t as unknown as Prisma.TransactionClient,
      ...base,
      amount: 2800,
    });

    expect(t.cashMovement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cm-1" },
        data: expect.objectContaining({ amount: new Prisma.Decimal(2800) }),
      }),
    );
    expect(t.cashMovement.create).not.toHaveBeenCalled();
  });

  it("refuses when the account is not owned by the user", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount({ userId: "other-user" }));
    await expect(
      postHatcheryPartyPaymentMovement({ tx: t as unknown as Prisma.TransactionClient, ...base }),
    ).rejects.toBeInstanceOf(CashflowError);
  });

  it("refuses when the account is archived", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount({ archivedAt: new Date() }));
    await expect(
      postHatcheryPartyPaymentMovement({ tx: t as unknown as Prisma.TransactionClient, ...base }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("falls back to the owner's User.id when a staff id is passed as recordedById", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.cashMovement.findFirst.mockResolvedValueOnce(null);
    // user.findUnique returns null → not a real User, so resolveRecordedById
    // falls back to the owner's User.id (`userId` passed through).
    t.user.findUnique.mockResolvedValueOnce(null);

    await postHatcheryPartyPaymentMovement({
      tx: t as unknown as Prisma.TransactionClient,
      ...base,
      recordedById: "staff-user-1-not-a-real-User",
    });

    expect(t.cashMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ recordedById: "hatchery-user-1" }),
    });
  });
});

describe("deleteHatcheryPartyPaymentMovement", () => {
  it("scopes the delete by userId + sourceType + sourceId", async () => {
    const t = tx();
    await deleteHatcheryPartyPaymentMovement(
      t as unknown as Prisma.TransactionClient,
      "hatchery-user-1",
      "hpp-1",
    );
    expect(t.cashMovement.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "hatchery-user-1",
        sourceType: "HATCHERY_PARTY_PAYMENT",
        sourceId: "hpp-1",
      },
    });
  });
});

// ─── HatcherySupplierTxn (type=PAYMENT only) — hatchery pays supplier (OUT) ──

describe("postHatcherySupplierPaymentMovement", () => {
  const base = {
    userId: "hatchery-user-1",
    hatcherySupplierTxnId: "hst-1",
    accountId: "cash-1",
    amount: 4000,
    date: baseDate,
    supplierName: "Shree Feed Mills",
    recordedById: "hatchery-user-1",
  };

  it("creates an OUT / PAYMENT_TO_DEALER / HATCHERY_SUPPLIER_PAYMENT movement", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.cashMovement.findFirst.mockResolvedValueOnce(null);

    await postHatcherySupplierPaymentMovement({
      tx: t as unknown as Prisma.TransactionClient,
      ...base,
    });

    expect(t.cashMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        direction: "OUT",
        category: "PAYMENT_TO_DEALER",
        sourceType: "HATCHERY_SUPPLIER_PAYMENT",
        sourceId: "hst-1",
        partyName: "Shree Feed Mills",
      }),
    });
  });

  it("is idempotent — second call updates", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.cashMovement.findFirst.mockResolvedValueOnce({ id: "cm-2" });

    await postHatcherySupplierPaymentMovement({
      tx: t as unknown as Prisma.TransactionClient,
      ...base,
      amount: 4500,
    });

    expect(t.cashMovement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cm-2" },
        data: expect.objectContaining({ amount: new Prisma.Decimal(4500) }),
      }),
    );
    expect(t.cashMovement.create).not.toHaveBeenCalled();
  });

  it("refuses an archived account", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount({ archivedAt: new Date() }));
    await expect(
      postHatcherySupplierPaymentMovement({ tx: t as unknown as Prisma.TransactionClient, ...base }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("deleteHatcherySupplierPaymentMovement", () => {
  it("scopes by HATCHERY_SUPPLIER_PAYMENT sourceType", async () => {
    const t = tx();
    await deleteHatcherySupplierPaymentMovement(
      t as unknown as Prisma.TransactionClient,
      "hatchery-user-1",
      "hst-1",
    );
    expect(t.cashMovement.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "hatchery-user-1",
        sourceType: "HATCHERY_SUPPLIER_PAYMENT",
        sourceId: "hst-1",
      },
    });
  });
});

// ─── HatcheryBatchExpense (MANUAL only) — real cash out ─────────────────────

describe("postHatcheryBatchExpenseMovement", () => {
  const base = {
    userId: "hatchery-user-1",
    hatcheryBatchExpenseId: "hbe-1",
    accountId: "cash-1",
    amount: 750,
    date: baseDate,
    partyName: "Labor — brooding",
    recordedById: "hatchery-user-1",
  };

  it("creates an OUT / EXPENSE / HATCHERY_BATCH_EXPENSE movement", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.cashMovement.findFirst.mockResolvedValueOnce(null);

    await postHatcheryBatchExpenseMovement({
      tx: t as unknown as Prisma.TransactionClient,
      ...base,
    });

    expect(t.cashMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        direction: "OUT",
        category: "EXPENSE",
        sourceType: "HATCHERY_BATCH_EXPENSE",
        sourceId: "hbe-1",
        partyName: "Labor — brooding",
      }),
    });
  });

  it("is idempotent — second call updates", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.cashMovement.findFirst.mockResolvedValueOnce({ id: "cm-3" });

    await postHatcheryBatchExpenseMovement({
      tx: t as unknown as Prisma.TransactionClient,
      ...base,
      amount: 800,
    });

    expect(t.cashMovement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cm-3" },
        data: expect.objectContaining({ amount: new Prisma.Decimal(800) }),
      }),
    );
    expect(t.cashMovement.create).not.toHaveBeenCalled();
  });
});

describe("deleteHatcheryBatchExpenseMovement", () => {
  it("scopes by HATCHERY_BATCH_EXPENSE sourceType", async () => {
    const t = tx();
    await deleteHatcheryBatchExpenseMovement(
      t as unknown as Prisma.TransactionClient,
      "hatchery-user-1",
      "hbe-1",
    );
    expect(t.cashMovement.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "hatchery-user-1",
        sourceType: "HATCHERY_BATCH_EXPENSE",
        sourceId: "hbe-1",
      },
    });
  });
});
