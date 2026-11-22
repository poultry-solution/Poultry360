/**
 * Guard-path tests for farmerCashflowService. Prisma is mocked — this is a
 * behaviour spec for the service's validation / ownership / idempotency rules.
 * End-to-end DB behaviour is covered by the pure-domain tests and the
 * forthcoming service integration suite (PR 2+).
 */

jest.mock("../../src/utils/prisma", () => {
  const m = {
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
  // Simplified prev-day — good enough for lexicographic-sort tests. Assumes
  // a 30-day BS month, which is fine for the controller-level assertions here
  // (unit tests don't need the real Nepali calendar).
  prevBsDate: jest.fn(),
}));

import { Prisma } from "@prisma/client";
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
  listMovements,
  postManualMovement,
  postTransfer,
  renameAccount,
} from "../../src/services/farmerCashflowService";

const mocked = prisma as unknown as {
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
  // Reset prevBsDate to its default BEFORE every test — mockImplementationOnce
  // queues from a previous test would otherwise leak into the next test's
  // first call.
  const { prevBsDate } = jest.requireMock("../../src/utils/nepalBsDate") as {
    prevBsDate: jest.Mock;
  };
  prevBsDate.mockReset();
  prevBsDate.mockImplementation(defaultPrevBsDate);
});

describe("ensureCashAccount", () => {
  it("returns the existing CASH account without creating a second one", async () => {
    mocked.cashAccount.findFirst.mockResolvedValueOnce(row());
    const result = await ensureCashAccount("u1");
    expect(result.id).toBe("acc-1");
    expect(mocked.cashAccount.create).not.toHaveBeenCalled();
  });

  it("creates when none exists", async () => {
    mocked.cashAccount.findFirst.mockResolvedValueOnce(null);
    mocked.cashAccount.create.mockResolvedValueOnce(row({ id: "new-1" }));
    const result = await ensureCashAccount("u1");
    expect(result.id).toBe("new-1");
    expect(mocked.cashAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", type: "CASH", name: "Cash" }),
      }),
    );
  });

  it("recovers from P2002 by re-fetching the winning row", async () => {
    mocked.cashAccount.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(row({ id: "winner-1" }));
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      "unique violation",
      { code: "P2002", clientVersion: "test" },
    );
    mocked.cashAccount.create.mockRejectedValueOnce(p2002);

    const result = await ensureCashAccount("u1");
    expect(result.id).toBe("winner-1");
    expect(mocked.cashAccount.findFirst).toHaveBeenCalledTimes(2);
  });
});

describe("createBankAccount", () => {
  it('refuses the reserved name "Cash"', async () => {
    await expect(
      createBankAccount("u1", {
        name: "cash",
        openingBalance: 0,
        openingBsDate: "2083-04-01",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("refuses an invalid BS date", async () => {
    await expect(
      createBankAccount("u1", {
        name: "NIC",
        openingBalance: 0,
        openingBsDate: "not-a-date",
      }),
    ).rejects.toThrow();
  });

  it("refuses a negative opening balance", async () => {
    await expect(
      createBankAccount("u1", {
        name: "NIC",
        openingBalance: -1,
        openingBsDate: "2083-04-01",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("translates P2002 into a 409 CashflowError", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      "unique violation",
      { code: "P2002", clientVersion: "test" },
    );
    mocked.cashAccount.create.mockRejectedValueOnce(p2002);
    await expect(
      createBankAccount("u1", {
        name: "NIC Main",
        openingBalance: 100,
        openingBsDate: "2083-04-01",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("creates a BANK account with trimmed name", async () => {
    mocked.cashAccount.create.mockResolvedValueOnce(
      row({ id: "bank-1", type: "BANK", name: "NIC Main" }),
    );
    const result = await createBankAccount("u1", {
      name: "  NIC Main  ",
      openingBalance: 100,
      openingBsDate: "2083-04-01",
    });
    expect(result.name).toBe("NIC Main");
    expect(mocked.cashAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "NIC Main", type: "BANK" }),
      }),
    );
  });
});

describe("renameAccount", () => {
  it("refuses to rename the system Cash account", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(row({ type: "CASH", name: "Cash" }));
    await expect(renameAccount("u1", "acc-1", "Treasury")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("refuses cross-user access with a 403", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(
      row({ userId: "other-user", type: "BANK", name: "NIC" }),
    );
    await expect(renameAccount("u1", "acc-1", "Renamed")).rejects.toMatchObject({
      status: 403,
      message: expect.stringMatching(/does not belong/),
    });
  });

  it("renames a bank account", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(
      row({ type: "BANK", name: "NIC" }),
    );
    mocked.cashAccount.update.mockResolvedValueOnce(
      row({ type: "BANK", name: "NIC Main" }),
    );
    const result = await renameAccount("u1", "acc-1", "NIC Main");
    expect(result.name).toBe("NIC Main");
  });
});

describe("archiveAccount", () => {
  it("refuses to archive the Cash account", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(row({ type: "CASH" }));
    await expect(archiveAccount("u1", "acc-1")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("refuses to archive an account with a non-zero balance", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(
      row({ type: "BANK", openingBalance: new Prisma.Decimal(500) }),
    );
    mocked.cashMovement.findMany.mockResolvedValueOnce([]);
    await expect(archiveAccount("u1", "acc-1")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("archives an account with zero balance", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(
      row({ type: "BANK", openingBalance: new Prisma.Decimal(0) }),
    );
    mocked.cashMovement.findMany.mockResolvedValueOnce([]);
    const archivedAt = new Date();
    mocked.cashAccount.update.mockResolvedValueOnce(
      row({ type: "BANK", archivedAt }),
    );
    const result = await archiveAccount("u1", "acc-1");
    expect(result.archivedAt).toEqual(archivedAt);
  });
});

describe("editOpeningBalance", () => {
  it("refuses once a BANK account has movements", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(row({ type: "BANK" }));
    mocked.cashMovement.count.mockResolvedValueOnce(1);
    await expect(editOpeningBalance("u1", "acc-1", 500)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("refuses negative values", async () => {
    await expect(editOpeningBalance("u1", "acc-1", -1)).rejects.toThrow();
    expect(mocked.cashAccount.findUnique).not.toHaveBeenCalled();
  });

  it("updates a BANK opening when no movements exist", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(row({ type: "BANK" }));
    mocked.cashMovement.count.mockResolvedValueOnce(0);
    mocked.cashAccount.update.mockResolvedValueOnce(
      row({ type: "BANK", openingBalance: new Prisma.Decimal(1234) }),
    );
    const result = await editOpeningBalance("u1", "acc-1", 1234);
    expect(result.openingBalance).toBe(1234);
  });

  // Regression: an existing farmer whose Phase 5 auto-posts created a movement
  // before they ever opened the cashflow page used to be permanently locked
  // out of setting their starting cash. The CASH anchor sits at 2000-01-01, so
  // changing the opening after movements exist is semantically fine.
  it("updates a CASH opening even when movements exist", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(row({ type: "CASH" }));
    mocked.cashAccount.update.mockResolvedValueOnce(
      row({ type: "CASH", openingBalance: new Prisma.Decimal(30000) }),
    );
    const result = await editOpeningBalance("u1", "acc-1", 30000);
    expect(result.openingBalance).toBe(30000);
    // CASH must not consult the movement count at all.
    expect(mocked.cashMovement.count).not.toHaveBeenCalled();
  });

  it("stamps openingBalanceSetAt on every save", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(row({ type: "CASH" }));
    mocked.cashAccount.update.mockResolvedValueOnce(
      row({ type: "CASH", openingBalance: new Prisma.Decimal(500) }),
    );
    await editOpeningBalance("u1", "acc-1", 500);
    const callArg = mocked.cashAccount.update.mock.calls[0][0];
    expect(callArg.data.openingBalanceSetAt).toBeInstanceOf(Date);
  });

  // The farmer's counted amount already includes everything up to today, so
  // entries dated before today must stop contributing to the Cash balance —
  // otherwise a back-dated sale double-counts. Rolling the anchor forward
  // lets the existing balance fn drop those earlier movements cleanly.
  it("rolls openingBsDate to today for CASH", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(row({ type: "CASH" }));
    mocked.cashAccount.update.mockResolvedValueOnce(
      row({ type: "CASH", openingBsDate: "2083-04-15" }),
    );
    await editOpeningBalance("u1", "acc-1", 25000);
    const callArg = mocked.cashAccount.update.mock.calls[0][0];
    expect(callArg.data.openingBsDate).toBe("2083-04-15");
  });

  // BANK opening date is user-picked at creation and tied to real transfers;
  // editing opening (before any movement) must NOT silently move the date.
  it("leaves openingBsDate untouched for BANK", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(row({ type: "BANK" }));
    mocked.cashMovement.count.mockResolvedValueOnce(0);
    mocked.cashAccount.update.mockResolvedValueOnce(
      row({ type: "BANK", openingBalance: new Prisma.Decimal(1000) }),
    );
    await editOpeningBalance("u1", "acc-1", 1000);
    const callArg = mocked.cashAccount.update.mock.calls[0][0];
    expect(callArg.data.openingBsDate).toBeUndefined();
  });
});

describe("getAccountBalances", () => {
  it("skips archived accounts by default", async () => {
    const active = row({ id: "cash-1", type: "CASH" });
    mocked.cashAccount.findMany.mockResolvedValueOnce([active]);
    mocked.cashMovement.findMany.mockResolvedValueOnce([]);

    const balances = await getAccountBalances("u1");

    expect(balances.map((b) => b.id)).toEqual(["cash-1"]);
    expect(mocked.cashAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ archivedAt: null }),
      }),
    );
  });

  it("includes archived accounts and still sums their historical movements", async () => {
    const active = row({ id: "cash-1", type: "CASH" });
    const archived = row({
      id: "bank-arch",
      type: "BANK",
      archivedAt: new Date("2026-11-20T00:00:00.000Z"),
      openingBsDate: "2083-04-01",
      openingBalance: new Prisma.Decimal(500),
    });
    mocked.cashAccount.findMany.mockResolvedValueOnce([active, archived]);
    mocked.cashMovement.findMany.mockResolvedValueOnce([
      // Historical movement on the archived account — must still count.
      {
        id: "m1",
        userId: "u1",
        accountId: "bank-arch",
        bsDate: "2083-05-10",
        direction: "IN",
        amount: new Prisma.Decimal(200),
        category: "CASH_IN",
        sourceType: "MANUAL",
        sourceId: null,
        transferId: null,
      },
    ]);

    const balances = await getAccountBalances("u1", { includeArchived: true });

    const arch = balances.find((b) => b.id === "bank-arch");
    expect(arch?.balance).toBe(700); // 500 opening + 200 historical IN
    expect(mocked.cashAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ archivedAt: null }),
      }),
    );
  });
});

describe("deleteAccount", () => {
  it("refuses to delete the Cash account", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(row({ type: "CASH" }));
    await expect(deleteAccount("u1", "acc-1")).rejects.toMatchObject({ status: 409 });
    expect(mocked.cashAccount.delete).not.toHaveBeenCalled();
  });

  it("refuses when the account has movements and points at archive as the hide path", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(row({ type: "BANK" }));
    mocked.cashMovement.count.mockResolvedValueOnce(5);
    await expect(deleteAccount("u1", "acc-1")).rejects.toMatchObject({
      status: 409,
      message: expect.stringMatching(/5 transactions.*archive/i),
    });
    expect(mocked.cashAccount.delete).not.toHaveBeenCalled();
  });

  it("hard-deletes a clean (empty) bank account", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(row({ type: "BANK" }));
    mocked.cashMovement.count.mockResolvedValueOnce(0);
    mocked.cashAccount.delete.mockResolvedValueOnce(row({ type: "BANK" }));
    await expect(deleteAccount("u1", "acc-1")).resolves.toBeUndefined();
    expect(mocked.cashAccount.delete).toHaveBeenCalledWith({
      where: { id: "acc-1" },
    });
  });

  it("refuses cross-user deletion with a 403", async () => {
    mocked.cashAccount.findUnique.mockResolvedValueOnce(
      row({ userId: "someone-else", type: "BANK" }),
    );
    await expect(deleteAccount("u1", "acc-1")).rejects.toMatchObject({
      status: 403,
      message: expect.stringMatching(/does not belong/),
    });
  });
});

describe("deleteMovement", () => {
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
    expect(mocked.cashMovement.delete).toHaveBeenCalledWith({
      where: { id: "m1" },
    });
  });

  it("deletes both legs of a TRANSFER atomically", async () => {
    mocked.cashMovement.findUnique.mockResolvedValueOnce({
      id: "m-out",
      userId: "u1",
      sourceType: "TRANSFER",
      transferId: "t-42",
    });
    const tx = {
      cashMovement: {
        findMany: jest.fn().mockResolvedValue([{ id: "m-out" }, { id: "m-in" }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    mocked.$transaction.mockImplementationOnce(
      async (fn: (t: typeof tx) => unknown) => fn(tx),
    );

    const result = await deleteMovement("u1", "m-out");
    expect(result.deletedIds.sort()).toEqual(["m-in", "m-out"]);
    expect(tx.cashMovement.deleteMany).toHaveBeenCalledWith({
      where: { transferId: "t-42", userId: "u1" },
    });
  });

  it("refuses to delete auto-posted movements (must go through the source)", async () => {
    mocked.cashMovement.findUnique.mockResolvedValueOnce({
      id: "m2",
      userId: "u1",
      sourceType: "SALE_PAYMENT",
      transferId: null,
    });
    await expect(deleteMovement("u1", "m2")).rejects.toMatchObject({
      status: 409,
      message: expect.stringMatching(/source transaction/i),
    });
  });

  it("refuses to delete auto-posted entries (OPENING_ADJUSTMENT sourceType)", async () => {
    mocked.cashMovement.findUnique.mockResolvedValueOnce({
      id: "m3",
      userId: "u1",
      sourceType: "OPENING_ADJUSTMENT",
      transferId: null,
    });
    await expect(deleteMovement("u1", "m3")).rejects.toMatchObject({ status: 409 });
  });

  it("refuses cross-user deletion", async () => {
    mocked.cashMovement.findUnique.mockResolvedValueOnce({
      id: "m4",
      userId: "someone-else",
      sourceType: "MANUAL",
      transferId: null,
    });
    await expect(deleteMovement("u1", "m4")).rejects.toMatchObject({ status: 403 });
  });

  it("returns 404 for unknown movement id", async () => {
    mocked.cashMovement.findUnique.mockResolvedValueOnce(null);
    await expect(deleteMovement("u1", "missing")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("listMovements", () => {
  it("filters by range + account + limit", async () => {
    mocked.cashMovement.findMany.mockResolvedValueOnce([]);
    await listMovements("u1", {
      fromBsDate: "2083-04-01",
      toBsDate: "2083-04-30",
      accountId: "cash-1",
      limit: 50,
    });
    expect(mocked.cashMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u1",
          accountId: "cash-1",
          bsDate: { gte: "2083-04-01", lte: "2083-04-30" },
        }),
        take: 50,
        orderBy: [{ bsDate: "desc" }, { createdAt: "desc" }],
      }),
    );
  });

  it("rejects malformed BS date query params", async () => {
    await expect(
      listMovements("u1", { fromBsDate: "nope" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

function fakeTx(
  cashAccount: Record<string, jest.Mock>,
  cashMovement: Record<string, jest.Mock>,
) {
  return { cashAccount, cashMovement };
}

describe("postManualMovement", () => {
  const baseInput = {
    accountId: "cash-1",
    category: "CASH_IN" as const,
    amount: 500,
    bsDate: "2083-04-10",
    partyName: "Ram",
  };

  it("refuses future BS dates (mocked today = 2083-04-15)", async () => {
    await expect(
      postManualMovement("u1", "u1", { ...baseInput, bsDate: "2083-04-20" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("refuses an auto-post category (SALE_RECEIPT) on the manual endpoint", async () => {
    await expect(
      postManualMovement("u1", "u1", {
        ...baseInput,
        category: "SALE_RECEIPT" as any,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("refuses an empty partyName", async () => {
    await expect(
      postManualMovement("u1", "u1", { ...baseInput, partyName: "   " }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("refuses a non-positive amount", async () => {
    await expect(
      postManualMovement("u1", "u1", { ...baseInput, amount: 0 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("creates a MANUAL row, derives direction from category", async () => {
    const tx = fakeTx(
      {
        findUnique: jest
          .fn()
          .mockResolvedValue(row({ id: "cash-1", type: "CASH", openingBsDate: "2083-04-01" })),
      },
      {
        create: jest.fn().mockResolvedValue({
          id: "m-1",
          userId: "u1",
          accountId: "cash-1",
          bsDate: "2083-04-10",
          direction: "IN",
          amount: new Prisma.Decimal(500),
          category: "OWNER_INVEST",
          sourceType: "MANUAL",
          sourceId: null,
          transferId: null,
        }),
      },
    );
    mocked.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await postManualMovement("u1", "u1", {
      ...baseInput,
      category: "OWNER_INVEST",
    });

    expect(result.direction).toBe("IN");
    expect(tx.cashMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "IN",
          category: "OWNER_INVEST",
          sourceType: "MANUAL",
          partyName: "Ram",
        }),
      }),
    );
  });

  it("refuses when the account belongs to another user (403)", async () => {
    const tx = fakeTx(
      {
        findUnique: jest
          .fn()
          .mockResolvedValue(row({ id: "cash-1", userId: "other-user", type: "CASH" })),
      },
      { create: jest.fn() },
    );
    mocked.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
    await expect(
      postManualMovement("u1", "u1", baseInput),
    ).rejects.toMatchObject({ status: 403 });
    expect(tx.cashMovement.create).not.toHaveBeenCalled();
  });

  it("refuses dates before the account's openingBsDate", async () => {
    const tx = fakeTx(
      {
        findUnique: jest
          .fn()
          .mockResolvedValue(row({ id: "cash-1", type: "CASH", openingBsDate: "2083-04-15" })),
      },
      { create: jest.fn() },
    );
    mocked.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
    await expect(
      postManualMovement("u1", "u1", { ...baseInput, bsDate: "2083-04-01" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("postTransfer", () => {
  const baseInput = {
    fromAccountId: "cash-1",
    toAccountId: "bank-1",
    amount: 300,
    bsDate: "2083-04-10",
  };

  it("refuses same-account transfer", async () => {
    await expect(
      postTransfer("u1", "u1", { ...baseInput, toAccountId: "cash-1" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("refuses future date", async () => {
    await expect(
      postTransfer("u1", "u1", { ...baseInput, bsDate: "2083-04-20" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("creates both legs with a shared transferId", async () => {
    const tx = fakeTx(
      {
        findUnique: jest
          .fn()
          .mockImplementation(({ where }) =>
            Promise.resolve(
              row({
                id: where.id,
                type: where.id === "cash-1" ? "CASH" : "BANK",
                name: where.id === "cash-1" ? "Cash" : "NIC",
                openingBsDate: "2083-04-01",
              }),
            ),
          ),
      },
      {
        create: jest
          .fn()
          .mockResolvedValueOnce({
            id: "m-out",
            userId: "u1",
            accountId: "cash-1",
            bsDate: "2083-04-10",
            direction: "OUT",
            amount: new Prisma.Decimal(300),
            category: "TRANSFER",
            sourceType: "TRANSFER",
            sourceId: "t-42",
            transferId: "t-42",
          })
          .mockResolvedValueOnce({
            id: "m-in",
            userId: "u1",
            accountId: "bank-1",
            bsDate: "2083-04-10",
            direction: "IN",
            amount: new Prisma.Decimal(300),
            category: "TRANSFER",
            sourceType: "TRANSFER",
            sourceId: "t-42",
            transferId: "t-42",
          }),
      },
    );
    mocked.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await postTransfer("u1", "u1", baseInput);

    expect(tx.cashMovement.create).toHaveBeenCalledTimes(2);
    expect(result.legs[0].transferId).toBe(result.legs[1].transferId);
    expect(result.legs.map((l) => l.direction).sort()).toEqual(["IN", "OUT"]);
  });
});

describe("getReport", () => {
  it("returns zeroed totals and empty balances when the user has no accounts", async () => {
    mocked.cashAccount.findMany.mockResolvedValueOnce([]);
    const r = await getReport("u1", {
      fromBsDate: "2083-04-01",
      toBsDate: "2083-04-30",
    });
    expect(r.balances).toEqual([]);
    expect(r.totals.openingBalance).toBe(0);
    expect(r.totals.closingBalance).toBe(0);
  });

  it("refuses toBsDate < fromBsDate", async () => {
    await expect(
      getReport("u1", { fromBsDate: "2083-04-30", toBsDate: "2083-04-01" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("does not call prevBsDate when fromBsDate is at the system anchor (2000-01-01)", async () => {
    // Guard: if we regress and call prevBsDate("2000-01-01"), the mock below
    // throws and the test fails.
    const { prevBsDate } = jest.requireMock("../../src/utils/nepalBsDate") as {
      prevBsDate: jest.Mock;
    };
    prevBsDate.mockImplementationOnce(() => {
      throw new Error("Date lib: cannot go before BS 2000");
    });

    mocked.cashAccount.findMany.mockResolvedValueOnce([
      row({
        id: "cash-1",
        type: "CASH",
        openingBalance: new Prisma.Decimal(0),
        openingBsDate: "2000-01-01",
      }),
    ]);
    mocked.cashMovement.findMany.mockResolvedValueOnce([
      {
        id: "m-a",
        userId: "u1",
        accountId: "cash-1",
        bsDate: "2083-04-10",
        direction: "IN",
        amount: new Prisma.Decimal(200),
        category: "SALE_RECEIPT",
        sourceType: "SALE_PAYMENT",
        sourceId: "sp-1",
        transferId: null,
        partyName: "Ram",
        notes: null,
        createdAt: new Date(0),
      },
    ]);

    const r = await getReport("u1", {
      fromBsDate: "2000-01-01",
      toBsDate: "2083-04-30",
    });

    expect(r.totals.openingBalance).toBe(0);
    expect(r.totals.inflow).toBe(200);
    expect(r.totals.closingBalance).toBe(200);
    expect(prevBsDate).not.toHaveBeenCalled();
  });

  it("totals opening + closing balances from movements", async () => {
    mocked.cashAccount.findMany.mockResolvedValueOnce([
      row({ id: "cash-1", type: "CASH", openingBalance: new Prisma.Decimal(100), openingBsDate: "2083-03-01" }),
    ]);
    mocked.cashMovement.findMany.mockResolvedValueOnce([
      {
        id: "m-a",
        userId: "u1",
        accountId: "cash-1",
        bsDate: "2083-03-15",
        direction: "IN",
        amount: new Prisma.Decimal(50),
        category: "CASH_IN",
        sourceType: "MANUAL",
        sourceId: null,
        transferId: null,
      },
      {
        id: "m-b",
        userId: "u1",
        accountId: "cash-1",
        bsDate: "2083-04-10",
        direction: "IN",
        amount: new Prisma.Decimal(200),
        category: "SALE_RECEIPT",
        sourceType: "SALE_PAYMENT",
        sourceId: "sp-1",
        transferId: null,
      },
    ]);

    const r = await getReport("u1", {
      fromBsDate: "2083-04-01",
      toBsDate: "2083-04-30",
    });

    // Opening at start of range: 100 opening + 50 from 03-15 = 150.
    expect(r.totals.openingBalance).toBe(150);
    // Inflow in range: 200 (SALE_RECEIPT), outflow 0, net +200, closing 350.
    expect(r.totals.inflow).toBe(200);
    expect(r.totals.outflow).toBe(0);
    expect(r.totals.closingBalance).toBe(350);
    expect(r.byCategory.inflow.SALE_RECEIPT).toBe(200);
    expect(r.balances).toHaveLength(1);
    expect(r.balances[0].balance).toBe(350);
  });

  it("includes an account opening amount when the account starts in the selected period", async () => {
    mocked.cashAccount.findMany.mockResolvedValueOnce([
      row({
        id: "cash-1",
        type: "CASH",
        openingBalance: new Prisma.Decimal(0),
        openingBsDate: "2000-01-01",
      }),
      row({
        id: "bank-1",
        type: "BANK",
        name: "Bank",
        openingBalance: new Prisma.Decimal(50000),
        openingBsDate: "2083-04-10",
      }),
    ]);
    mocked.cashMovement.findMany.mockResolvedValueOnce([
      {
        id: "sale-1",
        userId: "u1",
        accountId: "cash-1",
        bsDate: "2083-04-15",
        direction: "IN",
        amount: new Prisma.Decimal(18000),
        category: "SALE_RECEIPT",
        sourceType: "SALE_PAYMENT",
        sourceId: "sp-1",
        transferId: null,
        partyName: "Ram",
        notes: null,
        createdAt: new Date(0),
      },
    ]);

    const r = await getReport("u1", {
      fromBsDate: "2083-04-01",
      toBsDate: "2083-04-30",
    });

    // Opening folds in accounts declared inside the period (the bank's
    // 50,000 opened on 04-10 is treated as money already present at the
    // start of the period from the farmer's POV). Closing = opening + net.
    expect(r.totals.openingBalance).toBe(50000);
    expect(r.totals.inflow).toBe(18000);
    expect(r.totals.closingBalance).toBe(68000);
  });
});

describe("CashflowError", () => {
  it("carries status and name", () => {
    const e = new CashflowError("x", 409);
    expect(e.status).toBe(409);
    expect(e.name).toBe("CashflowError");
  });
});
