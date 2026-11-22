/**
 * Phase 5 auto-posting hooks. Each helper is called from inside the source
 * controller's existing `prisma.$transaction(async tx => ...)` block so the
 * CashMovement row is created / updated / deleted atomically with the
 * business event (Sale, SalePayment, CustomerTransaction(RECEIPT), Expense).
 *
 * Idempotency: writes are keyed by `(userId, sourceType, sourceId)` — the
 * partial unique index on CashMovement enforces one-row-per-source so a
 * controller retry can't double-count money. The helpers use find-then-update
 * (not Prisma `upsert`) because the partial index is created in raw SQL and is
 * invisible to Prisma's upsert validator.
 */

import {
  CashCategory,
  CashMovementDirection,
  CashSourceType,
  Prisma,
} from "@prisma/client";
import { CashflowError } from "../common/cashflow/errors";
import { toNepalBsDayString } from "../utils/nepalBsDate";

type Tx = Prisma.TransactionClient;

async function assertAccountOwnedActive(
  tx: Tx,
  userId: string,
  accountId: string,
): Promise<void> {
  const acc = await tx.cashAccount.findUnique({
    where: { id: accountId },
    select: { userId: true, archivedAt: true },
  });
  if (!acc) throw new CashflowError("Account not found", 404);
  if (acc.userId !== userId) {
    throw new CashflowError("Account does not belong to this user", 403);
  }
  if (acc.archivedAt !== null) {
    throw new CashflowError("Account is archived", 409);
  }
}

interface UpsertParams {
  tx: Tx;
  userId: string;
  accountId: string;
  sourceType: CashSourceType;
  sourceId: string;
  direction: CashMovementDirection;
  category: CashCategory;
  amount: number;
  date: Date;
  partyName: string;
  notes?: string | null;
  recordedById: string;
}

async function upsertSourceMovement(params: UpsertParams): Promise<void> {
  const {
    tx,
    userId,
    accountId,
    sourceType,
    sourceId,
    direction,
    category,
    amount,
    date,
    partyName,
    notes = null,
    recordedById,
  } = params;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new CashflowError("Auto-post amount must be positive", 400);
  }

  await assertAccountOwnedActive(tx, userId, accountId);

  const bsDate = toNepalBsDayString(date);

  const existing = await tx.cashMovement.findFirst({
    where: { userId, sourceType, sourceId },
    select: { id: true },
  });

  if (existing) {
    await tx.cashMovement.update({
      where: { id: existing.id },
      data: {
        accountId,
        direction,
        amount: new Prisma.Decimal(amount),
        category,
        bsDate,
        partyName,
        notes,
      },
    });
    return;
  }

  await tx.cashMovement.create({
    data: {
      userId,
      accountId,
      bsDate,
      direction,
      amount: new Prisma.Decimal(amount),
      category,
      sourceType,
      sourceId,
      partyName,
      notes,
      recordedById,
    },
  });
}

async function deleteSourceMovement(
  tx: Tx,
  userId: string,
  sourceType: CashSourceType,
  sourceId: string,
): Promise<void> {
  await tx.cashMovement.deleteMany({
    where: { userId, sourceType, sourceId },
  });
}

// ─── Expense ──────────────────────────────────────────────────────────────────

export interface ExpensePostInput {
  tx: Tx;
  userId: string;
  expenseId: string;
  accountId: string;
  amount: number;
  date: Date;
  label: string;
  recordedById: string;
  notes?: string | null;
}

export async function upsertExpenseMovement(input: ExpensePostInput): Promise<void> {
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.EXPENSE,
    sourceId: input.expenseId,
    direction: CashMovementDirection.OUT,
    category: CashCategory.EXPENSE,
    amount: input.amount,
    date: input.date,
    partyName: input.label,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteExpenseMovement(
  tx: Tx,
  userId: string,
  expenseId: string,
): Promise<void> {
  await deleteSourceMovement(tx, userId, CashSourceType.EXPENSE, expenseId);
}

// ─── Sale payment (initial payment created during createSale) ─────────────────

export interface SalePaymentPostInput {
  tx: Tx;
  userId: string;
  salePaymentId: string;
  accountId: string;
  amount: number;
  date: Date;
  partyName: string;
  recordedById: string;
  notes?: string | null;
}

export async function postSalePaymentMovement(
  input: SalePaymentPostInput,
): Promise<void> {
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.SALE_PAYMENT,
    sourceId: input.salePaymentId,
    direction: CashMovementDirection.IN,
    category: CashCategory.SALE_RECEIPT,
    amount: input.amount,
    date: input.date,
    partyName: input.partyName,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteSalePaymentMovement(
  tx: Tx,
  userId: string,
  salePaymentId: string,
): Promise<void> {
  await deleteSourceMovement(
    tx,
    userId,
    CashSourceType.SALE_PAYMENT,
    salePaymentId,
  );
}

// ─── Customer receipt (CustomerTransaction.type = RECEIPT) ────────────────────

export interface CustomerReceiptPostInput {
  tx: Tx;
  userId: string;
  customerTransactionId: string;
  accountId: string;
  amount: number;
  date: Date;
  partyName: string;
  recordedById: string;
  notes?: string | null;
}

export async function postCustomerReceiptMovement(
  input: CustomerReceiptPostInput,
): Promise<void> {
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.CUSTOMER_RECEIPT,
    sourceId: input.customerTransactionId,
    direction: CashMovementDirection.IN,
    category: CashCategory.SALE_RECEIPT,
    amount: input.amount,
    date: input.date,
    partyName: input.partyName,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteCustomerReceiptMovement(
  tx: Tx,
  userId: string,
  customerTransactionId: string,
): Promise<void> {
  await deleteSourceMovement(
    tx,
    userId,
    CashSourceType.CUSTOMER_RECEIPT,
    customerTransactionId,
  );
}

// ─── Staff salary payment (farmer-side StaffPayment) ─────────────────────────

export interface StaffSalaryPostInput {
  tx: Tx;
  userId: string;
  staffPaymentId: string;
  accountId: string;
  amount: number;
  date: Date;
  staffName: string;
  recordedById: string;
  notes?: string | null;
}

export async function postStaffSalaryMovement(
  input: StaffSalaryPostInput,
): Promise<void> {
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.STAFF_PAYMENT,
    sourceId: input.staffPaymentId,
    direction: CashMovementDirection.OUT,
    // Staff salary is operating expense — surface under the Expense bucket in
    // the cashflow statement. partyName carries the staff name so each row
    // is still identifiable at a glance.
    category: CashCategory.EXPENSE,
    amount: input.amount,
    date: input.date,
    partyName: input.staffName,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteStaffSalaryMovement(
  tx: Tx,
  userId: string,
  staffPaymentId: string,
): Promise<void> {
  await deleteSourceMovement(
    tx,
    userId,
    CashSourceType.STAFF_PAYMENT,
    staffPaymentId,
  );
}

// ─── Supplier payment (EntityTransaction.type = PAYMENT from a dealer ledger) ─

export interface SupplierPaymentPostInput {
  tx: Tx;
  userId: string;
  entityTransactionId: string;
  accountId: string;
  amount: number;
  date: Date;
  supplierName: string;
  recordedById: string;
  notes?: string | null;
}

export async function postSupplierPaymentMovement(
  input: SupplierPaymentPostInput,
): Promise<void> {
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.SUPPLIER_PAYMENT,
    sourceId: input.entityTransactionId,
    direction: CashMovementDirection.OUT,
    category: CashCategory.PAYMENT_TO_DEALER,
    amount: input.amount,
    date: input.date,
    partyName: input.supplierName,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteSupplierPaymentMovement(
  tx: Tx,
  userId: string,
  entityTransactionId: string,
): Promise<void> {
  await deleteSourceMovement(
    tx,
    userId,
    CashSourceType.SUPPLIER_PAYMENT,
    entityTransactionId,
  );
}

/**
 * Convenience: ensure the user has a Cash account id to fall back to when a
 * source form hasn't shipped the account picker yet. Mirrors the service's
 * ensureCashAccount but inside a transaction so the auto-post path is
 * idempotent even when the Cash row doesn't exist yet (new user's first write).
 */
export async function ensureCashAccountId(
  tx: Tx,
  userId: string,
): Promise<string> {
  const existing = await tx.cashAccount.findFirst({
    where: { userId, type: "CASH", archivedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  // Mirror of the service-level seed; kept here so this file stays
  // self-sufficient when called from controllers.
  const created = await tx.cashAccount.create({
    data: {
      userId,
      type: "CASH",
      name: "Cash",
      openingBalance: new Prisma.Decimal(0),
      openingBsDate: "2000-01-01",
    },
    select: { id: true },
  });
  return created.id;
}
