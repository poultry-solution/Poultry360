/**
 * Centralized Nepali (Bikram Sambat / BS) date conversion utilities.
 * Uses nepali-date-converter with Nepal timezone (UTC+5:45) for consistent conversions.
 *
 * All stored and transmitted dates are AD (Gregorian).
 * Display is converted using Nepal-local calendar rules.
 */

import NepaliDate from "nepali-date-converter";

export type CalendarType = "AD" | "BS";

export const NEPAL_TIME_ZONE = "Asia/Kathmandu";

const nepalAdDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: NEPAL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const BS_MONTH_NAMES = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
] as const;

/**
 * Get BS year and month (1–12) from an AD date.
 * For string input, parses as Nepal calendar day (UTC date) so picker round-trip is correct in any timezone.
 */
export function getBSYearMonthFromAD(adDate: Date | string): { year: number; month: number } {
  const bsStr = convertADtoBS(adDate);
  const [year, month] = bsStr.split("-").map(Number);
  return { year, month };
}

/** Format a Date as YYYY-MM-DD using Nepal calendar day (so picker round-trip is correct in any timezone). */
function formatADShortNepal(date: Date): string {
  if (isNaN(date.getTime())) return "";
  const parts = nepalAdDateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : "";
}

/** The Nepal calendar day (AD YYYY-MM-DD) a moment falls on, whatever the device time zone is. */
export function toNepalDayAd(value: Date | string): string {
  return formatADShortNepal(typeof value === "string" ? new Date(value) : value);
}

/** Today's date in Nepal as AD YYYY-MM-DD, whatever the device time zone is. */
export function getNepalTodayAd(): string {
  return formatADShortNepal(new Date());
}

/**
 * Stable UTC instant anchored to Nepal noon of the given AD calendar day.
 * The `+05:45` offset is literal in the string so the result is the same
 * `Date` in every browser TZ.
 *
 * Accepts either a `"YYYY-MM-DD"` day key (from `NepaliDatePicker`) or a
 * full ISO like `"YYYY-MM-DDTHH:mm:ss.sssZ"` (from `<DateInput>`). Only the
 * first 10 chars are used — the time component of an ISO input is ignored.
 * Throws if the leading 10 chars are not `YYYY-MM-DD`.
 *
 * Use this when posting a day-only field. Never build the `Date` with a
 * bare `"YYYY-MM-DDTHH:MM:SS"` — that parses in browser-local time and
 * silently stores wrong-day values for any user not on Nepal time.
 */
export function nepalNoonFromAdDay(ad: string): Date {
  const day = ad.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error(
      `nepalNoonFromAdDay: expected "YYYY-MM-DD" or ISO prefix, got "${ad}"`
    );
  }
  return new Date(`${day}T12:00:00+05:45`);
}

/** Whole Nepal calendar days from `earlier` to `later`. */
export function differenceInNepalDays(
  later: Date | string,
  earlier: Date | string
): number {
  const dayNumber = (value: Date | string) => {
    const day = toNepalDayAd(value);
    return Math.floor(Date.parse(`${day}T00:00:00.000Z`) / 86_400_000);
  };
  return dayNumber(later) - dayNumber(earlier);
}

/**
 * Get the first day of a BS month as AD date string (YYYY-MM-DD).
 * Uses the converter's AD parts directly so the stored date cannot shift to the prior day.
 */
export function getFirstDayOfBSMonthAD(bsYear: number, bsMonth: number): string {
  const ad = new NepaliDate(bsYear, bsMonth - 1, 1).getAD();
  return `${ad.year}-${String(ad.month + 1).padStart(2, "0")}-${String(ad.date).padStart(2, "0")}`;
}

/**
 * Last BS day of a BS month as "YYYY-MM-DD".
 *
 * Computed as (day 1 of next BS month) − 1 day via the AD round-trip so it
 * stays correct across the uneven BS month lengths.
 */
export function getLastDayOfBSMonth(bsYear: number, bsMonth: number): string {
  const nextMonth = bsMonth === 12 ? 1 : bsMonth + 1;
  const nextYear = bsMonth === 12 ? bsYear + 1 : bsYear;
  const nextMonthFirstAd = new NepaliDate(nextYear, nextMonth - 1, 1).toJsDate();
  nextMonthFirstAd.setUTCDate(nextMonthFirstAd.getUTCDate() - 1);
  const bs = new NepaliDate(nextMonthFirstAd);
  const y = bs.getYear();
  const m = String(bs.getMonth() + 1).padStart(2, "0");
  const d = String(bs.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format AD Date to YYYY-MM-DD using local date (avoids toISOString UTC edge cases).
 */
export function formatADShort(date: Date | string): string {
  return toNepalDayAd(date);
}

/**
 * Convert AD date to BS format (YYYY-MM-DD).
 * For string input, parses as local date to avoid UTC-midnight edge cases.
 */
export function convertADtoBS(adDate: Date | string): string {
  const dayKey = toNepalDayAd(adDate);
  const [adYear, adMonth, adDay] = dayKey.split("-").map(Number);
  if (!dayKey || !adYear || !adMonth || !adDay) {
    throw new Error("Invalid AD date: invalid or unparseable date");
  }
  // Local noon keeps the chosen AD calendar day stable in every device TZ.
  const nepaliDate = new NepaliDate(new Date(adYear, adMonth - 1, adDay, 12));
  const year = nepaliDate.getYear();
  const month = nepaliDate.getMonth() + 1;
  const day = nepaliDate.getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Convert BS date string (YYYY-MM-DD) to AD Date.
 */
export function convertBSToAD(bsDateString: string): Date {
  const [year, month, day] = bsDateString.split("-").map(Number);
  if (!validateBSDate(year, month, day)) {
    throw new Error("Invalid BS date");
  }
  const nepaliDate = new NepaliDate(year, month - 1, day);
  const ad = nepaliDate.getAD();
  return new Date(Date.UTC(ad.year, ad.month, ad.date));
}

export function validateBSDate(
  year: number,
  month: number,
  day: number
): boolean {
  try {
    new NepaliDate(year, month - 1, day);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format start date as BS month + year only (e.g. "Magh 2082") for staff start month display.
 */
export function formatBSMonthYear(adDate: Date | string): string {
  try {
    const { year, month } = getBSYearMonthFromAD(adDate);
    return `${BS_MONTH_NAMES[month - 1]} ${year}`;
  } catch {
    return typeof adDate === "string" ? adDate.split("T")[0] ?? "" : "";
  }
}

/**
 * Format BS date in long form (e.g. "Baisakh 1, 2081").
 */
export function formatBSLong(adDate: Date | string): string {
  const [year, month, day] = convertADtoBS(adDate).split("-").map(Number);
  return `${BS_MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

/**
 * Get BS month name and day for use in batch names (e.g. "Mangsir-20").
 * Uses local date parsing so the correct BS day is used.
 */
export function getBSMonthDayForDisplay(adDate: Date | string): string {
  const long = formatBSLong(adDate);
  return long.replace(/\s(\d+), \d+$/, "-$1");
}

const AD_YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Inclusive Nepal calendar-day bounds as ISO-8601 with fixed +05:45 offset (no DST).
 * Use AD YYYY-MM-DD from the BS picker `adDate` string — do not use Date.toISOString() for day edges.
 */
export function nepalInclusiveRangeToIsoParams(
  startAdYmd: string,
  endAdYmd: string
): { startDate: string; endDate: string } {
  const start = startAdYmd.trim();
  const end = endAdYmd.trim();
  if (!AD_YMD.test(start) || !AD_YMD.test(end)) {
    throw new Error("Invalid AD date format (expected YYYY-MM-DD)");
  }
  return {
    startDate: `${start}T00:00:00.000+05:45`,
    endDate: `${end}T23:59:59.999+05:45`,
  };
}

/**
 * Batch age in Nepal calendar days: the arrival day is Day 1 and the day changes
 * at Nepal midnight. Pass the end date for a closed batch.
 */
export function nepalBatchAge(startDate: Date | string, endDate?: Date | string | null): number {
  const dayNum = (ad: string) => Math.floor(Date.parse(`${ad}T00:00:00Z`) / 86_400_000);
  const end = endDate ? toNepalDayAd(endDate) : getNepalTodayAd();
  return Math.max(1, dayNum(end) - dayNum(toNepalDayAd(startDate)) + 1);
}
