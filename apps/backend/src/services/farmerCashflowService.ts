/**
 * Farmer cashflow (cash book) service — Approach A, v1.
 *
 * Owns writes into FarmerCashAccount + FarmerCashMovement. Pure math is
 * delegated to `common/cashflow/*` so dealer v2 can reuse the exact same
 * balance / report / transfer logic.
 */

import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import { computeAccountBalance } from "../common/cashflow/balance";
import { CashflowError } from "../common/cashflow/errors";
import {
  assertAccountActive,
  assertAccountOwner,
  assertPositiveAmount,
  assertValidBsDate,
} from "../common/cashflow/guards";
import type { CashAccount } from "../common/cashflow/types";
import { getNepalBsTodayString } from "../utils/nepalBsDate";

export { CashflowError };

type DbClient = Prisma.TransactionClient | typeof prisma;

function toCashAccount(row: {
  id: string;
  userId: string;
  type: "CASH" | "BANK";
  name: string;
  openingBalance: Prisma.Decimal;
  openingBsDate: string;
  archivedAt: Date | null;
}): CashAccount {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    name: row.name,
    openingBalance: Number(row.openingBalance),
    openingBsDate: row.openingBsDate,
    archivedAt: row.archivedAt,
  };
}

const NAME_MAX = 60;

function normalizeName(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new CashflowError("Account name is required");
  }
  if (trimmed.length > NAME_MAX) {
    throw new CashflowError(`Account name must be ${NAME_MAX} characters or fewer`);
  }
  return trimmed;
}

/** Idempotent. Returns the single CASH account for the user, creating it if missing. */
export async function ensureCashAccount(
  userId: string,
  db: DbClient = prisma,
): Promise<CashAccount> {
  const existing = await db.farmerCashAccount.findFirst({
    where: { userId, type: "CASH", archivedAt: null },
  });
  if (existing) return toCashAccount(existing);

  try {
    const created = await db.farmerCashAccount.create({
      data: {
        userId,
        type: "CASH",
        name: "Cash",
        openingBalance: new Prisma.Decimal(0),
        openingBsDate: getNepalBsTodayString(),
      },
    });
    return toCashAccount(created);
  } catch (err) {
    // Partial unique on (userId WHERE type='CASH' AND archivedAt IS NULL) — another
    // concurrent call won; re-fetch and return theirs.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const row = await db.farmerCashAccount.findFirst({
        where: { userId, type: "CASH", archivedAt: null },
      });
      if (row) return toCashAccount(row);
    }
    throw err;
  }
}

export async function listAccounts(
  userId: string,
  options: { includeArchived?: boolean } = {},
): Promise<CashAccount[]> {
  const rows = await prisma.farmerCashAccount.findMany({
    where: {
      userId,
      ...(options.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toCashAccount);
}

export async function createBankAccount(
  userId: string,
  input: { name: string; openingBalance: number; openingBsDate: string },
): Promise<CashAccount> {
  const name = normalizeName(input.name);
  if (name.toLowerCase() === "cash") {
    throw new CashflowError(
      `"Cash" is reserved for the system cash account`,
      409,
    );
  }
  if (!Number.isFinite(input.openingBalance) || input.openingBalance < 0) {
    throw new CashflowError("openingBalance must be a non-negative number");
  }
  assertValidBsDate(input.openingBsDate, "openingBsDate");

  try {
    const created = await prisma.farmerCashAccount.create({
      data: {
        userId,
        type: "BANK",
        name,
        openingBalance: new Prisma.Decimal(input.openingBalance),
        openingBsDate: input.openingBsDate,
      },
    });
    return toCashAccount(created);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new CashflowError(
        `An account named "${name}" already exists`,
        409,
      );
    }
    throw err;
  }
}

async function findOwnAccount(
  userId: string,
  accountId: string,
): Promise<CashAccount> {
  const row = await prisma.farmerCashAccount.findUnique({
    where: { id: accountId },
  });
  if (!row) throw new CashflowError("Account not found", 404);
  assertAccountOwner(row, userId);
  return toCashAccount(row);
}

export async function renameAccount(
  userId: string,
  accountId: string,
  nextName: string,
): Promise<CashAccount> {
  const account = await findOwnAccount(userId, accountId);
  const name = normalizeName(nextName);
  if (account.type === "CASH" && name !== account.name) {
    throw new CashflowError("The system Cash account cannot be renamed", 409);
  }
  if (name === account.name) return account;

  try {
    const updated = await prisma.farmerCashAccount.update({
      where: { id: accountId },
      data: { name },
    });
    return toCashAccount(updated);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new CashflowError(
        `An account named "${name}" already exists`,
        409,
      );
    }
    throw err;
  }
}

export async function archiveAccount(
  userId: string,
  accountId: string,
): Promise<CashAccount> {
  const account = await findOwnAccount(userId, accountId);
  if (account.type === "CASH") {
    throw new CashflowError("The system Cash account cannot be archived", 409);
  }
  if (account.archivedAt !== null) return account;

  const movements = await prisma.farmerCashMovement.findMany({
    where: { accountId },
    select: {
      id: true,
      userId: true,
      accountId: true,
      bsDate: true,
      direction: true,
      amount: true,
      category: true,
      sourceType: true,
      sourceId: true,
      transferId: true,
    },
  });
  const balance = computeAccountBalance(
    account,
    movements.map((m) => ({ ...m, amount: Number(m.amount) })),
  );
  if (balance !== 0) {
    throw new CashflowError(
      `Account balance is ${balance.toFixed(2)}; transfer the funds out before archiving`,
      409,
    );
  }

  const updated = await prisma.farmerCashAccount.update({
    where: { id: accountId },
    data: { archivedAt: new Date() },
  });
  return toCashAccount(updated);
}

export async function unarchiveAccount(
  userId: string,
  accountId: string,
): Promise<CashAccount> {
  const account = await findOwnAccount(userId, accountId);
  if (account.archivedAt === null) return account;
  if (account.type === "CASH") {
    // Shouldn't be reachable (we don't allow CASH to be archived) but belt-and-braces.
    throw new CashflowError("The system Cash account is always active", 409);
  }
  try {
    const updated = await prisma.farmerCashAccount.update({
      where: { id: accountId },
      data: { archivedAt: null },
    });
    return toCashAccount(updated);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new CashflowError(
        "An active account with this name already exists; rename first",
        409,
      );
    }
    throw err;
  }
}

/**
 * Hard-delete a bank account. Only possible when the account has no movements
 * — otherwise the audit trail would break. The error message points the user
 * at the two safe paths: delete the transactions first, or archive to hide.
 */
export async function deleteAccount(
  userId: string,
  accountId: string,
): Promise<void> {
  const account = await findOwnAccount(userId, accountId);
  if (account.type === "CASH") {
    throw new CashflowError("The system Cash account cannot be deleted", 409);
  }
  const count = await prisma.farmerCashMovement.count({ where: { accountId } });
  if (count > 0) {
    throw new CashflowError(
      `This account has ${count} transaction${count === 1 ? "" : "s"}. Delete the transactions first, or archive the account to hide it.`,
      409,
    );
  }
  await prisma.farmerCashAccount.delete({ where: { id: accountId } });
}

/**
 * Delete a movement. Manual entries delete straight. Transfer legs are deleted
 * as a pair in one transaction (shared `transferId`). Auto-posted entries
 * (SALE_PAYMENT, CUSTOMER_RECEIPT, EXPENSE, OPENING_ADJUSTMENT) must be removed
 * by deleting the source event instead — removing the mirror row would silently
 * desync the cashbook from the business ledger.
 */
export async function deleteMovement(
  userId: string,
  movementId: string,
): Promise<{ deletedIds: string[] }> {
  const movement = await prisma.farmerCashMovement.findUnique({
    where: { id: movementId },
    select: { id: true, userId: true, sourceType: true, transferId: true },
  });
  if (!movement) throw new CashflowError("Movement not found", 404);
  if (movement.userId !== userId) {
    throw new CashflowError("Movement does not belong to this user", 403);
  }

  if (movement.sourceType === "MANUAL") {
    await prisma.farmerCashMovement.delete({ where: { id: movementId } });
    return { deletedIds: [movementId] };
  }

  if (movement.sourceType === "TRANSFER") {
    if (!movement.transferId) {
      throw new CashflowError(
        "Transfer leg is missing its transferId — cannot delete safely",
        500,
      );
    }
    const transferId = movement.transferId;
    return prisma.$transaction(async (tx) => {
      const legs = await tx.farmerCashMovement.findMany({
        where: { transferId, userId },
        select: { id: true },
      });
      await tx.farmerCashMovement.deleteMany({
        where: { transferId, userId },
      });
      return { deletedIds: legs.map((l) => l.id) };
    });
  }

  throw new CashflowError(
    "Auto-posted entries can only be removed by deleting the source transaction (sale, receipt, expense, or reconciliation).",
    409,
  );
}

export async function editOpeningBalance(
  userId: string,
  accountId: string,
  nextOpening: number,
): Promise<CashAccount> {
  if (!Number.isFinite(nextOpening) || nextOpening < 0) {
    throw new CashflowError("openingBalance must be a non-negative number");
  }
  const account = await findOwnAccount(userId, accountId);
  assertAccountActive(account);

  const movementCount = await prisma.farmerCashMovement.count({
    where: { accountId },
  });
  if (movementCount > 0) {
    throw new CashflowError(
      "Account already has movements. Record an opening adjustment instead of editing the opening balance.",
      409,
    );
  }

  const updated = await prisma.farmerCashAccount.update({
    where: { id: accountId },
    data: { openingBalance: new Prisma.Decimal(nextOpening) },
  });
  return toCashAccount(updated);
}

/**
 * Returns balances for a user's accounts. `includeArchived` defaults to false
 * for the account-picker use case; the settings page and date-ranged reports
 * pass `true` so archived accounts show their real (non-zero) historical balance
 * for the requested `asOfBsDate`.
 */
export async function getAccountBalances(
  userId: string,
  options: { asOfBsDate?: string; includeArchived?: boolean } = {},
): Promise<Array<CashAccount & { balance: number }>> {
  const accounts = await listAccounts(userId, {
    includeArchived: options.includeArchived ?? false,
  });
  if (accounts.length === 0) return [];

  const ids = accounts.map((a) => a.id);
  const movementsRaw = await prisma.farmerCashMovement.findMany({
    where: { userId, accountId: { in: ids } },
    select: {
      id: true,
      userId: true,
      accountId: true,
      bsDate: true,
      direction: true,
      amount: true,
      category: true,
      sourceType: true,
      sourceId: true,
      transferId: true,
    },
  });
  const movements = movementsRaw.map((m) => ({ ...m, amount: Number(m.amount) }));

  return accounts.map((a) => ({
    ...a,
    balance: computeAccountBalance(a, movements, options.asOfBsDate),
  }));
}

/**
 * Service-level amount validator for incoming write paths. Keeps the common
 * module free of runtime-type errors while still allowing callers to use the
 * same pattern on manual movements + transfers.
 */
export function validatePositiveAmount(value: unknown, label = "amount"): number {
  assertPositiveAmount(value, label);
  return value;
}
