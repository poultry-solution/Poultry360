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

function parseNepalBoundary(value: unknown, boundary: "start" | "end"): Date | null {
  const datePart = normalizeDatePart(value);
  if (!datePart) return null;

  if (!DATE_ONLY_RE.test(datePart)) {
    throw new Error("Invalid date format (expected YYYY-MM-DD)");
  }

  return buildNepalBoundaryDate(datePart, boundary);
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
