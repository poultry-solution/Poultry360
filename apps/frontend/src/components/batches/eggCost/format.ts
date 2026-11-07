import { BS_MONTH_NAMES, formatBSMonthYear, getBSYearMonthFromAD, convertADtoBS } from "@/common/lib/nepali-date";

export const EGGS_PER_TRAY = 30;
export type EggUnit = "egg" | "tray";

const inr = (n: number, digits: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Money for one egg (2 decimals) or one tray of 30 (whole rupees). "—" when unknown. */
export function unitMoney(perEgg: number | null | undefined, unit: EggUnit) {
  if (perEgg == null || !Number.isFinite(perEgg)) return "—";
  const value = unit === "tray" ? perEgg * EGGS_PER_TRAY : perEgg;
  const text = unit === "tray" ? inr(Math.abs(Math.round(value)), 0) : inr(Math.abs(value), 2);
  return `${value < 0 ? "−" : ""}रू ${text}`;
}

/** Signed money for margins: "+रू 3.80" / "−रू 1.14". */
export function signedUnitMoney(perEgg: number | null | undefined, unit: EggUnit) {
  if (perEgg == null) return "—";
  const rounded = unit === "tray" ? Math.round(perEgg * EGGS_PER_TRAY) : Math.round(perEgg * 100) / 100;
  if (rounded === 0) return unitMoney(0, unit);
  return `${rounded > 0 ? "+" : ""}${unitMoney(perEgg, unit)}`;
}

export const rupeesWhole = (value: number) => `रू ${inr(Math.round(Number(value || 0)), 0)}`;
export const count = (value: number | null | undefined) => (value == null ? "—" : Number(value).toLocaleString("en-IN"));
export const percentText = (value: number | null | undefined) => (value == null ? "—" : `${value.toFixed(1)}%`);
export const unitLabel = (unit: EggUnit) => (unit === "tray" ? "per tray" : "per egg");

/** "Kartik 2083" for the BS month that an AD Nepal day falls in. */
export const monthLabel = (dayKey: string) => formatBSMonthYear(dayKey);
/** Short month name only: "Kartik". */
export function monthName(dayKey: string) {
  try {
    return BS_MONTH_NAMES[getBSYearMonthFromAD(dayKey).month - 1];
  } catch {
    return dayKey;
  }
}
/** "Week of Kartik 3" for a week that starts on an AD Nepal day. */
export function weekLabel(dayKey: string) {
  try {
    const [, m, d] = convertADtoBS(dayKey).split("-").map(Number);
    return `Week of ${BS_MONTH_NAMES[m - 1]} ${d}`;
  } catch {
    return dayKey;
  }
}
