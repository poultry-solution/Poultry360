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

const BS_MONTH_NAMES = [
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
