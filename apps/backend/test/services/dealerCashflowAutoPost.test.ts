/**
 * Phase 2 dealer auto-post helpers. Prisma transaction client is mocked —
 * these tests assert the shape of the write (direction/category/sourceType),
 * the idempotency path (find-then-update vs find-then-create), the account
 * ownership + active guards, and the invariants that distinguish dealer-side
 * events from farmer-side ones.
 *
 * End-to-end integration (createDealerSale → DealerSalePayment → CashMovement
 * in one tx) is covered by controller tests. This file covers the primitive
 * helpers only.
 */

jest.mock("../../src/utils/nepalBsDate", () => ({
  toNepalBsDayString: jest.fn(() => "2083-04-10"),
}));

import { CashflowError } from "../../src/common/cashflow/errors";
import {
  deleteBroilerSettlementMovements,
  deleteDealerLedgerPaymentMovement,
  deleteDealerLedgerReceiptMovement,
  deleteDealerSalePaymentMovement,
  deleteDealerSupplierPaymentMovement,
  postBroilerSettlementPayoutMovement,
  postDealerLedgerPaymentMovement,
  postDealerLedgerReceiptMovement,
  postDealerSalePaymentMovement,
  postDealerSupplierPaymentMovement,
} from "../../src/services/dealerCashflowAutoPost";
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
  };
}

const activeAccount = (overrides: Partial<Record<string, unknown>> = {}) => ({
  userId: "dealer-user-1",
  archivedAt: null,
  ...overrides,
});

const baseDate = new Date("2026-11-22T06:15:00.000Z");

// ─── DealerSalePayment ──────────────────────────────────────────────────────

describe("postDealerSalePaymentMovement", () => {
  const base = {
    userId: "dealer-user-1",
    dealerSalePaymentId: "dsp-1",
    accountId: "cash-1",
    amount: 1500,
    date: baseDate,
    partyName: "Ram Bahadur",
    recordedById: "dealer-user-1",
  };

  it("creates an IN / SALE_RECEIPT / DEALER_SALE_PAYMENT movement on first call", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.cashMovement.findFirst.mockResolvedValueOnce(null);

    await postDealerSalePaymentMovement({ tx: t as unknown as Prisma.TransactionClient, ...base });

    expect(t.cashMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "dealer-user-1",
        accountId: "cash-1",
        bsDate: "2083-04-10",
        direction: "IN",
        category: "SALE_RECEIPT",
        sourceType: "DEALER_SALE_PAYMENT",
        sourceId: "dsp-1",
        partyName: "Ram Bahadur",
      }),
    });
  });

  it("updates in place on second call (idempotency)", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.cashMovement.findFirst.mockResolvedValueOnce({ id: "cm-1" });

    await postDealerSalePaymentMovement({ tx: t as unknown as Prisma.TransactionClient, ...base, amount: 1800 });

    expect(t.cashMovement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cm-1" },
        data: expect.objectContaining({ amount: new Prisma.Decimal(1800) }),
      }),
    );
    expect(t.cashMovement.create).not.toHaveBeenCalled();
  });

  it("refuses when the account is not owned by the user", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount({ userId: "other-user" }));
    await expect(
      postDealerSalePaymentMovement({ tx: t as unknown as Prisma.TransactionClient, ...base }),
    ).rejects.toBeInstanceOf(CashflowError);
  });

  it("refuses when the account is archived", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount({ archivedAt: new Date() }));
    await expect(
      postDealerSalePaymentMovement({ tx: t as unknown as Prisma.TransactionClient, ...base }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("deleteDealerSalePaymentMovement", () => {
  it("scopes the delete by userId + sourceType + sourceId", async () => {
    const t = tx();
    await deleteDealerSalePaymentMovement(
      t as unknown as Prisma.TransactionClient,
      "dealer-user-1",
      "dsp-1",
    );
    expect(t.cashMovement.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "dealer-user-1",
        sourceType: "DEALER_SALE_PAYMENT",
        sourceId: "dsp-1",
      },
    });
  });
});

// ─── DealerLedgerEntry — Receipt (customer paid cash) ────────────────────────

describe("postDealerLedgerReceiptMovement", () => {
  it("creates an IN / SALE_RECEIPT / DEALER_LEDGER_RECEIPT movement", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.cashMovement.findFirst.mockResolvedValueOnce(null);

    await postDealerLedgerReceiptMovement({
      tx: t as unknown as Prisma.TransactionClient,
      userId: "dealer-user-1",
      dealerLedgerEntryId: "dle-1",
      accountId: "cash-1",
      amount: 500,
      date: baseDate,
      partyName: "Sita Gurung",
      recordedById: "dealer-user-1",
    });

    expect(t.cashMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        direction: "IN",
        category: "SALE_RECEIPT",
        sourceType: "DEALER_LEDGER_RECEIPT",
        sourceId: "dle-1",
      }),
    });
  });
});

describe("deleteDealerLedgerReceiptMovement", () => {
  it("scopes by DEALER_LEDGER_RECEIPT sourceType", async () => {
    const t = tx();
    await deleteDealerLedgerReceiptMovement(
      t as unknown as Prisma.TransactionClient,
      "dealer-user-1",
      "dle-1",
    );
    expect(t.cashMovement.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "dealer-user-1",
        sourceType: "DEALER_LEDGER_RECEIPT",
        sourceId: "dle-1",
      },
    });
  });
});

// ─── DealerLedgerEntry — Payment (dealer gave cash to customer) ─────────────

describe("postDealerLedgerPaymentMovement", () => {
  it("creates an OUT / CASH_OUT / DEALER_LEDGER_PAYMENT movement", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.cashMovement.findFirst.mockResolvedValueOnce(null);

    await postDealerLedgerPaymentMovement({
      tx: t as unknown as Prisma.TransactionClient,
      userId: "dealer-user-1",
      dealerLedgerEntryId: "dle-2",
      accountId: "cash-1",
      amount: 300,
      date: baseDate,
      partyName: "Krishna Thapa",
      recordedById: "dealer-user-1",
    });

    expect(t.cashMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        direction: "OUT",
        category: "CASH_OUT",
        sourceType: "DEALER_LEDGER_PAYMENT",
        sourceId: "dle-2",
      }),
    });
  });
});

describe("deleteDealerLedgerPaymentMovement", () => {
  it("scopes by DEALER_LEDGER_PAYMENT sourceType", async () => {
    const t = tx();
    await deleteDealerLedgerPaymentMovement(
      t as unknown as Prisma.TransactionClient,
      "dealer-user-1",
      "dle-2",
    );
    expect(t.cashMovement.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "dealer-user-1",
        sourceType: "DEALER_LEDGER_PAYMENT",
        sourceId: "dle-2",
      },
    });
  });
});

// ─── Supplier payment (DealerManualCompanyPayment) ──────────────────────────

describe("postDealerSupplierPaymentMovement", () => {
  const base = {
    userId: "dealer-user-1",
    dealerManualCompanyPaymentId: "dmcp-1",
    accountId: "cash-1",
    amount: 2000,
    date: baseDate,
    supplierName: "Shree Feed Mills",
    recordedById: "dealer-user-1",
  };

  it("MADE direction → OUT / PAYMENT_TO_DEALER", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.cashMovement.findFirst.mockResolvedValueOnce(null);

    await postDealerSupplierPaymentMovement({
      tx: t as unknown as Prisma.TransactionClient,
      ...base,
      direction: "MADE",
    });

    expect(t.cashMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        direction: "OUT",
        category: "PAYMENT_TO_DEALER",
        sourceType: "DEALER_SUPPLIER_PAYMENT",
      }),
    });
  });

  it("RECEIVED direction → IN / SALE_RECEIPT (supplier refund)", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.cashMovement.findFirst.mockResolvedValueOnce(null);

    await postDealerSupplierPaymentMovement({
      tx: t as unknown as Prisma.TransactionClient,
      ...base,
      direction: "RECEIVED",
    });

    expect(t.cashMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        direction: "IN",
        category: "SALE_RECEIPT",
        sourceType: "DEALER_SUPPLIER_PAYMENT",
      }),
    });
  });
});

describe("deleteDealerSupplierPaymentMovement", () => {
  it("scopes by DEALER_SUPPLIER_PAYMENT sourceType", async () => {
    const t = tx();
    await deleteDealerSupplierPaymentMovement(
      t as unknown as Prisma.TransactionClient,
      "dealer-user-1",
      "dmcp-1",
    );
    expect(t.cashMovement.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "dealer-user-1",
        sourceType: "DEALER_SUPPLIER_PAYMENT",
        sourceId: "dmcp-1",
      },
    });
  });
});

// ─── Broiler settlement — farmerPayout OUT leg only ─────────────────────────

describe("postBroilerSettlementPayoutMovement", () => {
  it("creates an OUT / CASH_OUT / BROILER_SETTLEMENT_PAYOUT movement and labels the partyName", async () => {
    const t = tx();
    t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
    t.cashMovement.findFirst.mockResolvedValueOnce(null);

    await postBroilerSettlementPayoutMovement({
      tx: t as unknown as Prisma.TransactionClient,
      userId: "dealer-user-1",
      broilerSaleSettlementId: "bss-1",
      accountId: "cash-1",
      amount: 8000,
      date: baseDate,
      farmerName: "Ram Prasad",
      recordedById: "dealer-user-1",
    });

    expect(t.cashMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        direction: "OUT",
        category: "CASH_OUT",
        sourceType: "BROILER_SETTLEMENT_PAYOUT",
        sourceId: "bss-1",
        partyName: "Payout to Ram Prasad",
      }),
    });
  });
});

describe("deleteBroilerSettlementMovements", () => {
  it("removes both proceeds and payout legs by settlement id", async () => {
    const t = tx();
    await deleteBroilerSettlementMovements(
      t as unknown as Prisma.TransactionClient,
      "dealer-user-1",
      "bss-1",
    );
    expect(t.cashMovement.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "dealer-user-1",
        sourceType: {
          in: ["BROILER_SETTLEMENT_PAYOUT", "BROILER_SETTLEMENT_PROCEEDS"],
        },
        sourceId: "bss-1",
      },
    });
  });
});
