/**
 * Phase 2 hatchery auto-posting hooks. Each helper is called from inside the
 * hatchery source service's existing `prisma.$transaction(async tx => ...)`
 * block so the CashMovement row is created / updated / deleted atomically
 * with the business event.
 *
 * Invariants baked into every entry point — see cashflow plan §Money-flow
 * invariants. The *caller* is the one that decides whether to call these;
 * the autoPost helper trusts its input. For hatchery:
 *
 *   - HatcheryPartyTxn.SALE / ADJUSTMENT / OPENING_BALANCE never mirror.
 *     The payment row itself (HatcheryPartyPayment) is the mirror key, not
 *     its sibling HatcheryPartyTxn.PAYMENT.
 *   - HatcherySupplierTxn: only type === PAYMENT mirrors. PURCHASE /
 *     ADJUSTMENT / OPENING_BALANCE never fire autoPost (caller branches).
 *   - HatcheryBatchExpense: only type === MANUAL mirrors. INVENTORY is
 *     inventory consumption — cash moved earlier at SupplierTxn.PAYMENT.
 *   - Staff payments reuse postStaffSalaryMovement from farmerCashflowAutoPost
 *     (cross-tenant); only the controller role gate widens.
 *
 * Idempotency + recordedById guards: delegated to `upsertSourceMovement` from
 * farmerCashflowAutoPost — it find-then-updates by (userId, sourceType,
 * sourceId) and resolves `recordedById` via resolveRecordedById at the sink.
 */

import {
  CashCategory,
  CashMovementDirection,
  CashSourceType,
  Prisma,
} from "@prisma/client";
import {
  deleteSourceMovement,
  upsertSourceMovement,
} from "./farmerCashflowAutoPost";
// The farmer file also exports `ensureCashAccountId`, `postStaffSalaryMovement`,
// and `deleteStaffSalaryMovement` — they're cross-tenant (keyed by userId, not
// role) despite the file name. Importers of the hatchery auto-post should pull
// those directly from farmerCashflowAutoPost.
export {
  deleteStaffSalaryMovement,
  ensureCashAccountId,
  postStaffSalaryMovement,
} from "./farmerCashflowAutoPost";

type Tx = Prisma.TransactionClient;

// ─── Party payment (party pays the hatchery — cash IN) ──────────────────────

export interface HatcheryPartyPaymentPostInput {
  tx: Tx;
  userId: string;
  hatcheryPartyPaymentId: string;
  accountId: string;
  /** `HatcheryPartyPayment.amount` — the cash that landed in the account. */
  amount: number;
  date: Date;
  partyName: string;
  recordedById: string;
  notes?: string | null;
}

/**
 * Posts a cash IN against the dealer's chosen account for a party payment.
 * Only call from `HatcheryPartyService.addPayment` inside its tx; never off
 * the sibling HatcheryPartyTxn.PAYMENT row (would double-count).
 */
export async function postHatcheryPartyPaymentMovement(
  input: HatcheryPartyPaymentPostInput,
): Promise<void> {
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.HATCHERY_PARTY_PAYMENT,
    sourceId: input.hatcheryPartyPaymentId,
    direction: CashMovementDirection.IN,
    category: CashCategory.SALE_RECEIPT,
    amount: input.amount,
    date: input.date,
    partyName: input.partyName,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteHatcheryPartyPaymentMovement(
  tx: Tx,
  userId: string,
  hatcheryPartyPaymentId: string,
): Promise<void> {
  await deleteSourceMovement(
    tx,
    userId,
    CashSourceType.HATCHERY_PARTY_PAYMENT,
    hatcheryPartyPaymentId,
  );
}

// ─── Supplier payment (hatchery pays supplier — cash OUT) ───────────────────

export interface HatcherySupplierPaymentPostInput {
  tx: Tx;
  userId: string;
  /** `HatcherySupplierTxn.id` of the PAYMENT-type row. Only call for that type. */
  hatcherySupplierTxnId: string;
  accountId: string;
  amount: number;
  date: Date;
  supplierName: string;
  recordedById: string;
  notes?: string | null;
}

/**
 * Posts a cash OUT for a supplier payment. Only call when the source
 * HatcherySupplierTxn has `type === PAYMENT`. PURCHASE / ADJUSTMENT /
 * OPENING_BALANCE rows represent payable changes and never move cash.
 *
 * The UI label on the category is "Payments to suppliers" — same as dealer;
 * PAYMENT_TO_DEALER is the historical enum name.
 */
export async function postHatcherySupplierPaymentMovement(
  input: HatcherySupplierPaymentPostInput,
): Promise<void> {
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.HATCHERY_SUPPLIER_PAYMENT,
    sourceId: input.hatcherySupplierTxnId,
    direction: CashMovementDirection.OUT,
    category: CashCategory.PAYMENT_TO_DEALER,
    amount: input.amount,
    date: input.date,
    partyName: input.supplierName,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteHatcherySupplierPaymentMovement(
  tx: Tx,
  userId: string,
  hatcherySupplierTxnId: string,
): Promise<void> {
  await deleteSourceMovement(
    tx,
    userId,
    CashSourceType.HATCHERY_SUPPLIER_PAYMENT,
    hatcherySupplierTxnId,
  );
}

// ─── Batch expense (MANUAL type only — real cash out) ───────────────────────

export interface HatcheryBatchExpensePostInput {
  tx: Tx;
  userId: string;
  /** `HatcheryBatchExpense.id` of the MANUAL-type row. Never call for INVENTORY. */
  hatcheryBatchExpenseId: string;
  accountId: string;
  amount: number;
  date: Date;
  /** Usually the batch name + category, or a short "{category} — {itemName}". */
  partyName: string;
  recordedById: string;
  notes?: string | null;
}

/**
 * Posts a cash OUT for a MANUAL batch expense (labor, utilities, etc.).
 * INVENTORY-type expenses are consumption of already-owned stock and the
 * cash moved earlier at the HatcherySupplierTxn.PAYMENT that bought it;
 * mirroring here would double-count. Caller must branch on
 * `expense.type === "MANUAL"` before invoking this.
 */
export async function postHatcheryBatchExpenseMovement(
  input: HatcheryBatchExpensePostInput,
): Promise<void> {
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.HATCHERY_BATCH_EXPENSE,
    sourceId: input.hatcheryBatchExpenseId,
    direction: CashMovementDirection.OUT,
    category: CashCategory.EXPENSE,
    amount: input.amount,
    date: input.date,
    partyName: input.partyName,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteHatcheryBatchExpenseMovement(
  tx: Tx,
  userId: string,
  hatcheryBatchExpenseId: string,
): Promise<void> {
  await deleteSourceMovement(
    tx,
    userId,
    CashSourceType.HATCHERY_BATCH_EXPENSE,
    hatcheryBatchExpenseId,
  );
}
