/**
 * Broiler (Chicken_Meat) sale bill.
 *
 * Buyers commonly take a % off the weighed amount. Only the bill uses the
 * discounted weight; the sale keeps the real weight for FCR and bird weight.
 * The frontend mirrors this in fetchers/sale/broilerSaleAmount.ts — keep the
 * rounding identical so the form total matches the saved total.
 */

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getBilledWeight(weight: number, discountPercent: number | null | undefined): number {
  if (!discountPercent) return round2(weight);
  return round2(weight * (1 - discountPercent / 100));
}

export function computeBroilerSaleAmount(
  weight: number,
  ratePerKg: number,
  discountPercent: number | null | undefined
): { billedWeight: number; amount: number } {
  const billedWeight = getBilledWeight(weight, discountPercent);
  return { billedWeight, amount: round2(billedWeight * ratePerKg) };
}
