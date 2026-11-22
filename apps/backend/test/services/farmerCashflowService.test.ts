/**
 * Guard-path tests for farmerCashflowService. Prisma is mocked — this is a
 * behaviour spec for the service's validation / ownership / idempotency rules.
 * End-to-end DB behaviour is covered by the pure-domain tests and the
 * forthcoming service integration suite (PR 2+).
 */

jest.mock("../../src/utils/prisma", () => {
  const m = {
    farmerCashAccount: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    farmerCashMovement: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return { __esModule: true, default: m };
});

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
  renameAccount,
} from "../../src/services/farmerCashflowService";

const mocked = prisma as unknown as {
  farmerCashAccount: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  farmerCashMovement: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    count: jest.Mock;
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
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ensureCashAccount", () => {
  it("returns the existing CASH account without creating a second one", async () => {
    mocked.farmerCashAccount.findFirst.mockResolvedValueOnce(row());
    const result = await ensureCashAccount("u1");
    expect(result.id).toBe("acc-1");
    expect(mocked.farmerCashAccount.create).not.toHaveBeenCalled();
  });

  it("creates when none exists", async () => {
    mocked.farmerCashAccount.findFirst.mockResolvedValueOnce(null);
    mocked.farmerCashAccount.create.mockResolvedValueOnce(row({ id: "new-1" }));
    const result = await ensureCashAccount("u1");
    expect(result.id).toBe("new-1");
    expect(mocked.farmerCashAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", type: "CASH", name: "Cash" }),
      }),
    );
  });

  it("recovers from P2002 by re-fetching the winning row", async () => {
    mocked.farmerCashAccount.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(row({ id: "winner-1" }));
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      "unique violation",
      { code: "P2002", clientVersion: "test" },
    );
    mocked.farmerCashAccount.create.mockRejectedValueOnce(p2002);

    const result = await ensureCashAccount("u1");
    expect(result.id).toBe("winner-1");
    expect(mocked.farmerCashAccount.findFirst).toHaveBeenCalledTimes(2);
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
    mocked.farmerCashAccount.create.mockRejectedValueOnce(p2002);
    await expect(
      createBankAccount("u1", {
        name: "NIC Main",
        openingBalance: 100,
        openingBsDate: "2083-04-01",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("creates a BANK account with trimmed name", async () => {
    mocked.farmerCashAccount.create.mockResolvedValueOnce(
      row({ id: "bank-1", type: "BANK", name: "NIC Main" }),
    );
    const result = await createBankAccount("u1", {
      name: "  NIC Main  ",
      openingBalance: 100,
      openingBsDate: "2083-04-01",
    });
    expect(result.name).toBe("NIC Main");
    expect(mocked.farmerCashAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "NIC Main", type: "BANK" }),
      }),
    );
  });
});

describe("renameAccount", () => {
  it("refuses to rename the system Cash account", async () => {
    mocked.farmerCashAccount.findUnique.mockResolvedValueOnce(row({ type: "CASH", name: "Cash" }));
    await expect(renameAccount("u1", "acc-1", "Treasury")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("refuses cross-user access with a 403", async () => {
    mocked.farmerCashAccount.findUnique.mockResolvedValueOnce(
      row({ userId: "other-user", type: "BANK", name: "NIC" }),
    );
    await expect(renameAccount("u1", "acc-1", "Renamed")).rejects.toMatchObject({
      status: 403,
      message: expect.stringMatching(/does not belong/),
    });
  });

  it("renames a bank account", async () => {
    mocked.farmerCashAccount.findUnique.mockResolvedValueOnce(
      row({ type: "BANK", name: "NIC" }),
    );
    mocked.farmerCashAccount.update.mockResolvedValueOnce(
      row({ type: "BANK", name: "NIC Main" }),
    );
    const result = await renameAccount("u1", "acc-1", "NIC Main");
    expect(result.name).toBe("NIC Main");
  });
});

describe("archiveAccount", () => {
  it("refuses to archive the Cash account", async () => {
    mocked.farmerCashAccount.findUnique.mockResolvedValueOnce(row({ type: "CASH" }));
    await expect(archiveAccount("u1", "acc-1")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("refuses to archive an account with a non-zero balance", async () => {
    mocked.farmerCashAccount.findUnique.mockResolvedValueOnce(
      row({ type: "BANK", openingBalance: new Prisma.Decimal(500) }),
    );
    mocked.farmerCashMovement.findMany.mockResolvedValueOnce([]);
    await expect(archiveAccount("u1", "acc-1")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("archives an account with zero balance", async () => {
    mocked.farmerCashAccount.findUnique.mockResolvedValueOnce(
      row({ type: "BANK", openingBalance: new Prisma.Decimal(0) }),
    );
    mocked.farmerCashMovement.findMany.mockResolvedValueOnce([]);
    const archivedAt = new Date();
    mocked.farmerCashAccount.update.mockResolvedValueOnce(
      row({ type: "BANK", archivedAt }),
    );
    const result = await archiveAccount("u1", "acc-1");
    expect(result.archivedAt).toEqual(archivedAt);
  });
});

describe("editOpeningBalance", () => {
  it("refuses once the account has movements", async () => {
    mocked.farmerCashAccount.findUnique.mockResolvedValueOnce(row({ type: "BANK" }));
    mocked.farmerCashMovement.count.mockResolvedValueOnce(1);
    await expect(editOpeningBalance("u1", "acc-1", 500)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("refuses negative values", async () => {
    await expect(editOpeningBalance("u1", "acc-1", -1)).rejects.toThrow();
    expect(mocked.farmerCashAccount.findUnique).not.toHaveBeenCalled();
  });

  it("updates the opening when no movements exist", async () => {
    mocked.farmerCashAccount.findUnique.mockResolvedValueOnce(row({ type: "BANK" }));
    mocked.farmerCashMovement.count.mockResolvedValueOnce(0);
    mocked.farmerCashAccount.update.mockResolvedValueOnce(
      row({ type: "BANK", openingBalance: new Prisma.Decimal(1234) }),
    );
    const result = await editOpeningBalance("u1", "acc-1", 1234);
    expect(result.openingBalance).toBe(1234);
  });
});

describe("getAccountBalances", () => {
  it("skips archived accounts by default", async () => {
    const active = row({ id: "cash-1", type: "CASH" });
    mocked.farmerCashAccount.findMany.mockResolvedValueOnce([active]);
    mocked.farmerCashMovement.findMany.mockResolvedValueOnce([]);

    const balances = await getAccountBalances("u1");

    expect(balances.map((b) => b.id)).toEqual(["cash-1"]);
    expect(mocked.farmerCashAccount.findMany).toHaveBeenCalledWith(
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
    mocked.farmerCashAccount.findMany.mockResolvedValueOnce([active, archived]);
    mocked.farmerCashMovement.findMany.mockResolvedValueOnce([
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
    expect(mocked.farmerCashAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ archivedAt: null }),
      }),
    );
  });
});

describe("deleteAccount", () => {
  it("refuses to delete the Cash account", async () => {
    mocked.farmerCashAccount.findUnique.mockResolvedValueOnce(row({ type: "CASH" }));
    await expect(deleteAccount("u1", "acc-1")).rejects.toMatchObject({ status: 409 });
    expect(mocked.farmerCashAccount.delete).not.toHaveBeenCalled();
  });

  it("refuses when the account has movements and points at archive as the hide path", async () => {
    mocked.farmerCashAccount.findUnique.mockResolvedValueOnce(row({ type: "BANK" }));
    mocked.farmerCashMovement.count.mockResolvedValueOnce(5);
    await expect(deleteAccount("u1", "acc-1")).rejects.toMatchObject({
      status: 409,
      message: expect.stringMatching(/5 transactions.*archive/i),
    });
    expect(mocked.farmerCashAccount.delete).not.toHaveBeenCalled();
  });

  it("hard-deletes a clean (empty) bank account", async () => {
    mocked.farmerCashAccount.findUnique.mockResolvedValueOnce(row({ type: "BANK" }));
    mocked.farmerCashMovement.count.mockResolvedValueOnce(0);
    mocked.farmerCashAccount.delete.mockResolvedValueOnce(row({ type: "BANK" }));
    await expect(deleteAccount("u1", "acc-1")).resolves.toBeUndefined();
    expect(mocked.farmerCashAccount.delete).toHaveBeenCalledWith({
      where: { id: "acc-1" },
    });
  });

  it("refuses cross-user deletion with a 403", async () => {
    mocked.farmerCashAccount.findUnique.mockResolvedValueOnce(
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
    mocked.farmerCashMovement.findUnique.mockResolvedValueOnce({
      id: "m1",
      userId: "u1",
      sourceType: "MANUAL",
      transferId: null,
    });
    mocked.farmerCashMovement.delete.mockResolvedValueOnce({ id: "m1" });

    const result = await deleteMovement("u1", "m1");
    expect(result.deletedIds).toEqual(["m1"]);
    expect(mocked.farmerCashMovement.delete).toHaveBeenCalledWith({
      where: { id: "m1" },
    });
  });

  it("deletes both legs of a TRANSFER atomically", async () => {
    mocked.farmerCashMovement.findUnique.mockResolvedValueOnce({
      id: "m-out",
      userId: "u1",
      sourceType: "TRANSFER",
      transferId: "t-42",
    });
    const tx = {
      farmerCashMovement: {
        findMany: jest.fn().mockResolvedValue([{ id: "m-out" }, { id: "m-in" }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    mocked.$transaction.mockImplementationOnce(
      async (fn: (t: typeof tx) => unknown) => fn(tx),
    );

    const result = await deleteMovement("u1", "m-out");
    expect(result.deletedIds.sort()).toEqual(["m-in", "m-out"]);
    expect(tx.farmerCashMovement.deleteMany).toHaveBeenCalledWith({
      where: { transferId: "t-42", userId: "u1" },
    });
  });

  it("refuses to delete auto-posted movements (must go through the source)", async () => {
    mocked.farmerCashMovement.findUnique.mockResolvedValueOnce({
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

  it("refuses to delete OPENING_ADJUSTMENT (would break reconciliation audit trail)", async () => {
    mocked.farmerCashMovement.findUnique.mockResolvedValueOnce({
      id: "m3",
      userId: "u1",
      sourceType: "OPENING_ADJUSTMENT",
      transferId: null,
    });
    await expect(deleteMovement("u1", "m3")).rejects.toMatchObject({ status: 409 });
  });

  it("refuses cross-user deletion", async () => {
    mocked.farmerCashMovement.findUnique.mockResolvedValueOnce({
      id: "m4",
      userId: "someone-else",
      sourceType: "MANUAL",
      transferId: null,
    });
    await expect(deleteMovement("u1", "m4")).rejects.toMatchObject({ status: 403 });
  });

  it("returns 404 for unknown movement id", async () => {
    mocked.farmerCashMovement.findUnique.mockResolvedValueOnce(null);
    await expect(deleteMovement("u1", "missing")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("CashflowError", () => {
  it("carries status and name", () => {
    const e = new CashflowError("x", 409);
    expect(e.status).toBe(409);
    expect(e.name).toBe("CashflowError");
  });
});
