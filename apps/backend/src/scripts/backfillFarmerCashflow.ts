/**
 * Phase 2 backfill: mirror historical farmer source events into
 * CashMovement so existing farmers see their full history on
 * /farmer/dashboard/cashflow — not just movements created after Phase 5's
 * live auto-posts shipped.
 *
 * Source tables → mirror shape:
 *   SalePayment          → IN  / SALE_RECEIPT      / SALE_PAYMENT
 *   CustomerTransaction  → IN  / SALE_RECEIPT      / CUSTOMER_RECEIPT    (type=RECEIPT, deletedAt=null)
 *   Expense              → OUT / EXPENSE           / EXPENSE             (inventoryUsages empty only)
 *   EntityTransaction    → OUT / PAYMENT_TO_DEALER / SUPPLIER_PAYMENT    (type=PAYMENT, dealerId set, dealer owned by farmer)
 *   StaffPayment         → OUT / EXPENSE           / STAFF_PAYMENT
 *
 * Scope: User.role === 'OWNER' only. Matches the Phase 5 live guard that
 * keeps COMPANY/DEALER tenancies out of the farmer cashbook.
 *
 * Idempotency: before each create, find-first on
 * (userId, sourceType, sourceId). The partial unique index
 * `CashMovement_source_unique` is the authoritative guard; the
 * find-first is a cheaper check that lets us count skippedExisting
 * without a P2002 roundtrip per row.
 *
 * Safety: users with any pre-existing `sourceType = 'MANUAL'` row are
 * skipped unless `--force` is passed — protects anyone who entered
 * manual Cash movements in Phase 3 before backfill was wired.
 *
 * Run:
 *   pnpm --filter backend run backfill:farmer-cashflow --dry-run
 *   pnpm --filter backend run backfill:farmer-cashflow
 *   pnpm --filter backend run backfill:farmer-cashflow --user-id <id>
 */

import "dotenv/config";
import { randomUUID } from "crypto";
import {
  CashCategory,
  CashMovementDirection,
  CashSourceType,
  Prisma,
  TransactionType,
  UserRole,
} from "@prisma/client";
import prisma from "../utils/prisma";
import { ensureCashAccount } from "../services/farmerCashflowService";
import { toNepalBsDayString } from "../utils/nepalBsDate";

const BATCH_SIZE = 500;

type TableKey =
  | "salePayments"
  | "customerReceipts"
  | "expenses"
  | "supplierPayments"
  | "staffPayments";

interface TableCounts {
  scanned: number;
  inserted: number;
  skippedExisting: number;
}

interface Counts {
  salePayments: TableCounts;
  customerReceipts: TableCounts;
  expenses: TableCounts;
  supplierPayments: TableCounts;
  staffPayments: TableCounts;
}

function emptyCounts(): Counts {
  const blank = (): TableCounts => ({ scanned: 0, inserted: 0, skippedExisting: 0 });
  return {
    salePayments: blank(),
    customerReceipts: blank(),
    expenses: blank(),
    supplierPayments: blank(),
    staffPayments: blank(),
  };
}

function addCounts(a: Counts, b: Counts): Counts {
  const sum = (k: TableKey): TableCounts => ({
    scanned: a[k].scanned + b[k].scanned,
    inserted: a[k].inserted + b[k].inserted,
    skippedExisting: a[k].skippedExisting + b[k].skippedExisting,
  });
  return {
    salePayments: sum("salePayments"),
    customerReceipts: sum("customerReceipts"),
    expenses: sum("expenses"),
    supplierPayments: sum("supplierPayments"),
    staffPayments: sum("staffPayments"),
  };
}

export interface RunOptions {
  dryRun?: boolean;
  userId?: string;
  runId?: string;
  since?: Date;
  force?: boolean;
}

export interface UserSkip {
  userId: string;
  reason: "has_manual_movements";
}

export interface RunSummary {
  runId: string;
  dryRun: boolean;
  usersSeen: number;
  usersIncluded: number;
  usersSkipped: UserSkip[];
  counts: Counts;
  durationMs: number;
}

/**
 * Idempotent find-then-create. Returns true when a new row was inserted,
 * false when a prior row already covers (userId, sourceType, sourceId).
 */
async function insertIfMissing(data: {
  userId: string;
  accountId: string;
  bsDate: string;
  direction: CashMovementDirection;
  amount: Prisma.Decimal;
  category: CashCategory;
  sourceType: CashSourceType;
  sourceId: string;
  partyName: string;
  notes: string | null;
  backfillRunId: string;
  recordedById: string;
  dryRun: boolean;
}): Promise<"inserted" | "skipped"> {
  const existing = await prisma.cashMovement.findFirst({
    where: {
      userId: data.userId,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
    },
    select: { id: true },
  });
  if (existing) return "skipped";

  if (!data.dryRun) {
    await prisma.cashMovement.create({
      data: {
        userId: data.userId,
        accountId: data.accountId,
        bsDate: data.bsDate,
        direction: data.direction,
        amount: data.amount,
        category: data.category,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        partyName: data.partyName,
        notes: data.notes,
        backfillRunId: data.backfillRunId,
        recordedById: data.recordedById,
      },
    });
  }
  return "inserted";
}

function trimPartyName(raw: string | null | undefined, fallback: string): string {
  const v = (raw ?? "").trim();
  return (v.length > 0 ? v : fallback).slice(0, 120);
}

function trimNotes(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (v.length === 0) return null;
  return v.slice(0, 500);
}

// ─── Per-user, per-table backfill loops ────────────────────────────────────────

async function backfillSalePayments(
  userId: string,
  accountId: string,
  runId: string,
  since: Date | undefined,
  dryRun: boolean,
  counts: Counts,
): Promise<void> {
  let cursor: string | undefined;
  while (true) {
    const rows = await prisma.salePayment.findMany({
      where: {
        OR: [
          { sale: { customer: { userId } } },
          { sale: { farm: { ownerId: userId } } },
        ],
        ...(since ? { date: { gte: since } } : {}),
      },
      include: {
        sale: {
          select: {
            customer: { select: { name: true, userId: true } },
            farm: { select: { ownerId: true } },
          },
        },
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (rows.length === 0) break;
    for (const row of rows) {
      counts.salePayments.scanned += 1;

      const ownerMatchesViaCustomer = row.sale.customer?.userId === userId;
      const ownerMatchesViaFarm = row.sale.farm?.ownerId === userId;
      if (!ownerMatchesViaCustomer && !ownerMatchesViaFarm) {
        // Neither relation resolves to this farmer — shouldn't happen given the
        // OR filter, but skip defensively.
        continue;
      }

      const result = await insertIfMissing({
        userId,
        accountId,
        bsDate: toNepalBsDayString(row.date),
        direction: CashMovementDirection.IN,
        amount: row.amount,
        category: CashCategory.SALE_RECEIPT,
        sourceType: CashSourceType.SALE_PAYMENT,
        sourceId: row.id,
        partyName: trimPartyName(row.sale.customer?.name, "Walk-in customer"),
        notes: trimNotes(row.description),
        backfillRunId: runId,
        recordedById: userId,
        dryRun,
      });
      if (result === "inserted") counts.salePayments.inserted += 1;
      else counts.salePayments.skippedExisting += 1;
    }
    cursor = rows[rows.length - 1].id;
  }
}

async function backfillCustomerReceipts(
  userId: string,
  accountId: string,
  runId: string,
  since: Date | undefined,
  dryRun: boolean,
  counts: Counts,
): Promise<void> {
  let cursor: string | undefined;
  while (true) {
    const rows = await prisma.customerTransaction.findMany({
      where: {
        type: TransactionType.RECEIPT,
        deletedAt: null,
        customer: { userId },
        ...(since ? { date: { gte: since } } : {}),
      },
      include: { customer: { select: { name: true } } },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (rows.length === 0) break;
    for (const row of rows) {
      counts.customerReceipts.scanned += 1;
      const result = await insertIfMissing({
        userId,
        accountId,
        bsDate: toNepalBsDayString(row.date),
        direction: CashMovementDirection.IN,
        amount: row.amount,
        category: CashCategory.SALE_RECEIPT,
        sourceType: CashSourceType.CUSTOMER_RECEIPT,
        sourceId: row.id,
        partyName: trimPartyName(row.customer.name, "Customer"),
        notes: trimNotes(row.description),
        backfillRunId: runId,
        recordedById: userId,
        dryRun,
      });
      if (result === "inserted") counts.customerReceipts.inserted += 1;
      else counts.customerReceipts.skippedExisting += 1;
    }
    cursor = rows[rows.length - 1].id;
  }
}

async function backfillExpenses(
  userId: string,
  accountId: string,
  runId: string,
  since: Date | undefined,
  dryRun: boolean,
  counts: Counts,
): Promise<void> {
  let cursor: string | undefined;
  while (true) {
    const rows = await prisma.expense.findMany({
      where: {
        farm: { ownerId: userId },
        // Matches the live `drawsFromInventory = inventoryUsages.length === 0`
        // signal in expenseController. Inventory-backed rows were already
        // accounted for when the supplier payment was recorded.
        inventoryUsages: { none: {} },
        ...(since ? { date: { gte: since } } : {}),
      },
      include: { category: { select: { name: true } } },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (rows.length === 0) break;
    for (const row of rows) {
      counts.expenses.scanned += 1;
      const fallback = row.description?.trim() || "Expense";
      const result = await insertIfMissing({
        userId,
        accountId,
        bsDate: toNepalBsDayString(row.date),
        direction: CashMovementDirection.OUT,
        amount: row.amount,
        category: CashCategory.EXPENSE,
        sourceType: CashSourceType.EXPENSE,
        sourceId: row.id,
        partyName: trimPartyName(row.category?.name, fallback),
        notes: trimNotes(row.description),
        backfillRunId: runId,
        recordedById: userId,
        dryRun,
      });
      if (result === "inserted") counts.expenses.inserted += 1;
      else counts.expenses.skippedExisting += 1;
    }
    cursor = rows[rows.length - 1].id;
  }
}

async function backfillSupplierPayments(
  userId: string,
  accountId: string,
  runId: string,
  since: Date | undefined,
  dryRun: boolean,
  counts: Counts,
): Promise<void> {
  let cursor: string | undefined;
  while (true) {
    const rows = await prisma.entityTransaction.findMany({
      where: {
        type: TransactionType.PAYMENT,
        dealerId: { not: null },
        // Farmer-owned dealer only. Dealer.userId belongs to a COMPANY user for
        // dealer-tenant records; filtering here matches the Phase 5 live guard
        // that blocks cross-tenant supplier-payment mirrors.
        dealer: { userId },
        ...(since ? { date: { gte: since } } : {}),
      },
      include: { dealer: { select: { name: true } } },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (rows.length === 0) break;
    for (const row of rows) {
      counts.supplierPayments.scanned += 1;
      const result = await insertIfMissing({
        userId,
        accountId,
        bsDate: toNepalBsDayString(row.date),
        direction: CashMovementDirection.OUT,
        amount: row.amount,
        category: CashCategory.PAYMENT_TO_DEALER,
        sourceType: CashSourceType.SUPPLIER_PAYMENT,
        sourceId: row.id,
        partyName: trimPartyName(row.dealer?.name, "Supplier"),
        notes: trimNotes(row.description),
        backfillRunId: runId,
        recordedById: userId,
        dryRun,
      });
      if (result === "inserted") counts.supplierPayments.inserted += 1;
      else counts.supplierPayments.skippedExisting += 1;
    }
    cursor = rows[rows.length - 1].id;
  }
}

async function backfillStaffPayments(
  userId: string,
  accountId: string,
  runId: string,
  since: Date | undefined,
  dryRun: boolean,
  counts: Counts,
): Promise<void> {
  let cursor: string | undefined;
  while (true) {
    const rows = await prisma.staffPayment.findMany({
      where: {
        staff: { ownerId: userId },
        ...(since ? { paidAt: { gte: since } } : {}),
      },
      include: { staff: { select: { name: true } } },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (rows.length === 0) break;
    for (const row of rows) {
      counts.staffPayments.scanned += 1;
      const result = await insertIfMissing({
        userId,
        accountId,
        bsDate: toNepalBsDayString(row.paidAt),
        direction: CashMovementDirection.OUT,
        amount: row.amount,
        category: CashCategory.EXPENSE,
        sourceType: CashSourceType.STAFF_PAYMENT,
        sourceId: row.id,
        partyName: trimPartyName(row.staff.name, "Staff"),
        notes: trimNotes(row.note),
        backfillRunId: runId,
        recordedById: userId,
        dryRun,
      });
      if (result === "inserted") counts.staffPayments.inserted += 1;
      else counts.staffPayments.skippedExisting += 1;
    }
    cursor = rows[rows.length - 1].id;
  }
}

// ─── User orchestration ────────────────────────────────────────────────────────

async function processUser(
  userId: string,
  runId: string,
  options: RunOptions,
): Promise<Counts> {
  const counts = emptyCounts();
  const cash = await ensureCashAccount(userId);
  await backfillSalePayments(userId, cash.id, runId, options.since, options.dryRun === true, counts);
  await backfillCustomerReceipts(userId, cash.id, runId, options.since, options.dryRun === true, counts);
  await backfillExpenses(userId, cash.id, runId, options.since, options.dryRun === true, counts);
  await backfillSupplierPayments(userId, cash.id, runId, options.since, options.dryRun === true, counts);
  await backfillStaffPayments(userId, cash.id, runId, options.since, options.dryRun === true, counts);
  return counts;
}

export async function runBackfill(options: RunOptions = {}): Promise<RunSummary> {
  const runId = options.runId ?? randomUUID();
  const dryRun = options.dryRun === true;
  const start = Date.now();

  const where: Prisma.UserWhereInput = { role: UserRole.OWNER };
  if (options.userId) where.id = options.userId;

  const users = await prisma.user.findMany({
    where,
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const skipped: UserSkip[] = [];
  let totals = emptyCounts();
  let included = 0;

  for (const user of users) {
    if (!options.force) {
      const manual = await prisma.cashMovement.findFirst({
        where: { userId: user.id, sourceType: CashSourceType.MANUAL },
        select: { id: true },
      });
      if (manual) {
        skipped.push({ userId: user.id, reason: "has_manual_movements" });
        continue;
      }
    }
    const counts = await processUser(user.id, runId, { ...options, dryRun });
    totals = addCounts(totals, counts);
    included += 1;
  }

  return {
    runId,
    dryRun,
    usersSeen: users.length,
    usersIncluded: included,
    usersSkipped: skipped,
    counts: totals,
    durationMs: Date.now() - start,
  };
}

// ─── CLI entrypoint ────────────────────────────────────────────────────────────

function parseFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  const value = process.argv[idx + 1];
  if (value === undefined || value.startsWith("--")) return undefined;
  return value;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");
  const userId = parseFlag("--user-id");
  const runIdArg = parseFlag("--run-id");
  const sinceArg = parseFlag("--since");
  let since: Date | undefined;
  if (sinceArg) {
    const d = new Date(sinceArg);
    if (Number.isNaN(d.getTime())) {
      console.error(`--since must be a valid ISO AD date, got "${sinceArg}"`);
      process.exit(1);
    }
    since = d;
  }

  console.log(
    `Backfilling CashMovement${dryRun ? " (DRY RUN)" : ""}` +
      (userId ? ` for user ${userId}` : "") +
      (force ? " [--force]" : "") +
      (since ? ` since ${since.toISOString()}` : "") +
      "...",
  );

  const summary = await runBackfill({
    dryRun,
    force,
    userId,
    runId: runIdArg,
    since,
  });
  console.log(JSON.stringify(summary, null, 2));
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
