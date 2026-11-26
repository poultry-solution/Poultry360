/**
 * Dealer cashflow (cash book) service — Approach A, v2.
 *
 * Writes into the same CashAccount + CashMovement tables as the farmer
 * service — those tables are keyed by the owner's `userId` and the User's
 * `role` is the discriminator (a User is exactly one role). Every public
 * entry point in this file asserts `user.role === DEALER` as belt-and-braces
 * beyond the [DEALER] route middleware.
 *
 * Pure math (balance, report, transfer leg building) is delegated to
 * `common/cashflow/*`, same modules the farmer service uses.
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

/**
 * Canonical column list for every CashMovement read. Centralised so the
 * returned shape stays in sync with the `CashMovement` interface — missing one
 * column here is how `partyName`/`notes` disappeared from the list endpoint
 * on the farmer side once.
 */
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

/**
 * System-anchor opening date for the auto-created CASH account.
 * Using the lowest supported BS year (nepali-date-converter supports BS 2000+)
 * means every back-dated manual entry a dealer records falls on or after this
 * date and is counted in the balance. If we used today's date instead, any
 * movement with an earlier bsDate would be silently filtered out of reports
 * (balance fn ignores movements before openingBsDate).
 */
const CASH_SYSTEM_OPENING_BS_DATE = "2000-01-01";

/**
 * Guard: route middleware already restricts callers to `[DEALER]` role, but
 * the service is the only thing writing into the shared CashAccount table, so
 * a second role check at every public entry point protects against a future
 * caller forgetting the route gate. Cached lookup via `findUnique` on the PK.
 */
async function assertDealerOwner(userId: string, db: DbClient = prisma): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || user.role !== UserRole.DEALER) {
    throw new CashflowError("Dealer account required", 403);
  }
}

/** Idempotent. Returns the single CASH account for the dealer, creating it if missing. */
export async function ensureCashAccount(
  userId: string,
  db: DbClient = prisma,
): Promise<CashAccount> {
  await assertDealerOwner(userId, db);
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
    // Partial unique on (userId WHERE type='CASH' AND archivedAt IS NULL) — another
    // concurrent call won; re-fetch and return theirs.
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
  await assertDealerOwner(userId);
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
  await assertDealerOwner(userId);
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
  await assertDealerOwner(userId);
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
  await assertDealerOwner(userId);
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
  await assertDealerOwner(userId);
  const account = await findOwnAccount(userId, accountId);
  if (account.archivedAt === null) return account;
  if (account.type === "CASH") {
    // Shouldn't be reachable (we don't allow CASH to be archived) but belt-and-braces.
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

/**
 * Hard-delete a bank account. Only possible when the account has no movements
 * — otherwise the audit trail would break. The error message points the user
 * at the two safe paths: delete the transactions first, or archive to hide.
 */
export async function deleteAccount(
  userId: string,
  accountId: string,
): Promise<void> {
  await assertDealerOwner(userId);
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
 * (DEALER_SALE_PAYMENT, DEALER_LEDGER_RECEIPT/PAYMENT, DEALER_SUPPLIER_PAYMENT,
 * BROILER_SETTLEMENT_PROCEEDS/PAYOUT, STAFF_PAYMENT) must be removed by
 * deleting the source event instead — removing the mirror row would silently
 * desync the cashbook from the business ledger.
 */
export async function deleteMovement(
  userId: string,
  movementId: string,
): Promise<{ deletedIds: string[] }> {
  await assertDealerOwner(userId);
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
    "Auto-posted entries can only be removed by deleting the source transaction (sale, ledger payment, supplier payment, broiler settlement, or staff payment).",
    409,
  );
}

export async function editOpeningBalance(
  userId: string,
  accountId: string,
  nextOpening: number,
): Promise<CashAccount> {
  await assertDealerOwner(userId);
  if (!Number.isFinite(nextOpening) || nextOpening < 0) {
    throw new CashflowError("openingBalance must be a non-negative number");
  }
  const account = await findOwnAccount(userId, accountId);
  assertAccountActive(account);

  // BANK accounts are created with a user-picked openingBsDate, so retroactively
  // changing the opening after real transfers have landed would silently
  // rewrite history — refuse and point them at a corrective Cash in / Cash out.
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

  // For CASH: the amount the dealer types is "cash I have right now", so it
  // already includes every entry saved up to this moment. We move the Cash
  // start to today and stamp openingBalanceSetAt = now; `countsInBalance`
  // then leaves out entries dated before today and today's entries saved
  // before this moment. Entries saved after the count add as normal. Older
  // entries stay in the ledgers but don't touch the Cash balance.
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
  /**
   * True when at least one movement references this account. The UI uses it
   * to lock the opening-balance field after creation — balance can round-trip
   * back to the original opening value (deposit N, withdraw N) while
   * movements still exist, so a `balance === openingBalance` comparison
   * isn't a safe proxy. The server also refuses `editOpeningBalance` once
   * this is true; the flag just keeps the UI honest.
   */
  hasMovements: boolean;
};

/**
 * Returns balances for a dealer's accounts. `includeArchived` defaults to false
 * for the account-picker use case; the settings page and date-ranged reports
 * pass `true` so archived accounts show their real (non-zero) historical balance
 * for the requested `asOfBsDate`.
 */
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

/**
 * Service-level amount validator for incoming write paths. Keeps the common
 * module free of runtime-type errors while still allowing callers to use the
 * same pattern on manual movements + transfers.
 */
export function validatePositiveAmount(value: unknown, label = "amount"): number {
  assertPositiveAmount(value, label);
  return value;
}

// ──────────────────────────── MOVEMENTS / TRANSFERS / REPORT ────────────────────────────

const BS_MONTHS = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];

/** "Mangsir 7, 2083" from a BS "2083-08-07" string. */
function formatBsLong(bsDate: string): string {
  const [y, m, d] = bsDate.split("-").map(Number);
  return `${BS_MONTHS[m - 1] ?? ""} ${d}, ${y}`;
}

function startsOnMessage(account: { type: string; name: string; openingBsDate: string }): string {
  const who = account.type === "CASH" ? "Your cash book" : account.name;
  return `${who} starts on ${formatBsLong(account.openingBsDate)}. Pick that day or a later day.`;
}

/**
 * Categories the UI can post directly from the "Cash in / Cash out" entry.
 * Auto-posted categories (SALE_RECEIPT, EXPENSE, TRANSFER) only come in through
 * their dedicated service methods, so they're refused here as a belt-and-braces
 * guard.
 */
const MANUAL_CATEGORIES: ReadonlyMap<CashCategory, CashMovementDirection> = new Map([
  ["CASH_IN", "IN"],
  ["CASH_OUT", "OUT"],
  ["OWNER_INVEST", "IN"],
  ["OWNER_DRAW", "OUT"],
  ["LOAN_RECEIVED", "IN"],
  ["LOAN_REPAYMENT", "OUT"],
  // PAYMENT_TO_DEALER is the historical enum name; semantically "payment to
  // the dealer's upstream supplier". The UI labels it "Payments to suppliers"
  // for both roles.
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
  await assertDealerOwner(userId);
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
  await assertDealerOwner(userId);
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
  await assertDealerOwner(userId);
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
          // sourceId stays null for transfers: transferId identifies the pair,
          // and the (userId, sourceType, sourceId) partial unique index would
          // reject the second leg if both carried the same cuid.
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

/**
 * Period report: per-account balances as of `toBsDate` + cashflow statement
 * for the range. Opening balance is the total across all accounts at the day
 * before `fromBsDate` (derived via pure fn + the already-fetched movement set).
 */
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

  // Opening balance = sum of per-account balances on the day BEFORE fromBsDate.
  // Short-circuit when fromBsDate is at the system anchor (CASH is seeded
  // there). nepali-date-converter rejects dates before BS 2000, so
  // `prevBsDate("2000-01-01")` throws. Semantically it's also the right answer:
  // every account's balance on the day before the anchor is 0 by construction.
  const priorOpeningBalance =
    range.fromBsDate <= CASH_SYSTEM_OPENING_BS_DATE
      ? 0
      : accounts.reduce(
          (sum, a) =>
            sum +
            computeAccountBalance(a, movements, decrementBsDay(range.fromBsDate)),
          0,
        );

  // An account can be declared during the selected period — e.g. the dealer
  // sets their Cash opening today, which rolls the Cash openingBsDate to
  // today and puts the declared amount inside the period. From the dealer's
  // POV that declared amount IS part of the period's starting money, so fold
  // it into the opening balance.
  const periodOpenings = accounts.reduce(
    (sum, account) =>
      account.openingBsDate >= range.fromBsDate &&
      account.openingBsDate <= range.toBsDate
        ? sum + account.openingBalance
        : sum,
    0,
  );
  const openingBalance = priorOpeningBalance + periodOpenings;

  // Only movements that change a balance belong in the statement: entries
  // dated before an account's start, or saved before the dealer counted their
  // cash on the start day, are already inside the opening amount.
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const counted = movements.filter((m) => {
    const account = accountById.get(m.accountId);
    return account ? countsInBalance(account, m) : false;
  });
  // A transfer normally nets to zero. If only one leg counts, that leg really
  // changes the total, so show it as plain money in / out instead of hiding
  // it in the transfer section.
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

/**
 * BS-day minus one. Lazy-require so Jest mocks of this module don't have to
 * stub nepalBsDate's extensive dependency chain.
 */
function decrementBsDay(bsDate: string): string {
  const { prevBsDate } = require("../utils/nepalBsDate") as {
    prevBsDate: (bs: string) => string;
  };
  return prevBsDate(bsDate);
}
