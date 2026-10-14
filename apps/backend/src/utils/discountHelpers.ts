/**
 * Helpers for sale discount calculation and distribution.
 * Used for global (SALE-scope) discounts; extensible for item-wise (ITEM-scope) later.
 */

export type DiscountType = "PERCENT" | "FLAT";

/**
 * Compute discount amount from subtotal.
 * PERCENT: value is 0-100; FLAT: value is capped at subtotal.
 */
export function computeDiscountAmount(
  subtotal: number,
  type: DiscountType,
  value: number
): number {
  if (subtotal <= 0 || value <= 0) return 0;
  if (type === "PERCENT") {
    const pct = Math.min(100, Math.max(0, value));
    return Math.round((subtotal * (pct / 100)) * 100) / 100;
  }
  return Math.min(value, subtotal);
}

export interface ItemInput {
  quantity: number;
  unitPrice: number;
}

/**
 * Distribute a discount amount across items proportionally.
 * Returns per-item final amounts (after discount) that sum exactly to (subtotal - discountAmount).
 * Uses rounding to 2 decimals and adjusts the last item to avoid drift.
 */
export function distributeDiscountToItems(
  subtotal: number,
  discountAmount: number,
  items: ItemInput[]
): number[] {
  if (items.length === 0 || subtotal <= 0) return [];
  if (discountAmount <= 0) {
    return items.map((i) => Math.round(i.quantity * i.unitPrice * 100) / 100);
  }
  const targetTotal = Math.round((subtotal - discountAmount) * 100) / 100;
  const itemSubtotals = items.map(
    (i) => Math.round(i.quantity * i.unitPrice * 100) / 100
  );
  const proportions = itemSubtotals.map((s) => s / subtotal);
  const rawFinal = proportions.map((p) =>
    Math.round((p * targetTotal) * 100) / 100
  );
  const sumRaw = rawFinal.reduce((a, b) => a + b, 0);
  const diff = Math.round((targetTotal - sumRaw) * 100) / 100;
  if (diff !== 0 && rawFinal.length > 0) {
    rawFinal[rawFinal.length - 1] =
      Math.round((rawFinal[rawFinal.length - 1] + diff) * 100) / 100;
  }
  return rawFinal;
}

export interface BillDiscountInput {
  type: DiscountType;
  value: number;
}

export interface BillDiscountResult {
  /** Bill before the discount, rounded to paisa. */
  subtotal: number;
  discountAmount: number;
  /** Final amount the customer pays. */
  amount: number;
  /** The discount that was applied, or null when none. */
  discount: BillDiscountInput | null;
}

export class BillDiscountError extends Error {}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Bill-level discount for farmer sales. A missing or zero discount means none.
 * PERCENT must be above 0 and below 100; FLAT must be above 0 and below the
 * subtotal, so the final amount always stays above 0.
 */
export function applyBillDiscount(
  rawSubtotal: number,
  discount: BillDiscountInput | null | undefined
): BillDiscountResult {
  const subtotal = round2(rawSubtotal);
  const value = discount ? Number(discount.value) : 0;
  if (!discount || !Number.isFinite(value) || value <= 0) {
    return { subtotal, discountAmount: 0, amount: subtotal, discount: null };
  }
  if (discount.type === "PERCENT") {
    if (value >= 100) throw new BillDiscountError("Discount percent must be below 100");
  } else if (discount.type === "FLAT") {
    if (value >= subtotal) throw new BillDiscountError("Flat discount must be less than the bill amount");
  } else {
    throw new BillDiscountError("Invalid discount type");
  }
  const discountAmount = computeDiscountAmount(subtotal, discount.type, value);
  return {
    subtotal,
    discountAmount,
    amount: round2(subtotal - discountAmount),
    discount: { type: discount.type, value },
  };
}
