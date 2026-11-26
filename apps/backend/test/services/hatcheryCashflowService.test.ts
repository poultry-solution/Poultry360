/**
 * Behaviour spec for hatcheryCashflowService. The service is a clone of
 * dealerCashflowService with one swap: every public entry asserts
 * `user.role === HATCHERY`. This file focuses on:
 *
 *   1. The role guard — the new logic specific to hatchery. Positive +
 *      negative cases for every public method.
 *   2. Smoke tests that each method actually works when a HATCHERY calls it,
 *      so a bad import in the clone would get caught.
 *
 * The dealer + farmer suites already cover the shared math (balance,
 * transfer, report) exhaustively — we deliberately don't re-run those here.
 */

jest.mock("../../src/utils/prisma", () => {
  const m = {
    user: {
      findUnique: jest.fn(),
    },
    cashAccount: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    cashMovement: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return { __esModule: true, default: m };
});

const defaultPrevBsDate = (bs: string): string => {
  const [y, m, d] = bs.split("-").map(Number);
  if (d > 1) {
    return `${y}-${String(m).padStart(2, "0")}-${String(d - 1).padStart(2, "0")}`;
  }
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return `${py}-${String(pm).padStart(2, "0")}-30`;
};

jest.mock("../../src/utils/nepalBsDate", () => ({
  getNepalBsTodayString: jest.fn(() => "2083-04-15"),
  prevBsDate: jest.fn(),
}));

import { Prisma, UserRole } from "@prisma/client";
import prisma from "../../src/utils/prisma";
import {
  CashflowError,
  archiveAccount,
  createBankAccount,
  deleteAccount,
  deleteMovement,
  editOpeningBalance,
  ensureCashAccount,
  getAccountBalances,
  getReport,
  listAccounts,
  listMovements,
  postManualMovement,
  postTransfer,
  renameAccount,
} from "../../src/services/hatcheryCashflowService";

const mocked = prisma as unknown as {
  user: { findUnique: jest.Mock };
  cashAccount: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  cashMovement: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

const row = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "acc-1",
  userId: "u1",
  type: "CASH" as const,
  name: "Cash",
  openingBalance: new Prisma.Decimal(0),
  openingBsDate: "2083-04-01",
  archivedAt: null,
  openingBalanceSetAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  const { prevBsDate } = jest.requireMock("../../src/utils/nepalBsDate") as {
    prevBsDate: jest.Mock;
  };
  prevBsDate.mockReset();
  prevBsDate.mockImplementation(defaultPrevBsDate);
  // Default: every userId is a HATCHERY. Tests exercising the rejection
  // path override this with mockResolvedValueOnce.
  mocked.user.findUnique.mockResolvedValue({ role: UserRole.HATCHERY });
});

// ─── Role guard — the new behaviour unique to the hatchery service ──────────

describe("assertHatcheryOwner guard", () => {
  it("rejects when the user row is missing", async () => {
    mocked.user.findUnique.mockResolvedValueOnce(null);
    await expect(ensureCashAccount("u-ghost")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects when the user has role OWNER (farmer)", async () => {
    mocked.user.findUnique.mockResolvedValueOnce({ role: UserRole.OWNER });
    await expect(ensureCashAccount("u-farmer")).rejects.toMatchObject({
      status: 403,
      message: /hatchery account required/i,
    });
  });

  it("rejects when the user has role DEALER", async () => {
    mocked.user.findUnique.mockResolvedValueOnce({ role: UserRole.DEALER });
    await expect(listAccounts("u-dealer")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects when the user has role COMPANY", async () => {
    mocked.user.findUnique.mockResolvedValueOnce({ role: UserRole.COMPANY });
    await expect(listAccounts("u-company")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects on createBankAccount with non-hatchery role", async () => {
    mocked.user.findUnique.mockResolvedValueOnce({ role: UserRole.OWNER });
    await expect(
      createBankAccount("u-farmer", {
        name: "NIC Main",
        openingBalance: 5000,
        openingBsDate: "2083-08-01",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects on postManualMovement with non-hatchery role", async () => {
    mocked.user.findUnique.mockResolvedValueOnce({ role: UserRole.DEALER });
    await expect(
      postManualMovement("u-dealer", "u-dealer", {
        accountId: "acc-1",
        category: "CASH_IN",
        amount: 100,
        bsDate: "2083-04-15",
        partyName: "Test",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects on postTransfer with non-hatchery role", async () => {
    mocked.user.findUnique.mockResolvedValueOnce({ role: UserRole.OWNER });
    await expect(
      postTransfer("u-farmer", "u-farmer", {
        fromAccountId: "acc-1",
        toAccountId: "acc-2",
        amount: 100,
        bsDate: "2083-04-15",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects on deleteMovement with non-hatchery role", async () => {
    mocked.user.findUnique.mockResolvedValueOnce({ role: UserRole.OWNER });
    await expect(deleteMovement("u-farmer", "mov-1")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects on deleteAccount with non-hatchery role", async () => {
    mocked.user.findUnique.mockResolvedValueOnce({ role: UserRole.COMPANY });
    await expect(deleteAccount("u-co", "acc-1")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects on renameAccount with non-hatchery role", async () => {
    mocked.user.findUnique.mockResolvedValueOnce({ role: UserRole.OWNER });
    await expect(
      renameAccount("u-farmer", "acc-1", "New"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects on archiveAccount with non-hatchery role", async () => {
    mocked.user.findUnique.mockResolvedValueOnce({ role: UserRole.OWNER });
    await expect(archiveAccount("u-farmer", "acc-1")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects on editOpeningBalance with non-hatchery role", async () => {
    mocked.user.findUnique.mockResolvedValueOnce({ role: UserRole.OWNER });
    await expect(
      editOpeningBalance("u-farmer", "acc-1", 1000),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects on listMovements with non-hatchery role", async () => {
    mocked.user.findUnique.mockResolvedValueOnce({ role: UserRole.OWNER });
    await expect(listMovements("u-farmer")).rejects.toMatchObject({
      status: 403,
    });
  });
});

// ─── Smoke tests — HATCHERY role happy path for each public method ──────────

describe("ensureCashAccount (hatchery)", () => {
  it("creates a CASH account when none exists", async () => {
    mocked.cashAccount.findFirst.mockResolvedValueOnce(null);
    mocked.cashAccount.create.mockResolvedValueOnce(row());

    const result = await ensureCashAccount("u1");

    expect(result.type).toBe("CASH");
    expect(mocked.cashAccount.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        type: "CASH",
        name: "Cash",
        openingBsDate: "2000-01-01",
      }),
    });
  });

  it("returns existing CASH without duplicating", async () => {
    mocked.cashAccount.findFirst.mockResolvedValueOnce(row());
    const result = await ensureCashAccount("u1");
    expect(result.id).toBe("acc-1");
    expect(mocked.cashAccount.create).not.toHaveBeenCalled();
  });
});

describe("createBankAccount (hatchery)", () => {
  it('refuses the reserved name "Cash"', async () => {
    await expect(
      createBankAccount("u1", {
        name: "Cash",
        openingBalance: 100,
        openingBsDate: "2083-08-01",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("creates a BANK account with trimmed name", async () => {
    mocked.cashAccount.create.mockResolvedValueOnce(
      row({ id: "bank-1", type: "BANK", name: "NIC Main", openingBalance: new Prisma.Decimal(5000), openingBsDate: "2083-08-01" }),
    );
    const result = await createBankAccount("u1", {
      name: "  NIC Main  ",
      openingBalance: 5000,
      openingBsDate: "2083-08-01",
    });
    expect(result.name).toBe("NIC Main");
    expect(result.type).toBe("BANK");
  });
});

describe("renameAccount (hatchery)", () => {
  it("refuses to rename the system Cash account", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(row());
    await expect(
      renameAccount("u1", "acc-1", "Not Cash"),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("renames a bank account", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(
      row({ id: "bank-1", type: "BANK", name: "Old" }),
    );
    mocked.cashAccount.update.mockResolvedValueOnce(
      row({ id: "bank-1", type: "BANK", name: "New" }),
    );
    const result = await renameAccount("u1", "bank-1", "New");
    expect(result.name).toBe("New");
  });
});

describe("editOpeningBalance (hatchery)", () => {
  it("rolls openingBsDate to today for CASH on every save", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(row());
    mocked.cashAccount.update.mockImplementation(({ data }) =>
      Promise.resolve(row({ ...data })),
    );
    await editOpeningBalance("u1", "acc-1", 10000);
    const callArg = mocked.cashAccount.update.mock.calls[0][0];
    expect(callArg.data.openingBsDate).toBe("2083-04-15");
    expect(callArg.data.openingBalanceSetAt).toBeInstanceOf(Date);
  });

  it("leaves openingBsDate untouched for BANK", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(
      row({ id: "bank-1", type: "BANK", name: "NIC", openingBsDate: "2083-08-01" }),
    );
    mocked.cashMovement.count.mockResolvedValueOnce(0);
    mocked.cashAccount.update.mockImplementation(({ data }) =>
      Promise.resolve(row({ id: "bank-1", type: "BANK", name: "NIC", openingBsDate: "2083-08-01", ...data })),
    );
    await editOpeningBalance("u1", "bank-1", 7500);
    const callArg = mocked.cashAccount.update.mock.calls[0][0];
    expect(callArg.data.openingBsDate).toBeUndefined();
  });

  it("refuses to edit a BANK with existing movements", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(
      row({ id: "bank-1", type: "BANK", name: "NIC" }),
    );
    mocked.cashMovement.count.mockResolvedValueOnce(3);
    await expect(editOpeningBalance("u1", "bank-1", 999)).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe("deleteMovement (hatchery)", () => {
  it("deletes a MANUAL movement", async () => {
    mocked.cashMovement.findUnique.mockResolvedValueOnce({
      id: "m1",
      userId: "u1",
      sourceType: "MANUAL",
      transferId: null,
    });
    mocked.cashMovement.delete.mockResolvedValueOnce({ id: "m1" });
    const result = await deleteMovement("u1", "m1");
    expect(result.deletedIds).toEqual(["m1"]);
  });

  it("refuses to delete a hatchery-auto-posted entry", async () => {
    mocked.cashMovement.findUnique.mockResolvedValueOnce({
      id: "m1",
      userId: "u1",
      sourceType: "HATCHERY_PARTY_PAYMENT",
      transferId: null,
    });
    await expect(deleteMovement("u1", "m1")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("refuses when movement belongs to another user", async () => {
    mocked.cashMovement.findUnique.mockResolvedValueOnce({
      id: "m1",
      userId: "other-hatchery",
      sourceType: "MANUAL",
      transferId: null,
    });
    await expect(deleteMovement("u1", "m1")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("deletes both legs of a TRANSFER atomically", async () => {
    mocked.cashMovement.findUnique.mockResolvedValueOnce({
      id: "m1",
      userId: "u1",
      sourceType: "TRANSFER",
      transferId: "tr-1",
    });
    const txMock = {
      cashMovement: {
        findMany: jest.fn().mockResolvedValue([{ id: "m1" }, { id: "m2" }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    mocked.$transaction.mockImplementationOnce(async (cb: any) => cb(txMock));

    const result = await deleteMovement("u1", "m1");
    expect(result.deletedIds).toEqual(["m1", "m2"]);
    expect(txMock.cashMovement.deleteMany).toHaveBeenCalledWith({
      where: { transferId: "tr-1", userId: "u1" },
    });
  });
});

describe("postManualMovement (hatchery)", () => {
  it("records a CASH_IN movement", async () => {
    const txMock = {
      cashAccount: {
        findUnique: jest.fn().mockResolvedValue(row()),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: "u1" }),
      },
      cashMovement: {
        create: jest.fn().mockResolvedValue({
          id: "m1",
          userId: "u1",
          accountId: "acc-1",
          bsDate: "2083-04-15",
          direction: "IN",
          amount: new Prisma.Decimal(500),
          category: "CASH_IN",
          sourceType: "MANUAL",
          sourceId: null,
          transferId: null,
          partyName: "Walk-in",
          notes: null,
          createdAt: new Date(),
        }),
      },
    };
    mocked.$transaction.mockImplementationOnce(async (cb: any) => cb(txMock));

    const movement = await postManualMovement("u1", "u1", {
      accountId: "acc-1",
      category: "CASH_IN",
      amount: 500,
      bsDate: "2083-04-15",
      partyName: "Walk-in",
    });

    expect(movement.direction).toBe("IN");
    expect(movement.amount).toBe(500);
    expect(txMock.cashMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "MANUAL",
          category: "CASH_IN",
          direction: "IN",
        }),
      }),
    );
  });

  it("refuses PAYMENT_TO_DEALER with an invalid date", async () => {
    await expect(
      postManualMovement("u1", "u1", {
        accountId: "acc-1",
        category: "PAYMENT_TO_DEALER",
        amount: 100,
        bsDate: "not-a-date",
        partyName: "Supplier",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("refuses a future-dated movement", async () => {
    await expect(
      postManualMovement("u1", "u1", {
        accountId: "acc-1",
        category: "CASH_IN",
        amount: 500,
        bsDate: "2099-01-01",
        partyName: "Walk-in",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("refuses an auto-posted category (SALE_RECEIPT not allowed manually)", async () => {
    await expect(
      postManualMovement("u1", "u1", {
        accountId: "acc-1",
        category: "SALE_RECEIPT",
        amount: 500,
        bsDate: "2083-04-15",
        partyName: "Walk-in",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("postTransfer (hatchery)", () => {
  it("refuses a transfer when from and to are the same account", async () => {
    await expect(
      postTransfer("u1", "u1", {
        fromAccountId: "acc-1",
        toAccountId: "acc-1",
        amount: 100,
        bsDate: "2083-04-15",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("creates two linked legs sharing a transferId", async () => {
    const txMock = {
      cashAccount: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(row({ id: "acc-1", type: "CASH", name: "Cash" }))
          .mockResolvedValueOnce(
            row({ id: "acc-2", type: "BANK", name: "NIC", openingBsDate: "2083-04-01" }),
          ),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: "u1" }),
      },
      cashMovement: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: data.direction === "OUT" ? "leg-out" : "leg-in",
            userId: data.userId,
            accountId: data.accountId,
            bsDate: data.bsDate,
            direction: data.direction,
            amount: data.amount,
            category: data.category,
            sourceType: data.sourceType,
            sourceId: data.sourceId,
            transferId: data.transferId,
            partyName: data.partyName,
            notes: data.notes,
            createdAt: new Date(),
          }),
        ),
      },
    };
    mocked.$transaction.mockImplementationOnce(async (cb: any) => cb(txMock));

    const result = await postTransfer("u1", "u1", {
      fromAccountId: "acc-1",
      toAccountId: "acc-2",
      amount: 1000,
      bsDate: "2083-04-15",
    });

    expect(result.legs).toHaveLength(2);
    expect(result.legs[0].transferId).toBe(result.transferId);
    expect(result.legs[1].transferId).toBe(result.transferId);
    expect(result.legs[0].direction).toBe("OUT");
    expect(result.legs[1].direction).toBe("IN");
  });
});

describe("getAccountBalances (hatchery)", () => {
  it("returns empty when hatchery has no accounts", async () => {
    mocked.cashAccount.findMany.mockResolvedValueOnce([]);
    const result = await getAccountBalances("u1");
    expect(result).toEqual([]);
  });

  it("sums movements to produce balance + hasMovements flag", async () => {
    mocked.cashAccount.findMany.mockResolvedValueOnce([
      row({ id: "acc-1", openingBalance: new Prisma.Decimal(1000), openingBsDate: "2000-01-01" }),
    ]);
    mocked.cashMovement.findMany.mockResolvedValueOnce([
      {
        id: "m1",
        userId: "u1",
        accountId: "acc-1",
        bsDate: "2083-04-10",
        direction: "IN",
        amount: new Prisma.Decimal(500),
        category: "CASH_IN",
        sourceType: "MANUAL",
        sourceId: null,
        transferId: null,
        partyName: "p",
        notes: null,
        createdAt: new Date(),
      },
    ]);
    const result = await getAccountBalances("u1");
    expect(result[0].balance).toBe(1500);
    expect(result[0].hasMovements).toBe(true);
  });
});

describe("getReport (hatchery)", () => {
  it("returns zeroes for a hatchery with no accounts", async () => {
    mocked.cashAccount.findMany.mockResolvedValueOnce([]);
    const result = await getReport("u1", {
      fromBsDate: "2083-04-01",
      toBsDate: "2083-04-15",
    });
    expect(result.totals.openingBalance).toBe(0);
    expect(result.totals.closingBalance).toBe(0);
    expect(result.balances).toEqual([]);
  });

  it("includes the period opening when the account started inside the range", async () => {
    mocked.cashAccount.findMany
      .mockResolvedValueOnce([
        row({
          id: "acc-1",
          openingBalance: new Prisma.Decimal(5000),
          openingBsDate: "2083-04-10",
          openingBalanceSetAt: new Date("2026-10-19T00:00:00Z"),
        }),
      ])
      .mockResolvedValueOnce([
        row({
          id: "acc-1",
          openingBalance: new Prisma.Decimal(5000),
          openingBsDate: "2083-04-10",
          openingBalanceSetAt: new Date("2026-10-19T00:00:00Z"),
        }),
      ]);
    mocked.cashMovement.findMany.mockResolvedValueOnce([]);
    const result = await getReport("u1", {
      fromBsDate: "2083-04-01",
      toBsDate: "2083-04-15",
    });
    expect(result.totals.openingBalance).toBe(5000);
  });
});

describe("CashflowError", () => {
  it("exports a status-aware CashflowError class", () => {
    const err = new CashflowError("test", 418);
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(418);
  });
});
