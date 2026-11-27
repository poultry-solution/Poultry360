/**
 * Company Cash & Bank auto-posting. Called inside the payment's own
 * transaction so the CashMovement is written / removed together with the
 * payment. Keyed by (owner userId, sourceType, sourceId) like the farmer and
 * dealer hooks; the shared helpers live in farmerCashflowAutoPost.
 */

import { CashCategory, CashMovementDirection, CashSourceType, Prisma } from "@prisma/client";
import { CashflowError } from "../common/cashflow/errors";
import { derivePaymentMethodFromAccountType } from "../common/cashflow/paymentMethod";
import { deleteSourceMovement, ensureCashAccountId, upsertSourceMovement } from "./farmerCashflowAutoPost";

type Tx = Prisma.TransactionClient;

/**
 * Picks the account a payment moves through: the given one (must belong to
 * the owner and be active) or the Cash account when none is sent. Returns the
 * payment method that matches it (CASH / BANK_TRANSFER).
 */
export async function resolveCompanyPaymentAccount(
  tx: Tx,
  ownerUserId: string,
  accountId: string | null | undefined,
): Promise<{ accountId: string; paymentMethod: "CASH" | "BANK_TRANSFER" }> {
  const id = accountId || (await ensureCashAccountId(tx, ownerUserId));
  const account = await tx.cashAccount.findUnique({
    where: { id },
    select: { userId: true, type: true, archivedAt: true },
  });
  if (!account) throw new CashflowError("Account not found", 404);
  if (account.userId !== ownerUserId) throw new CashflowError("Account does not belong to this user", 403);
  if (account.archivedAt !== null) throw new CashflowError("Account is archived", 409);
  return { accountId: id, paymentMethod: derivePaymentMethodFromAccountType(account.type) };
}

interface PaymentPostInput {
  tx: Tx;
  userId: string;
  paymentId: string;
  accountId: string;
  amount: number;
  date: Date;
  partyName: string;
  recordedById: string;
  notes?: string | null;
}

// Dealer pays the company: money IN.
export async function postCompanyDealerPaymentMovement(input: PaymentPostInput): Promise<void> {
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.COMPANY_DEALER_PAYMENT,
    sourceId: input.paymentId,
    direction: CashMovementDirection.IN,
    category: CashCategory.SALE_RECEIPT,
    amount: input.amount,
    date: input.date,
    partyName: input.partyName,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteCompanyDealerPaymentMovement(tx: Tx, userId: string, paymentId: string): Promise<void> {
  await deleteSourceMovement(tx, userId, CashSourceType.COMPANY_DEALER_PAYMENT, paymentId);
}

// Company pays a supplier: money OUT (label "Payment to supplier").
export async function postCompanySupplierPaymentMovement(input: PaymentPostInput): Promise<void> {
  await upsertSourceMovement({
    tx: input.tx,
    userId: input.userId,
    accountId: input.accountId,
    sourceType: CashSourceType.COMPANY_SUPPLIER_PAYMENT,
    sourceId: input.paymentId,
    direction: CashMovementDirection.OUT,
    category: CashCategory.PAYMENT_TO_DEALER,
    amount: input.amount,
    date: input.date,
    partyName: input.partyName,
    notes: input.notes,
    recordedById: input.recordedById,
  });
}

export async function deleteCompanySupplierPaymentMovements(
  tx: Tx,
  userId: string,
  paymentIds: string[],
): Promise<void> {
  if (paymentIds.length === 0) return;
  await tx.cashMovement.deleteMany({
    where: { userId, sourceType: CashSourceType.COMPANY_SUPPLIER_PAYMENT, sourceId: { in: paymentIds } },
  });
}
