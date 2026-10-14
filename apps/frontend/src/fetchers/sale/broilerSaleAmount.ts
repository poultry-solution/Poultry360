/**
 * Broiler (Chicken_Meat) sale bill, mirrored from the backend
 * (apps/backend/src/utils/broilerSaleAmount.ts). The server re-works the total
 * on save; keep the rounding identical so the form shows the saved amount.
 */

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeBroilerSaleAmount(
  weight: number,
  ratePerKg: number,
  discountPercent: number | null | undefined
): { billedWeight: number; amount: number } {
  const billedWeight = discountPercent ? round2(weight * (1 - discountPercent / 100)) : round2(weight);
  return { billedWeight, amount: round2(billedWeight * ratePerKg) };
}

/** Parsed % from a form field, or null when off, empty or out of range. */
export function parseWeightDiscountPercent(enabled: boolean, value: string): number | null {
  if (!enabled) return null;
  const percent = Number(value);
  return Number.isFinite(percent) && percent > 0 && percent < 100 ? percent : null;
}

export type BillDiscountType = "FLAT" | "PERCENT";

export interface BillDiscountPreview {
  subtotal: number;
  discountAmount: number;
  /** Final amount the customer pays. */
  amount: number;
  /** Discount to send to the server, or null when none. */
  discount: { type: BillDiscountType; value: number } | null;
  /** Message when the discount value is not allowed. */
  error: "percentRange" | "flatRange" | null;
}

/**
 * Bill discount on a farmer sale, mirrored from the backend
 * (apps/backend/src/utils/discountHelpers.ts `applyBillDiscount`). Applied after
 * any weight discount. Empty or 0 means no discount.
 */
export function previewBillDiscount(
  rawSubtotal: number,
  type: BillDiscountType,
  rawValue: string
): BillDiscountPreview {
  const subtotal = round2(rawSubtotal);
  const value = Number(rawValue);
  if (!rawValue.trim() || !Number.isFinite(value) || value <= 0) {
    return { subtotal, discountAmount: 0, amount: subtotal, discount: null, error: null };
  }
  if (type === "PERCENT" && value >= 100) {
    return { subtotal, discountAmount: 0, amount: subtotal, discount: null, error: "percentRange" };
  }
  if (type === "FLAT" && value >= subtotal) {
    return { subtotal, discountAmount: 0, amount: subtotal, discount: null, error: "flatRange" };
  }
  const discountAmount = type === "PERCENT" ? round2(subtotal * (value / 100)) : value;
  return {
    subtotal,
    discountAmount,
    amount: round2(subtotal - discountAmount),
    discount: { type, value },
    error: null,
  };
}
