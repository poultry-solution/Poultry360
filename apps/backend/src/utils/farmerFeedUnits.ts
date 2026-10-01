export const DEFAULT_FEED_BAG_KG = 50;
export const DEFAULT_FARMER_FEED_UNIT = "kg";

function normalizedUnit(unit: string | null | undefined): string {
  return (unit || "").trim().toLowerCase();
}

export function isKilogramFeedUnit(unit: string | null | undefined): boolean {
  return ["kg", "kgs", "kilogram", "kilograms"].includes(normalizedUnit(unit));
}

export function isBagFeedUnit(unit: string | null | undefined): boolean {
  return normalizedUnit(unit) === "bag";
}

/** Units allowed for new Farmer feed stock. Existing legacy units remain readable. */
export function isSupportedFarmerFeedUnit(
  unit: string | null | undefined,
): boolean {
  const value = normalizedUnit(unit);
  return value === "kg" || value === "bag";
}

/** Keep the old API default so older clients can omit the unit safely. */
export function resolveNewFarmerFeedUnit(
  unit: string | null | undefined,
): string {
  return unit?.trim() || DEFAULT_FARMER_FEED_UNIT;
}

/**
 * Resolve one stock unit to kilograms.
 *
 * A saved item value always wins. This keeps each Bag item dynamic (for example,
 * one item can be 50 kg per Bag and another can be 10 kg per Bag). New or old
 * Bag items without a saved value safely default to 50 kg. Legacy units are only
 * accepted when they already have an explicit saved conversion.
 */
export function resolveFeedKgPerUnit(
  item: { unit?: string | null; kgPerUnit?: unknown },
  enteredKgPerUnit?: unknown,
): number | null {
  if (isKilogramFeedUnit(item.unit)) return 1;

  const savedOrEntered = Number(item.kgPerUnit ?? enteredKgPerUnit);
  if (Number.isFinite(savedOrEntered) && savedOrEntered > 0) {
    return savedOrEntered;
  }

  if (isBagFeedUnit(item.unit)) return DEFAULT_FEED_BAG_KG;
  return null;
}
