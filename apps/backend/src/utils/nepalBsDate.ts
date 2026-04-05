/**
 * Nepal (BS) business-date helpers for the server side.
 *
 * Nepal timezone is UTC+5:45. All "today" and "yesterday" determinations
 * are made against Nepal wall-clock time, matching the frontend
 * nepali-date.ts implementation so the BS date users see in UI equals
 * the bsDate stored in DB rows.
 */

import NepaliDate from "nepali-date-converter";

/** Nepal timezone offset in milliseconds (5 hours 45 minutes). */
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

/**
 * Get the current Nepal wall-clock Date (UTC shifted by +5:45).
 */
export function getNepaliNow(): Date {
  return new Date(Date.now() + NEPAL_OFFSET_MS);
}

/**
 * Get today's BS date as a "YYYY-MM-DD" string, using Nepal wall clock.
 * This is the authoritative source of "today" on the server.
 */
export function getNepalBsTodayString(): string {
  const nepaliNow = getNepaliNow();
  const nd = new NepaliDate(nepaliNow);
  const y = nd.getYear();
  const m = String(nd.getMonth() + 1).padStart(2, "0");
  const d = String(nd.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse a BS date string "YYYY-MM-DD" into { year, month, day }.
 */
function parseBsString(bs: string): { year: number; month: number; day: number } {
  const [y, m, d] = bs.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Invalid BS date string: ${bs}`);
  return { year: y, month: m, day: d };
}

/**
 * Return the previous BS calendar day as a "YYYY-MM-DD" string.
 * Converts BS → JS Date (AD) via nepali-date-converter, subtracts 1 day, then converts back.
 */
export function prevBsDate(bs: string): string {
  const { year, month, day } = parseBsString(bs);
  // NepaliDate uses 0-based month
  const nd = new NepaliDate(year, month - 1, day);
  const adDate = nd.toJsDate();
  // Subtract 1 day
  adDate.setUTCDate(adDate.getUTCDate() - 1);
  const prev = new NepaliDate(adDate);
  const py = prev.getYear();
  const pm = String(prev.getMonth() + 1).padStart(2, "0");
  const pd = String(prev.getDate()).padStart(2, "0");
  return `${py}-${pm}-${pd}`;
}

/**
 * Returns true if bsDate1 is strictly before bsDate2.
 * Simple lexicographic comparison works for YYYY-MM-DD strings.
 */
export function bsDateBefore(bsDate1: string, bsDate2: string): boolean {
  return bsDate1 < bsDate2;
}
