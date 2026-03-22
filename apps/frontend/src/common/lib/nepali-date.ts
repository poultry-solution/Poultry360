/**
 * Centralized Nepali (Bikram Sambat / BS) date conversion utilities.
 * Uses nepali-date-converter with Nepal timezone (UTC+5:45) for consistent conversions.
 *
 * All stored and transmitted dates are AD (Gregorian).
 * Display is converted using Nepal-local semantics via NEPAL_OFFSET.
 */

import NepaliDate from "nepali-date-converter";

export type CalendarType = "AD" | "BS";

/** Nepal timezone offset in ms (UTC+5:45 = 5.75 hours) */
const NEPAL_OFFSET = 5.75 * 60 * 60 * 1000;

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
  const dateObj =
    typeof adDate === "string"
      ? (() => {
          const datePart = adDate.includes("T") ? adDate.split("T")[0] : adDate;
          const [y, m, d] = datePart.split("-").map(Number);
          if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date(NaN);
          return new Date(Date.UTC(y, m - 1, d));
        })()
      : adDate;
  const bsStr = convertADtoBS(dateObj);
  const [year, month] = bsStr.split("-").map(Number);
  return { year, month };
}

/** Format a Date as YYYY-MM-DD using Nepal calendar day (so picker round-trip is correct in any timezone). */
function formatADShortNepal(date: Date): string {
  if (isNaN(date.getTime())) return "";
  const inNepal = new Date(date.getTime() + NEPAL_OFFSET);
  const y = inNepal.getUTCFullYear();
  const m = String(inNepal.getUTCMonth() + 1).padStart(2, "0");
  const d = String(inNepal.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get the first day of a BS month as AD date string (YYYY-MM-DD).
 * Uses the library's toJsDate() directly and formats as Nepal calendar day.
 * (convertBSToAD subtracts NEPAL_OFFSET, which made the stored date one day early and showed the previous month in the picker.)
 */
export function getFirstDayOfBSMonthAD(bsYear: number, bsMonth: number): string {
  const nd = new NepaliDate(bsYear, bsMonth - 1, 1);
  const jsDate = nd.toJsDate();
  return formatADShortNepal(jsDate);
}

/**
 * Parse YYYY-MM-DD string as local date to avoid UTC-midnight edge cases.
 * Handles both "YYYY-MM-DD" and ISO strings ("YYYY-MM-DDTHH:mm:ss...").
 * Using noon local time ensures the correct calendar day regardless of timezone.
 */
export function parseDateStringLocal(dateStr: string): Date {
  const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const [year, month, day] = datePart.split("-").map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date(NaN);
  }
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Format AD Date to YYYY-MM-DD using local date (avoids toISOString UTC edge cases).
 */
export function formatADShort(date: Date | string): string {
  const d = typeof date === "string" ? parseDateStringLocal(date) : date;
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Convert AD date to BS format (YYYY-MM-DD).
 * For string input, parses as local date to avoid UTC-midnight edge cases.
 */
export function convertADtoBS(adDate: Date | string): string {
  const dateObj =
    typeof adDate === "string" ? parseDateStringLocal(adDate) : adDate;
  if (isNaN(dateObj.getTime())) {
    throw new Error("Invalid AD date: invalid or unparseable date");
  }
  const adjustedDate = new Date(dateObj.getTime() + NEPAL_OFFSET);
  const nepaliDate = new NepaliDate(adjustedDate);
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
  const jsDate = nepaliDate.toJsDate();
  return new Date(jsDate.getTime() - NEPAL_OFFSET);
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
  const dateObj =
    typeof adDate === "string" ? parseDateStringLocal(adDate) : adDate;
  const adjustedDate = new Date(dateObj.getTime() + NEPAL_OFFSET);
  const nepaliDate = new NepaliDate(adjustedDate);
  const year = nepaliDate.getYear();
  const month = nepaliDate.getMonth() + 1;
  const day = nepaliDate.getDate();
  return `${BS_MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

/**
 * Get BS month name and day for use in batch names (e.g. "Mangsir-20").
 * Uses local date parsing so the correct BS day is used.
 */
export function getBSMonthDayForDisplay(adDate: Date | string): string {
  const dateObj =
    typeof adDate === "string" ? parseDateStringLocal(adDate) : adDate;
  if (isNaN(dateObj.getTime())) return "";
  const long = formatBSLong(dateObj);
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
