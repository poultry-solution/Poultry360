/**
 * Parse optional Nepal-inclusive date range for dealer filtering.
 * Date-only inputs are treated as Nepal calendar days and expanded to full-day
 * inclusive bounds in Asia/Kathmandu.
 *
 * If either startDate or endDate is present, both are required and start <= end.
 */
export type DealerSaleDateRange =
  | { ok: true; range: { gte: Date; lte: Date } | null }
  | { ok: false; message: string };

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDatePart(value: string): boolean {
  if (!DATE_ONLY_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function normalizeDatePart(value: unknown): string {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  return raw.includes("T") ? raw.split("T")[0] : raw;
}

function buildNepalBoundaryDate(datePart: string, boundary: "start" | "end"): Date {
  const suffix =
    boundary === "start" ? "00:00:00.000+05:45" : "23:59:59.999+05:45";
  return new Date(`${datePart}T${suffix}`);
}

/**
 * Start (00:00) or end (23:59:59.999) of one Nepal day, from "YYYY-MM-DD"
 * (an ISO string is cut to its date). Null when empty; throws when malformed.
 */
export function parseNepalBoundary(value: unknown, boundary: "start" | "end"): Date | null {
  const datePart = normalizeDatePart(value);
  if (!datePart) return null;

  if (!isValidDatePart(datePart)) {
    throw new Error("Invalid date format (expected YYYY-MM-DD)");
  }

  return buildNepalBoundaryDate(datePart, boundary);
}

/**
 * Internal fallback helper. Returns a Date for valid input, null for both
 * empty input AND malformed input.
 *
 * ⚠️  NEVER use for request filters.
 *
 * Silently collapsing empty-vs-malformed means a bad `startDate` with a valid
 * `endDate` widens the Prisma filter to all-time rows. For list/filter endpoints
 * use {@link parseNepalRange} instead — it returns `{ok:false}` on malformed
 * input so the controller can respond 400.
 *
 * Intended only for internal helpers (e.g. hatchery analytics default windows)
 * that need to tell "empty" from "malformed" themselves before deciding whether
 * to fall back or 400.
 */
export function parseOptionalNepalBoundary(
  value: unknown,
  boundary: "start" | "end"
): Date | null {
  try {
    return parseNepalBoundary(value, boundary);
  } catch {
    return null;
  }
}

export type NepalRangeResult =
  | { ok: true; filter: { gte?: Date; lte?: Date } }
  | { ok: false; message: string };

/**
 * Parse optional startDate/endDate pair into a Prisma date filter. Returns
 * `ok:false` with a message when either value is non-empty but malformed, so
 * the controller can respond 400 rather than silently drop the bad bound.
 */
export function parseNepalRange(
  startDate: unknown,
  endDate: unknown
): NepalRangeResult {
  try {
    const gte = parseNepalBoundary(startDate, "start");
    const lte = parseNepalBoundary(endDate, "end");
    if (gte && lte && gte > lte) {
      return { ok: false, message: "startDate must be before or equal to endDate" };
    }
    const filter: { gte?: Date; lte?: Date } = {};
    if (gte) filter.gte = gte;
    if (lte) filter.lte = lte;
    return { ok: true, filter };
  } catch {
    return { ok: false, message: "Invalid startDate or endDate (expected YYYY-MM-DD)" };
  }
}

export function parseDealerDateRange(
  startDate: unknown,
  endDate: unknown
): DealerSaleDateRange {
  try {
    const s =
      startDate != null && String(startDate).trim() !== ""
        ? String(startDate).trim()
        : "";
    const e =
      endDate != null && String(endDate).trim() !== ""
        ? String(endDate).trim()
        : "";

    if (!s && !e) {
      return { ok: true, range: null };
    }

    if (!s || !e) {
      return {
        ok: false,
        message:
          "Both startDate and endDate are required when filtering by date range",
      };
    }

    const gte = parseNepalBoundary(s, "start");
    const lte = parseNepalBoundary(e, "end");

    if (!gte || !lte) {
      return { ok: false, message: "Invalid startDate or endDate" };
    }

    if (gte > lte) {
      return {
        ok: false,
        message: "startDate must be before or equal to endDate",
      };
    }

    return { ok: true, range: { gte, lte } };
  } catch {
    return { ok: false, message: "Invalid startDate or endDate" };
  }
}

export function parseDealerSaleDateRange(
  startDate: unknown,
  endDate: unknown
): DealerSaleDateRange {
  return parseDealerDateRange(startDate, endDate);
}
