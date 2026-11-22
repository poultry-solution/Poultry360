/**
 * Phase 5 auto-post helpers. Prisma transaction client is mocked — these tests
 * assert the shape of the write (direction/category/sourceType), the
 * idempotency path (find-then-update vs find-then-create), and the account
 * ownership + active guards.
 *
 * End-to-end integration (sale -> SalePayment -> FarmerCashMovement in one tx)
 * is covered by salesController integration tests at the controller level.
 */

jest.mock("../../src/utils/nepalBsDate", () => ({
  // Keep this deterministic — we're not exercising the real BS/AD converter.
  toNepalBsDayString: jest.fn(() => "2083-04-10"),
}));

import { CashflowError } from "../../src/common/cashflow/errors";
import {
  deleteCustomerReceiptMovement,
  deleteExpenseMovement,
  deleteSalePaymentMovement,
  deleteStaffSalaryMovement,
  deleteSupplierPaymentMovement,
  ensureCashAccountId,
  postCustomerReceiptMovement,
  postSalePaymentMovement,
  postStaffSalaryMovement,
  postSupplierPaymentMovement,
  upsertExpenseMovement,
} from "../../src/services/farmerCashflowAutoPost";
import { Prisma } from "@prisma/client";

type MockedTx = {
  farmerCashAccount: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  farmerCashMovement: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
};

function tx(): MockedTx {
  return {
    farmerCashAccount: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    farmerCashMovement: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

const activeAccount = (overrides: Partial<Record<string, unknown>> = {}) => ({
  userId: "u1",
  archivedAt: null,
  ...overrides,
});

describe("upsertExpenseMovement", () => {
  const baseInput = {
    userId: "u1",
    expenseId: "exp-1",
    accountId: "cash-1",
    amount: 500,
    date: new Date("2026-11-22T06:15:00.000Z"),
    label: "Feed from Ram supplier",
    recordedById: "u1",
  };

  it("creates a new OUT / EXPENSE movement the first time", async () => {
    const t = tx();
    t.farmerCashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.farmerCashMovement.findFirst.mockResolvedValueOnce(null);
    t.farmerCashMovement.create.mockResolvedValueOnce({ id: "m-1" });

    await upsertExpenseMovement({ tx: t as any, ...baseInput });

    expect(t.farmerCashMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          accountId: "cash-1",
          direction: "OUT",
          category: "EXPENSE",
          sourceType: "EXPENSE",
          sourceId: "exp-1",
          partyName: "Feed from Ram supplier",
          bsDate: "2083-04-10",
        }),
      }),
    );
    expect(t.farmerCashMovement.update).not.toHaveBeenCalled();
  });

  it("updates the existing mirror on a second call (idempotent amount change)", async () => {
    const t = tx();
    t.farmerCashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.farmerCashMovement.findFirst.mockResolvedValueOnce({ id: "m-1" });
    t.farmerCashMovement.update.mockResolvedValueOnce({ id: "m-1" });

    await upsertExpenseMovement({
      tx: t as any,
      ...baseInput,
      amount: 750,
      label: "Feed from Ram supplier (edited)",
    });

    expect(t.farmerCashMovement.create).not.toHaveBeenCalled();
    expect(t.farmerCashMovement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "m-1" },
        data: expect.objectContaining({
          direction: "OUT",
          category: "EXPENSE",
          partyName: "Feed from Ram supplier (edited)",
        }),
      }),
    );
  });

  it("refuses non-positive amounts with a 400", async () => {
    await expect(
      upsertExpenseMovement({ tx: tx() as any, ...baseInput, amount: 0 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("refuses when the account is archived (409)", async () => {
    const t = tx();
    t.farmerCashAccount.findUnique.mockResolvedValueOnce(
      activeAccount({ archivedAt: new Date() }),
    );
    await expect(
      upsertExpenseMovement({ tx: t as any, ...baseInput }),
    ).rejects.toMatchObject({ status: 409 });
    expect(t.farmerCashMovement.create).not.toHaveBeenCalled();
  });

  it("refuses when the account belongs to someone else (403)", async () => {
    const t = tx();
    t.farmerCashAccount.findUnique.mockResolvedValueOnce(
      activeAccount({ userId: "other-user" }),
    );
    await expect(
      upsertExpenseMovement({ tx: t as any, ...baseInput }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("404s when the account id is unknown", async () => {
    const t = tx();
    t.farmerCashAccount.findUnique.mockResolvedValueOnce(null);
    await expect(
      upsertExpenseMovement({ tx: t as any, ...baseInput }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("postSalePaymentMovement", () => {
  it("writes an IN / SALE_RECEIPT with sourceType = SALE_PAYMENT", async () => {
    const t = tx();
    t.farmerCashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.farmerCashMovement.findFirst.mockResolvedValueOnce(null);
    t.farmerCashMovement.create.mockResolvedValueOnce({ id: "m-sp" });

    await postSalePaymentMovement({
      tx: t as any,
      userId: "u1",
      salePaymentId: "sp-1",
      accountId: "cash-1",
      amount: 500, // partial payment of a 2000 sale
      date: new Date("2026-11-22T06:15:00.000Z"),
      partyName: "Ram Thapa",
      recordedById: "u1",
    });

    expect(t.farmerCashMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "IN",
          category: "SALE_RECEIPT",
          sourceType: "SALE_PAYMENT",
          sourceId: "sp-1",
          partyName: "Ram Thapa",
          amount: new Prisma.Decimal(500),
        }),
      }),
    );
  });
});

describe("postCustomerReceiptMovement", () => {
  it("writes an IN / SALE_RECEIPT with sourceType = CUSTOMER_RECEIPT", async () => {
    const t = tx();
    t.farmerCashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.farmerCashMovement.findFirst.mockResolvedValueOnce(null);
    t.farmerCashMovement.create.mockResolvedValueOnce({ id: "m-r" });

    await postCustomerReceiptMovement({
      tx: t as any,
      userId: "u1",
      customerTransactionId: "ctx-1",
      accountId: "cash-1",
      amount: 1000,
      date: new Date("2026-11-22T06:15:00.000Z"),
      partyName: "Sita Gurung",
      recordedById: "u1",
    });

    expect(t.farmerCashMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "IN",
          category: "SALE_RECEIPT",
          sourceType: "CUSTOMER_RECEIPT",
          sourceId: "ctx-1",
        }),
      }),
    );
  });
});

describe("postSupplierPaymentMovement", () => {
  it("writes an OUT / PAYMENT_TO_DEALER with sourceType = SUPPLIER_PAYMENT", async () => {
    const t = tx();
    t.farmerCashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.farmerCashMovement.findFirst.mockResolvedValueOnce(null);
    t.farmerCashMovement.create.mockResolvedValueOnce({ id: "m-sup" });

    await postSupplierPaymentMovement({
      tx: t as any,
      userId: "u1",
      entityTransactionId: "et-1",
      accountId: "cash-1",
      amount: 15_000,
      date: new Date("2026-11-22T06:15:00.000Z"),
      supplierName: "Golden Feed Co",
      recordedById: "u1",
    });

    expect(t.farmerCashMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "OUT",
          category: "PAYMENT_TO_DEALER",
          sourceType: "SUPPLIER_PAYMENT",
          sourceId: "et-1",
          partyName: "Golden Feed Co",
          amount: new Prisma.Decimal(15_000),
        }),
      }),
    );
  });
});

describe("postStaffSalaryMovement", () => {
  it("writes an OUT / EXPENSE with sourceType = STAFF_PAYMENT and the staff name as party", async () => {
    const t = tx();
    t.farmerCashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.farmerCashMovement.findFirst.mockResolvedValueOnce(null);
    t.farmerCashMovement.create.mockResolvedValueOnce({ id: "m-staff" });

    await postStaffSalaryMovement({
      tx: t as any,
      userId: "u1",
      staffPaymentId: "sp-1",
      accountId: "cash-1",
      amount: 8_000,
      date: new Date("2026-11-22T06:15:00.000Z"),
      staffName: "Sunita",
      recordedById: "u1",
    });

    expect(t.farmerCashMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "OUT",
          category: "EXPENSE",
          sourceType: "STAFF_PAYMENT",
          sourceId: "sp-1",
          partyName: "Sunita",
          amount: new Prisma.Decimal(8_000),
        }),
      }),
    );
  });
});

describe("delete helpers", () => {
  it("deleteExpenseMovement scopes by (userId, sourceType=EXPENSE, sourceId)", async () => {
    const t = tx();
    await deleteExpenseMovement(t as any, "u1", "exp-1");
    expect(t.farmerCashMovement.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", sourceType: "EXPENSE", sourceId: "exp-1" },
    });
  });

  it("deleteSalePaymentMovement scopes by SALE_PAYMENT", async () => {
    const t = tx();
    await deleteSalePaymentMovement(t as any, "u1", "sp-1");
    expect(t.farmerCashMovement.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", sourceType: "SALE_PAYMENT", sourceId: "sp-1" },
    });
  });

  it("deleteCustomerReceiptMovement scopes by CUSTOMER_RECEIPT", async () => {
    const t = tx();
    await deleteCustomerReceiptMovement(t as any, "u1", "ctx-1");
    expect(t.farmerCashMovement.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", sourceType: "CUSTOMER_RECEIPT", sourceId: "ctx-1" },
    });
  });

  it("deleteSupplierPaymentMovement scopes by SUPPLIER_PAYMENT", async () => {
    const t = tx();
    await deleteSupplierPaymentMovement(t as any, "u1", "et-1");
    expect(t.farmerCashMovement.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", sourceType: "SUPPLIER_PAYMENT", sourceId: "et-1" },
    });
  });

  it("deleteStaffSalaryMovement scopes by STAFF_PAYMENT", async () => {
    const t = tx();
    await deleteStaffSalaryMovement(t as any, "u1", "sp-1");
    expect(t.farmerCashMovement.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", sourceType: "STAFF_PAYMENT", sourceId: "sp-1" },
    });
  });
});

describe("ensureCashAccountId", () => {
  it("returns the existing CASH account id without creating", async () => {
    const t = tx();
    t.farmerCashAccount.findFirst.mockResolvedValueOnce({ id: "cash-existing" });
    const id = await ensureCashAccountId(t as any, "u1");
    expect(id).toBe("cash-existing");
    expect(t.farmerCashAccount.create).not.toHaveBeenCalled();
  });

  it("creates when missing, anchored at BS 2000-01-01", async () => {
    const t = tx();
    t.farmerCashAccount.findFirst.mockResolvedValueOnce(null);
    t.farmerCashAccount.create.mockResolvedValueOnce({ id: "cash-new" });
    const id = await ensureCashAccountId(t as any, "u1");
    expect(id).toBe("cash-new");
    expect(t.farmerCashAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          type: "CASH",
          name: "Cash",
          openingBsDate: "2000-01-01",
        }),
      }),
    );
  });
});

describe("CashflowError carries", () => {
  it("instance checks work across the module boundary", () => {
    expect(new CashflowError("x", 403)).toBeInstanceOf(CashflowError);
  });
});
