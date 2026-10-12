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
