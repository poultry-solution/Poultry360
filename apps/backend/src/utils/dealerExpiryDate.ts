export const NO_EXPIRY_KEY = "NO_EXPIRY";

function dateKeyParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function todayDealerDateKey(date = new Date()): string {
  return dateKeyParts(date, process.env.BUSINESS_TIME_ZONE || "Asia/Kathmandu");
}

/** Normalize a date-only value and keep its calendar day stable across time zones. */
export function parseDealerExpiryDate(value: unknown): {
  expiryDate: Date | null;
  expiryDateKey: string;
} {
  if (value === undefined || value === null || value === "") {
    return { expiryDate: null, expiryDateKey: NO_EXPIRY_KEY };
  }

  const raw = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) {
    throw new Error("Expiry date must be a valid date");
  }

  const [, year, month, day] = match;
  const expiryDateKey = `${year}-${month}-${day}`;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) {
    throw new Error("Expiry date must be a valid date");
  }

  return { expiryDate: parsed, expiryDateKey };
}
