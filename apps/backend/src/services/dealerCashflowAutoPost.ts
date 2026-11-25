/**
 * Phase 2 dealer auto-posting hooks. Each helper is called from inside the
 * dealer source controller's existing `prisma.$transaction(async tx => ...)`
 * block so the CashMovement row is created / updated / deleted atomically
 * with the business event.
 *
 * Invariants baked into every entry point — see cashflow plan §Money-flow
 * invariants. The *controller* is the one that decides whether to call these;
 * the autoPost helper trusts its caller. For dealer:
 *
 *   - Credit sales never mirror (caller skips).
 *   - Partial payments mirror only the paid portion (caller passes amountPaid).
 *   - Purchases, adjustments, in-kind settlements never mirror.
 *   - Settlement credit-recovery entries never mirror (bookkeeping only).
 *   - BroilerSaleSettlement mirrors only the farmerPayout OUT leg — the
 *     proceeds already came in via the broiler sales' DealerSalePayment mirrors.
 *
 * Idempotency: writes are keyed by `(userId, sourceType, sourceId)` — the
 * partial unique index on CashMovement enforces one-row-per-source so a
 * controller retry can't double-count money.
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
// role) despite the file name. Importers of the dealer auto-post should pull
// those directly from farmerCashflowAutoPost.
export {
  deleteStaffSalaryMovement,
  ensureCashAccountId,
  postStaffSalaryMovement,
} from "./farmerCashflowAutoPost";

type Tx = Prisma.TransactionClient;

// ─── Sale payment (initial payment during createDealerSale + bulk broiler) ───

export interface DealerSalePaymentPostInput {
  tx: Tx;
  userId: string;
  dealerSalePaymentId: string;
  accountId: string;
  amount: number;
  date: Date;
  partyName: string;
  recordedById: string;
  notes?: string | null;
}

export async function postDealerSalePaymentMovement(
  input: DealerSalePaymentPostInput,
): Promise<void> {
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.DEALER_SALE_PAYMENT,
    sourceId: input.dealerSalePaymentId,
    direction: CashMovementDirection.IN,
    category: CashCategory.SALE_RECEIPT,
    amount: input.amount,
    date: input.date,
    partyName: input.partyName,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteDealerSalePaymentMovement(
  tx: Tx,
  userId: string,
  dealerSalePaymentId: string,
): Promise<void> {
  await deleteSourceMovement(
    tx,
    userId,
    CashSourceType.DEALER_SALE_PAYMENT,
    dealerSalePaymentId,
  );
}

// ─── Dealer ledger — payment received (customer paid the dealer cash) ────────

export interface DealerLedgerReceiptPostInput {
  tx: Tx;
  userId: string;
  dealerLedgerEntryId: string;
  accountId: string;
  amount: number;
  date: Date;
  partyName: string;
  recordedById: string;
  notes?: string | null;
}

export async function postDealerLedgerReceiptMovement(
  input: DealerLedgerReceiptPostInput,
): Promise<void> {
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.DEALER_LEDGER_RECEIPT,
    sourceId: input.dealerLedgerEntryId,
    direction: CashMovementDirection.IN,
    category: CashCategory.SALE_RECEIPT,
    amount: input.amount,
    date: input.date,
    partyName: input.partyName,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteDealerLedgerReceiptMovement(
  tx: Tx,
  userId: string,
  dealerLedgerEntryId: string,
): Promise<void> {
  await deleteSourceMovement(
    tx,
    userId,
    CashSourceType.DEALER_LEDGER_RECEIPT,
    dealerLedgerEntryId,
  );
}

// ─── Dealer ledger — payment made (dealer handed cash to customer) ──────────

export interface DealerLedgerPaymentPostInput {
  tx: Tx;
  userId: string;
  dealerLedgerEntryId: string;
  accountId: string;
  amount: number;
  date: Date;
  partyName: string;
  recordedById: string;
  notes?: string | null;
}

export async function postDealerLedgerPaymentMovement(
  input: DealerLedgerPaymentPostInput,
): Promise<void> {
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.DEALER_LEDGER_PAYMENT,
    sourceId: input.dealerLedgerEntryId,
    direction: CashMovementDirection.OUT,
    category: CashCategory.CASH_OUT,
    amount: input.amount,
    date: input.date,
    partyName: input.partyName,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteDealerLedgerPaymentMovement(
  tx: Tx,
  userId: string,
  dealerLedgerEntryId: string,
): Promise<void> {
  await deleteSourceMovement(
    tx,
    userId,
    CashSourceType.DEALER_LEDGER_PAYMENT,
    dealerLedgerEntryId,
  );
}

// ─── Supplier payment (DealerManualCompanyPayment direction MADE or RECEIVED) ─

export interface DealerSupplierPaymentPostInput {
  tx: Tx;
  userId: string;
  dealerManualCompanyPaymentId: string;
  accountId: string;
  amount: number;
  date: Date;
  supplierName: string;
  /** MADE = dealer paid the supplier (cash OUT). RECEIVED = supplier refunded the dealer (cash IN). */
  direction: "MADE" | "RECEIVED";
  recordedById: string;
  notes?: string | null;
}

export async function postDealerSupplierPaymentMovement(
  input: DealerSupplierPaymentPostInput,
): Promise<void> {
  const isMade = input.direction === "MADE";
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.DEALER_SUPPLIER_PAYMENT,
    sourceId: input.dealerManualCompanyPaymentId,
    direction: isMade ? CashMovementDirection.OUT : CashMovementDirection.IN,
    // PAYMENT_TO_DEALER is the historical enum name; UI label is "Payments to
    // suppliers" for both farmer and dealer. Refunds (IN) show as SALE_RECEIPT
    // to surface on the inflow side of the statement.
    category: isMade ? CashCategory.PAYMENT_TO_DEALER : CashCategory.SALE_RECEIPT,
    amount: input.amount,
    date: input.date,
    partyName: input.supplierName,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteDealerSupplierPaymentMovement(
  tx: Tx,
  userId: string,
  dealerManualCompanyPaymentId: string,
): Promise<void> {
  await deleteSourceMovement(
    tx,
    userId,
    CashSourceType.DEALER_SUPPLIER_PAYMENT,
    dealerManualCompanyPaymentId,
  );
}

// ─── Broiler settlement — farmer payout only (one leg, OUT) ─────────────────

export interface BroilerSettlementPayoutPostInput {
  tx: Tx;
  userId: string;
  broilerSaleSettlementId: string;
  accountId: string;
  /** The `farmerPayout` field on the settlement — amount handed to the source farmer now. */
  amount: number;
  date: Date;
  farmerName: string;
  recordedById: string;
  notes?: string | null;
}

/**
 * Posts ONLY the farmerPayout OUT leg. The settlement's totalProceeds already
 * flowed in via each broiler sale's DealerSalePayment mirror when the sale was
 * created — posting a second PROCEEDS leg here would double-count the inflow.
 * Margin is derived as (sum of DEALER_SALE_PAYMENT inflows for this lot) −
 * (this OUT leg + creditRecovered handled on the ledger).
 */
export async function postBroilerSettlementPayoutMovement(
  input: BroilerSettlementPayoutPostInput,
): Promise<void> {
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.BROILER_SETTLEMENT_PAYOUT,
    sourceId: input.broilerSaleSettlementId,
    direction: CashMovementDirection.OUT,
    category: CashCategory.CASH_OUT,
    amount: input.amount,
    date: input.date,
    partyName: `Payout to ${input.farmerName}`,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteBroilerSettlementMovements(
  tx: Tx,
  userId: string,
  broilerSaleSettlementId: string,
): Promise<void> {
  // Delete both legs (payout + any hypothetical proceeds leg) so a future
  // addition of a proceeds mirror cleans up the same way without a schema diff.
  await tx.cashMovement.deleteMany({
    where: {
      userId,
      sourceType: {
        in: [
          CashSourceType.BROILER_SETTLEMENT_PAYOUT,
          CashSourceType.BROILER_SETTLEMENT_PROCEEDS,
        ],
      },
      sourceId: broilerSaleSettlementId,
    },
  });
}
