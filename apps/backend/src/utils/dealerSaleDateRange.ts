/**
 * Parse optional Nepal-inclusive date range for DealerSale filtering.
 * Expects ISO strings with explicit offset (e.g. +05:45) from the client.
 * If either startDate or endDate is present, both are required and start <= end.
 */
export type DealerSaleDateRange =
  | { ok: true; range: { gte: Date; lte: Date } | null }
  | { ok: false; message: string };

export function parseDealerSaleDateRange(
  startDate: unknown,
  endDate: unknown
): DealerSaleDateRange {
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

  const gte = new Date(s);
  const lte = new Date(e);

  if (Number.isNaN(gte.getTime()) || Number.isNaN(lte.getTime())) {
    return { ok: false, message: "Invalid startDate or endDate" };
  }

  if (gte > lte) {
    return {
      ok: false,
      message: "startDate must be before or equal to endDate",
    };
  }

  return { ok: true, range: { gte, lte } };
}
