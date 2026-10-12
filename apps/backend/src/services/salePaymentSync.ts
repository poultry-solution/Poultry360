/**
 * Keeps a farmer sale's payment rows equal to its paidAmount when a sale is
 * edited.
 *
 * A sale has one "Initial payment" row (money taken when the sale was made)
 * and may have later payments added from the batch page. Editing a sale can
 * change what was paid (a new total on a cash sale, a corrected paid amount on
 * a credit sale). Only the initial payment is adjusted; later payments are
 * real receipts with their own customer records and are never changed here.
 */

import type { Prisma } from "@prisma/client";

export const INITIAL_PAYMENT_DESCRIPTION = "Initial payment";

type PaymentRow = { id: string; amount: unknown; description: string | null; createdAt: Date };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function findInitialPayment<T extends PaymentRow>(payments: T[]): T | undefined {
  return [...payments]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .find((p) => p.description === INITIAL_PAYMENT_DESCRIPTION);
}

/** Total of payments other than the initial one. */
export function laterPaymentsTotal(payments: PaymentRow[]): number {
  const initial = findInitialPayment(payments);
  return round2(
    payments.filter((p) => p !== initial).reduce((sum, p) => sum + Number(p.amount), 0)
  );
}

export type InitialPaymentPlan =
  | { action: "none" }
  | { action: "create"; amount: number }
  | { action: "update"; id: string; amount: number }
  | { action: "delete"; id: string };

/**
 * What to do with the initial payment so all payments add up to `targetPaid`.
 * Callers must first check `targetPaid >= laterPaymentsTotal(payments)`.
 */
export function planInitialPayment(payments: PaymentRow[], targetPaid: number): InitialPaymentPlan {
  const initial = findInitialPayment(payments);
  const newInitialAmount = round2(targetPaid - laterPaymentsTotal(payments));
  const currentInitialAmount = initial ? round2(Number(initial.amount)) : 0;

  if (newInitialAmount === currentInitialAmount) return { action: "none" };
  if (!initial) return newInitialAmount > 0 ? { action: "create", amount: newInitialAmount } : { action: "none" };
  if (newInitialAmount <= 0) return { action: "delete", id: initial.id };
  return { action: "update", id: initial.id, amount: newInitialAmount };
}

/** Apply the plan, and keep the initial payment dated on the sale date. */
export async function syncInitialPayment(
  tx: Prisma.TransactionClient,
  saleId: string,
  targetPaid: number,
  saleDate: Date
): Promise<void> {
  const payments = await tx.salePayment.findMany({ where: { saleId } });
  const plan = planInitialPayment(payments, targetPaid);

  if (plan.action === "create") {
    await tx.salePayment.create({
      data: { saleId, amount: plan.amount, date: saleDate, description: INITIAL_PAYMENT_DESCRIPTION },
    });
  } else if (plan.action === "update") {
    await tx.salePayment.update({ where: { id: plan.id }, data: { amount: plan.amount, date: saleDate } });
  } else if (plan.action === "delete") {
    await tx.salePayment.delete({ where: { id: plan.id } });
  } else {
    const initial = findInitialPayment(payments);
    if (initial) {
      await tx.salePayment.update({ where: { id: initial.id }, data: { date: saleDate } });
    }
  }
}
