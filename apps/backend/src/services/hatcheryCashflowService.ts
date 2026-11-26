/**
 * Hatchery cashflow (cash book) service — Approach A, v2.
 *
 * Writes into the same CashAccount + CashMovement tables as the farmer and
 * dealer services — those tables are keyed by the owner's `userId` and the
 * User's `role` is the discriminator (a User is exactly one role). Every
 * public entry point in this file asserts `user.role === HATCHERY` as
 * belt-and-braces beyond the [HATCHERY] route middleware.
 *
 * Pure math (balance, report, transfer leg building) is delegated to
 * `common/cashflow/*`, same modules the farmer and dealer services use.
 */

import { CashCategory, CashMovementDirection, CashSourceType, Prisma, UserRole } from "@prisma/client";
import prisma from "../utils/prisma";
import { computeAccountBalance, countsInBalance } from "../common/cashflow/balance";
import { CashflowError } from "../common/cashflow/errors";
import {
  assertAccountActive,
  assertAccountOwner,
  assertPositiveAmount,
  assertValidBsDate,
} from "../common/cashflow/guards";
import { rollupCashflowStatement } from "../common/cashflow/report";
import { buildTransferLegs } from "../common/cashflow/transfer";
import type { CashAccount, CashMovement } from "../common/cashflow/types";
import { resolveRecordedById } from "../common/cashflow/recorder";
import { getNepalBsTodayString } from "../utils/nepalBsDate";

export { CashflowError };

type DbClient = Prisma.TransactionClient | typeof prisma;

const MOVEMENT_SELECT = {
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
  partyName: true,
  notes: true,
  createdAt: true,
} as const satisfies Prisma.CashMovementSelect;

type MovementRow = Prisma.CashMovementGetPayload<{ select: typeof MOVEMENT_SELECT }>;

function toCashMovement(row: MovementRow): CashMovement {
  return { ...row, amount: Number(row.amount) };
}

function toCashAccount(row: {
  id: string;
  userId: string;
  type: "CASH" | "BANK";
  name: string;
  openingBalance: Prisma.Decimal;
  openingBsDate: string;
  archivedAt: Date | null;
  openingBalanceSetAt: Date | null;
}): CashAccount {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    name: row.name,
    openingBalance: Number(row.openingBalance),
    openingBsDate: row.openingBsDate,
    archivedAt: row.archivedAt,
    openingBalanceSetAt: row.openingBalanceSetAt,
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

const CASH_SYSTEM_OPENING_BS_DATE = "2000-01-01";

/**
 * Guard: route middleware already restricts callers to `[HATCHERY]` role, but
 * the service is the only thing writing into the shared CashAccount table, so
 * a second role check at every public entry point protects against a future
 * caller forgetting the route gate.
 */
async function assertHatcheryOwner(userId: string, db: DbClient = prisma): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || user.role !== UserRole.HATCHERY) {
    throw new CashflowError("Hatchery account required", 403);
  }
}

/** Idempotent. Returns the single CASH account for the hatchery, creating it if missing. */
export async function ensureCashAccount(
  userId: string,
  db: DbClient = prisma,
): Promise<CashAccount> {
  await assertHatcheryOwner(userId, db);
  const existing = await db.cashAccount.findFirst({
    where: { userId, type: "CASH", archivedAt: null },
  });
  if (existing) return toCashAccount(existing);

  try {
    const created = await db.cashAccount.create({
      data: {
        userId,
        type: "CASH",
        name: "Cash",
        openingBalance: new Prisma.Decimal(0),
        openingBsDate: CASH_SYSTEM_OPENING_BS_DATE,
      },
    });
    return toCashAccount(created);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const row = await db.cashAccount.findFirst({
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
  await assertHatcheryOwner(userId);
  const rows = await prisma.cashAccount.findMany({
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
  await assertHatcheryOwner(userId);
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
    const created = await prisma.cashAccount.create({
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
  const row = await prisma.cashAccount.findUnique({
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
  await assertHatcheryOwner(userId);
  const account = await findOwnAccount(userId, accountId);
  const name = normalizeName(nextName);
  if (account.type === "CASH" && name !== account.name) {
    throw new CashflowError("The system Cash account cannot be renamed", 409);
  }
  if (name === account.name) return account;

  try {
    const updated = await prisma.cashAccount.update({
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
  await assertHatcheryOwner(userId);
  const account = await findOwnAccount(userId, accountId);
  if (account.type === "CASH") {
    throw new CashflowError("The system Cash account cannot be archived", 409);
  }
  if (account.archivedAt !== null) return account;

  const movements = await prisma.cashMovement.findMany({
    where: { accountId },
    select: MOVEMENT_SELECT,
  });
  const balance = computeAccountBalance(account, movements.map(toCashMovement));
  if (balance !== 0) {
    throw new CashflowError(
      `Account balance is ${balance.toFixed(2)}; transfer the funds out before archiving`,
      409,
    );
  }

  const updated = await prisma.cashAccount.update({
    where: { id: accountId },
    data: { archivedAt: new Date() },
  });
  return toCashAccount(updated);
}

export async function unarchiveAccount(
  userId: string,
  accountId: string,
): Promise<CashAccount> {
  await assertHatcheryOwner(userId);
  const account = await findOwnAccount(userId, accountId);
  if (account.archivedAt === null) return account;
  if (account.type === "CASH") {
    throw new CashflowError("The system Cash account is always active", 409);
  }
  try {
    const updated = await prisma.cashAccount.update({
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

export async function deleteAccount(
  userId: string,
  accountId: string,
): Promise<void> {
  await assertHatcheryOwner(userId);
  const account = await findOwnAccount(userId, accountId);
  if (account.type === "CASH") {
    throw new CashflowError("The system Cash account cannot be deleted", 409);
  }
  const count = await prisma.cashMovement.count({ where: { accountId } });
  if (count > 0) {
    throw new CashflowError(
      `This account has ${count} transaction${count === 1 ? "" : "s"}. Delete the transactions first, or archive the account to hide it.`,
      409,
    );
  }
  await prisma.cashAccount.delete({ where: { id: accountId } });
}

/**
 * Delete a movement. Manual entries delete straight. Transfer legs are deleted
 * as a pair in one transaction (shared `transferId`). Auto-posted entries
 * (HATCHERY_PARTY_PAYMENT, HATCHERY_SUPPLIER_PAYMENT, HATCHERY_BATCH_EXPENSE,
 * STAFF_PAYMENT) must be removed by deleting the source event instead —
 * removing the mirror row would silently desync the cashbook from the business
 * ledger.
 */
export async function deleteMovement(
  userId: string,
  movementId: string,
): Promise<{ deletedIds: string[] }> {
  await assertHatcheryOwner(userId);
  const movement = await prisma.cashMovement.findUnique({
    where: { id: movementId },
    select: { id: true, userId: true, sourceType: true, transferId: true },
  });
  if (!movement) throw new CashflowError("Movement not found", 404);
  if (movement.userId !== userId) {
    throw new CashflowError("Movement does not belong to this user", 403);
  }

  if (movement.sourceType === "MANUAL") {
    await prisma.cashMovement.delete({ where: { id: movementId } });
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
      const legs = await tx.cashMovement.findMany({
        where: { transferId, userId },
        select: { id: true },
      });
      await tx.cashMovement.deleteMany({
        where: { transferId, userId },
      });
      return { deletedIds: legs.map((l) => l.id) };
    });
  }

  throw new CashflowError(
    "Auto-posted entries can only be removed by deleting the source transaction (party payment, supplier payment, batch expense, or staff payment).",
    409,
  );
}

export async function editOpeningBalance(
  userId: string,
  accountId: string,
  nextOpening: number,
): Promise<CashAccount> {
  await assertHatcheryOwner(userId);
  if (!Number.isFinite(nextOpening) || nextOpening < 0) {
    throw new CashflowError("openingBalance must be a non-negative number");
  }
  const account = await findOwnAccount(userId, accountId);
  assertAccountActive(account);

  if (account.type === "BANK") {
    const movementCount = await prisma.cashMovement.count({
      where: { accountId },
    });
    if (movementCount > 0) {
      throw new CashflowError(
        "Account already has movements. Record a Cash in or Cash out instead of editing the opening balance.",
        409,
      );
    }
  }

  const today = getNepalBsTodayString();
  const updated = await prisma.cashAccount.update({
    where: { id: accountId },
    data: {
      openingBalance: new Prisma.Decimal(nextOpening),
      openingBalanceSetAt: new Date(),
      ...(account.type === "CASH" ? { openingBsDate: today } : {}),
    },
  });
  return toCashAccount(updated);
}

export type AccountWithBalance = CashAccount & {
  balance: number;
  hasMovements: boolean;
};

export async function getAccountBalances(
  userId: string,
  options: { asOfBsDate?: string; includeArchived?: boolean } = {},
): Promise<AccountWithBalance[]> {
  const accounts = await listAccounts(userId, {
    includeArchived: options.includeArchived ?? false,
  });
  if (accounts.length === 0) return [];

  const ids = accounts.map((a) => a.id);
  const movementsRaw = await prisma.cashMovement.findMany({
    where: { userId, accountId: { in: ids } },
    select: MOVEMENT_SELECT,
  });
  const movements = movementsRaw.map(toCashMovement);
  const touched = new Set(movements.map((m) => m.accountId));

  return accounts.map((a) => ({
    ...a,
    balance: computeAccountBalance(a, movements, options.asOfBsDate),
    hasMovements: touched.has(a.id),
  }));
}

export function validatePositiveAmount(value: unknown, label = "amount"): number {
  assertPositiveAmount(value, label);
  return value;
}

// ──────────────────────────── MOVEMENTS / TRANSFERS / REPORT ────────────────────────────

const BS_MONTHS = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];

function formatBsLong(bsDate: string): string {
  const [y, m, d] = bsDate.split("-").map(Number);
  return `${BS_MONTHS[m - 1] ?? ""} ${d}, ${y}`;
}

function startsOnMessage(account: { type: string; name: string; openingBsDate: string }): string {
  const who = account.type === "CASH" ? "Your cash book" : account.name;
  return `${who} starts on ${formatBsLong(account.openingBsDate)}. Pick that day or a later day.`;
}

const MANUAL_CATEGORIES: ReadonlyMap<CashCategory, CashMovementDirection> = new Map([
  ["CASH_IN", "IN"],
  ["CASH_OUT", "OUT"],
  ["OWNER_INVEST", "IN"],
  ["OWNER_DRAW", "OUT"],
  ["LOAN_RECEIVED", "IN"],
  ["LOAN_REPAYMENT", "OUT"],
  // PAYMENT_TO_DEALER is the historical enum name; semantically "payment to
  // upstream supplier". The UI labels it "Payments to suppliers" for every role.
  ["PAYMENT_TO_DEALER", "OUT"],
] as [CashCategory, CashMovementDirection][]);

function assertBsDateNotInFuture(bsDate: string): void {
  const todayBs = getNepalBsTodayString();
  if (bsDate > todayBs) {
    throw new CashflowError(
      `bsDate ${bsDate} is in the future (Nepal today is ${todayBs}); back-dated entries are allowed, future ones are not`,
      400,
    );
  }
}

function normalizePartyName(raw: unknown, fieldName = "partyName"): string {
  if (typeof raw !== "string") {
    throw new CashflowError(`${fieldName} is required`, 400);
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new CashflowError(`${fieldName} is required`, 400);
  }
  if (trimmed.length > 120) {
    throw new CashflowError(`${fieldName} must be 120 characters or fewer`, 400);
  }
  return trimmed;
}

function normalizeNotes(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") {
    throw new CashflowError("notes must be a string if provided", 400);
  }
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, 500);
}

async function loadOwnedActiveAccount(
  userId: string,
  accountId: string,
  db: DbClient,
): Promise<CashAccount> {
  if (typeof accountId !== "string" || accountId.length === 0) {
    throw new CashflowError("accountId is required", 400);
  }
  const row = await db.cashAccount.findUnique({ where: { id: accountId } });
  if (!row) throw new CashflowError("Account not found", 404);
  assertAccountOwner(row, userId);
  const account = toCashAccount(row);
  assertAccountActive(account);
  return account;
}

export interface ListMovementsOptions {
  fromBsDate?: string;
  toBsDate?: string;
  accountId?: string;
  limit?: number;
}

export async function listMovements(
  userId: string,
  options: ListMovementsOptions = {},
): Promise<CashMovement[]> {
  await assertHatcheryOwner(userId);
  if (options.fromBsDate !== undefined) assertValidBsDate(options.fromBsDate, "fromBsDate");
  if (options.toBsDate !== undefined) assertValidBsDate(options.toBsDate, "toBsDate");
  const limit = options.limit ?? 500;

  const rows = await prisma.cashMovement.findMany({
    where: {
      userId,
      ...(options.accountId ? { accountId: options.accountId } : {}),
      ...(options.fromBsDate ? { bsDate: { gte: options.fromBsDate } } : {}),
      ...(options.toBsDate
        ? { bsDate: { ...(options.fromBsDate ? { gte: options.fromBsDate } : {}), lte: options.toBsDate } }
        : {}),
    },
    orderBy: [{ bsDate: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: MOVEMENT_SELECT,
  });
  const accounts = await listAccounts(userId, { includeArchived: true });
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  return rows.map((row) => {
    const movement = toCashMovement(row);
    const account = accountById.get(movement.accountId);
    return {
      ...movement,
      countedInBalance: account ? countsInBalance(account, movement) : true,
    };
  });
}

export interface PostManualMovementInput {
  accountId: string;
  category: CashCategory;
  amount: number;
  bsDate: string;
  partyName: string;
  notes?: string | null;
}

export async function postManualMovement(
  userId: string,
  recordedById: string,
  input: PostManualMovementInput,
): Promise<CashMovement> {
  await assertHatcheryOwner(userId);
  assertPositiveAmount(input.amount, "amount");
  assertValidBsDate(input.bsDate, "bsDate");
  assertBsDateNotInFuture(input.bsDate);

  const direction = MANUAL_CATEGORIES.get(input.category);
  if (!direction) {
    throw new CashflowError(
      `category "${input.category}" cannot be posted as a manual entry`,
      400,
    );
  }

  const partyName = normalizePartyName(input.partyName);
  const notes = normalizeNotes(input.notes ?? null);

  return prisma.$transaction(async (tx) => {
    const account = await loadOwnedActiveAccount(userId, input.accountId, tx);
    if (input.bsDate < account.openingBsDate) {
      throw new CashflowError(
        startsOnMessage(account),
        400,
      );
    }
    const recorder = await resolveRecordedById(tx, userId, recordedById);
    const row = await tx.cashMovement.create({
      data: {
        userId,
        accountId: account.id,
        bsDate: input.bsDate,
        direction,
        amount: new Prisma.Decimal(input.amount),
        category: input.category,
        sourceType: CashSourceType.MANUAL,
        partyName,
        notes,
        recordedById: recorder,
      },
      select: MOVEMENT_SELECT,
    });
    return toCashMovement(row);
  });
}

export interface PostTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  bsDate: string;
  note?: string | null;
}

export async function postTransfer(
  userId: string,
  recordedById: string,
  input: PostTransferInput,
): Promise<{ transferId: string; legs: CashMovement[] }> {
  await assertHatcheryOwner(userId);
  assertPositiveAmount(input.amount, "amount");
  assertValidBsDate(input.bsDate, "bsDate");
  assertBsDateNotInFuture(input.bsDate);
  if (input.fromAccountId === input.toAccountId) {
    throw new CashflowError("fromAccountId and toAccountId must differ", 400);
  }

  const note = normalizeNotes(input.note ?? null);

  return prisma.$transaction(async (tx) => {
    const [from, to] = await Promise.all([
      loadOwnedActiveAccount(userId, input.fromAccountId, tx),
      loadOwnedActiveAccount(userId, input.toAccountId, tx),
    ]);
    const notStarted = [from, to].find((a) => input.bsDate < a.openingBsDate);
    if (notStarted) {
      throw new CashflowError(startsOnMessage(notStarted), 400);
    }

    const [outLeg, inLeg] = buildTransferLegs({
      fromAccountId: from.id,
      toAccountId: to.id,
      amount: input.amount,
      bsDate: input.bsDate,
      fromName: from.name,
      toName: to.name,
    });

    const recorder = await resolveRecordedById(tx, userId, recordedById);
    const makeLeg = (leg: typeof outLeg) =>
      tx.cashMovement.create({
        data: {
          userId,
          accountId: leg.accountId,
          bsDate: leg.bsDate,
          direction: leg.direction,
          amount: new Prisma.Decimal(leg.amount),
          category: CashCategory.TRANSFER,
          sourceType: CashSourceType.TRANSFER,
          sourceId: null,
          transferId: leg.transferId,
          partyName: leg.partyName,
          notes: note,
          recordedById: recorder,
        },
        select: MOVEMENT_SELECT,
      });

    const [outRow, inRow] = await Promise.all([makeLeg(outLeg), makeLeg(inLeg)]);
    return {
      transferId: outLeg.transferId,
      legs: [toCashMovement(outRow), toCashMovement(inRow)],
    };
  });
}

export interface ReportRange {
  fromBsDate: string;
  toBsDate: string;
}

export async function getReport(
  userId: string,
  range: ReportRange,
): Promise<{
  range: ReportRange;
  totals: {
    openingBalance: number;
    closingBalance: number;
    inflow: number;
    outflow: number;
    netChange: number;
  };
  byCategory: { inflow: Record<string, number>; outflow: Record<string, number> };
  transfers: { in: number; out: number };
  balances: AccountWithBalance[];
}> {
  assertValidBsDate(range.fromBsDate, "fromBsDate");
  assertValidBsDate(range.toBsDate, "toBsDate");
  if (range.toBsDate < range.fromBsDate) {
    throw new CashflowError("toBsDate must be on or after fromBsDate", 400);
  }

  const accounts = await listAccounts(userId, { includeArchived: true });
  if (accounts.length === 0) {
    const emptyInflow = {} as Record<string, number>;
    return {
      range,
      totals: {
        openingBalance: 0,
        closingBalance: 0,
        inflow: 0,
        outflow: 0,
        netChange: 0,
      },
      byCategory: { inflow: emptyInflow, outflow: {} as Record<string, number> },
      transfers: { in: 0, out: 0 },
      balances: [],
    };
  }

  const movementsRaw = await prisma.cashMovement.findMany({
    where: { userId },
    select: MOVEMENT_SELECT,
  });
  const movements = movementsRaw.map(toCashMovement);

  const priorOpeningBalance =
    range.fromBsDate <= CASH_SYSTEM_OPENING_BS_DATE
      ? 0
      : accounts.reduce(
          (sum, a) =>
            sum +
            computeAccountBalance(a, movements, decrementBsDay(range.fromBsDate)),
          0,
        );

  const periodOpenings = accounts.reduce(
    (sum, account) =>
      account.openingBsDate >= range.fromBsDate &&
      account.openingBsDate <= range.toBsDate
        ? sum + account.openingBalance
        : sum,
    0,
  );
  const openingBalance = priorOpeningBalance + periodOpenings;

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const counted = movements.filter((m) => {
    const account = accountById.get(m.accountId);
    return account ? countsInBalance(account, m) : false;
  });
  const countedIds = new Set(counted.map((m) => m.id));
  const legsByTransfer = new Map<string, CashMovement[]>();
  for (const m of movements) {
    if (!m.transferId) continue;
    legsByTransfer.set(m.transferId, [...(legsByTransfer.get(m.transferId) ?? []), m]);
  }
  const statementMovements = counted.map((m) => {
    if (m.category !== "TRANSFER" || !m.transferId) return m;
    const partnerCounted = (legsByTransfer.get(m.transferId) ?? []).some(
      (leg) => leg.id !== m.id && countedIds.has(leg.id),
    );
    if (partnerCounted) return m;
    return { ...m, category: (m.direction === "IN" ? "CASH_IN" : "CASH_OUT") as CashCategory };
  });

  const statement = rollupCashflowStatement(statementMovements, range, openingBalance);

  const touched = new Set(movements.map((m) => m.accountId));
  const balances = accounts.map((a) => ({
    ...a,
    balance: computeAccountBalance(a, movements, range.toBsDate),
    hasMovements: touched.has(a.id),
  }));

  return {
    range,
    totals: {
      openingBalance: statement.openingBalance,
      closingBalance: statement.closingBalance,
      inflow: statement.totalInflow,
      outflow: statement.totalOutflow,
      netChange: statement.netChange,
    },
    byCategory: { inflow: statement.inflow, outflow: statement.outflow },
    transfers: statement.transfers,
    balances,
  };
}

function decrementBsDay(bsDate: string): string {
  const { prevBsDate } = require("../utils/nepalBsDate") as {
    prevBsDate: (bs: string) => string;
  };
  return prevBsDate(bsDate);
}
