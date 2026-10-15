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
 * The Nepal calendar day (AD) of a moment, as "YYYY-MM-DD".
 * Use this to compare two dates by day instead of by time.
 */
export function toNepalDayKey(date: Date): string {
  return new Date(date.getTime() + NEPAL_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * The Nepal calendar day of a moment as a BS "YYYY-MM-DD" string.
 * Works the same whatever the server timezone is.
 */
export function toNepalBsDayString(date: Date): string {
  const shifted = new Date(date.getTime() + NEPAL_OFFSET_MS);
  const nd = new NepaliDate(
    new Date(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
  );
  const m = String(nd.getMonth() + 1).padStart(2, "0");
  const d = String(nd.getDate()).padStart(2, "0");
  return `${nd.getYear()}-${m}-${d}`;
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

// ── BS month window (dashboard "this month") ────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const BS_MONTH_NAMES = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

type AdParts = { y: number; m: number; d: number };

/** BS date for an AD calendar day. Built from local noon, so the result does not depend on the server TZ. */
function bsFromAd({ y, m, d }: AdParts) {
  const nd = new NepaliDate(new Date(y, m - 1, d, 12));
  return { year: nd.getYear(), month: nd.getMonth() + 1, day: nd.getDate() };
}

function adFromBs(year: number, month: number, day: number): AdParts {
  const ad = new NepaliDate(year, month - 1, day).getAD();
  return { y: ad.year, m: ad.month + 1, d: ad.date };
}

/** 00:00 Nepal time on an AD calendar day. */
function nepalMidnight({ y, m, d }: AdParts): Date {
  return new Date(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00.000+05:45`);
}

export interface NepalBsMonthWindow {
  /** 00:00 Nepal time on day 1 of the current BS month. */
  currentStart: Date;
  /** Days of the current BS month so far, including today. */
  daysElapsed: number;
  /** 00:00 Nepal time on day 1 of the previous BS month. */
  previousStart: Date;
  /** End (23:59:59.999 Nepal) of the same number of days into the previous month, capped at its last day. */
  previousSameDaysEnd: Date;
  bsYear: number;
  bsMonth: number;
  /** e.g. "Ashwin 2083" */
  monthLabel: string;
}

/** Current and previous BS month boundaries for "this month" figures, in Nepal days. */
export function getNepalBsMonthWindow(now: Date = new Date()): NepalBsMonthWindow {
  const nepal = new Date(now.getTime() + NEPAL_OFFSET_MS);
  const today = bsFromAd({ y: nepal.getUTCFullYear(), m: nepal.getUTCMonth() + 1, d: nepal.getUTCDate() });

  const currentStart = nepalMidnight(adFromBs(today.year, today.month, 1));
  const prevYear = today.month === 1 ? today.year - 1 : today.year;
  const prevMonth = today.month === 1 ? 12 : today.month - 1;
  const previousStart = nepalMidnight(adFromBs(prevYear, prevMonth, 1));
  const previousMonthDays = Math.round((currentStart.getTime() - previousStart.getTime()) / DAY_MS);
  const sameDays = Math.min(today.day, previousMonthDays);

  return {
    currentStart,
    daysElapsed: today.day,
    previousStart,
    previousSameDaysEnd: new Date(previousStart.getTime() + sameDays * DAY_MS - 1),
    bsYear: today.year,
    bsMonth: today.month,
    monthLabel: `${BS_MONTH_NAMES[today.month - 1]} ${today.year}`,
  };
}

// ── BS months for an AD Nepal day (analytics grouping) ──────────────────────

/** BS year and month of an AD Nepal calendar day "YYYY-MM-DD". */
export function bsMonthOfDayKey(dayKey: string): { year: number; month: number } {
  const [y, m, d] = dayKey.split("-").map(Number);
  const bs = bsFromAd({ y, m, d });
  return { year: bs.year, month: bs.month };
}

/** AD Nepal day "YYYY-MM-DD" of day 1 of a BS month. */
export function bsMonthStartDayKey(year: number, month: number): string {
  const { y, m, d } = adFromBs(year, month, 1);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
