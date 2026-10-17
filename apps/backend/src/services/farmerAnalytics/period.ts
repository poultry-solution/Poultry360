import { parseNepalBoundary } from "../../utils/dealerSaleDateRange";
import {
  bsMonthOfDayKey,
  bsMonthStartDayKey,
  getNepalBsMonthWindow,
  toNepalDayKey,
} from "../../utils/nepalBsDate";

/**
 * Analytics periods in Nepal days. Days are AD Nepal calendar days ("YYYY-MM-DD");
 * weeks run Sunday to Saturday; months are Nepali (BS) months.
 */

export type GroupBy = "daily" | "weekly" | "monthly";

export interface AnalyticsRange {
  start: Date;
  end: Date;
  startDay: string;
  endDay: string;
  groupBy: GroupBy;
  /** No dates chosen: everything up to today (start is set from the first record). */
  allTime: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const dayNumber = (dayKey: string) => Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / DAY_MS);
export const dayKeyFromNumber = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);
export const nepalDayOf = (date: Date) => toNepalDayKey(date);

export class AnalyticsRangeError extends Error {}

function one(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Auto grouping: up to 31 days daily, up to ~4 months weekly, longer monthly. */
export function autoGroupBy(startDay: string, endDay: string): GroupBy {
  const days = dayNumber(endDay) - dayNumber(startDay) + 1;
  if (days <= 31) return "daily";
  if (days <= 124) return "weekly";
  return "monthly";
}

/**
 * Reads startDate / endDate ("YYYY-MM-DD", Nepal days) and groupBy from the query.
 * With no dates the range is "all time" up to today; call `withAllTimeStart`
 * once the first record date is known. Grouping is automatic unless asked.
 */
export function parseAnalyticsRange(query: Record<string, unknown>, now = new Date()): AnalyticsRange {
  let start: Date | null;
  let end: Date | null;
  try {
    start = parseNepalBoundary(one(query.startDate), "start");
    end = parseNepalBoundary(one(query.endDate), "end");
  } catch {
    throw new AnalyticsRangeError("Dates must be YYYY-MM-DD");
  }
  const allTime = !start && !end;
  if (!start) start = allTime ? parseNepalBoundary(toNepalDayKey(now), "start")! : getNepalBsMonthWindow(now).currentStart;
  if (!end) end = parseNepalBoundary(toNepalDayKey(now), "end")!;
  if (start.getTime() > end.getTime()) {
    throw new AnalyticsRangeError("Start date must be before end date");
  }
  const startDay = toNepalDayKey(start);
  const endDay = toNepalDayKey(end);
  const raw = one(query.groupBy);
  const groupBy: GroupBy =
    raw === "daily" || raw === "weekly" || raw === "monthly" ? raw : autoGroupBy(startDay, endDay);
  return { start, end, startDay, endDay, groupBy, allTime };
}

/** Sets the start of an "all time" range to the first record's Nepal day. */
export function withAllTimeStart(range: AnalyticsRange, first: Date | null): AnalyticsRange {
  if (!range.allTime || !first || first.getTime() >= range.start.getTime()) return range;
  const start = parseNepalBoundary(toNepalDayKey(first), "start")!;
  const startDay = toNepalDayKey(start);
  return { ...range, start, startDay, groupBy: autoGroupBy(startDay, range.endDay) };
}

/** Start day (AD Nepal "YYYY-MM-DD") of the period a Nepal day falls in. */
export function periodStartOf(dayKey: string, groupBy: GroupBy): string {
  if (groupBy === "daily") return dayKey;
  if (groupBy === "weekly") {
    const n = dayNumber(dayKey);
    const weekday = new Date(n * DAY_MS).getUTCDay(); // 0 = Sunday
    return dayKeyFromNumber(n - weekday);
  }
  const bs = bsMonthOfDayKey(dayKey);
  return bsMonthStartDayKey(bs.year, bs.month);
}

/** Every period start between two Nepal days, in order (so empty periods show as 0). */
export function periodStarts(range: Pick<AnalyticsRange, "startDay" | "endDay" | "groupBy">): string[] {
  const starts: string[] = [];
  const last = dayNumber(range.endDay);
  let current = periodStartOf(range.startDay, range.groupBy);
  while (dayNumber(current) <= last) {
    starts.push(current);
    if (range.groupBy === "daily") current = dayKeyFromNumber(dayNumber(current) + 1);
    else if (range.groupBy === "weekly") current = dayKeyFromNumber(dayNumber(current) + 7);
    else {
      const bs = bsMonthOfDayKey(current);
      current = bs.month === 12 ? bsMonthStartDayKey(bs.year + 1, 1) : bsMonthStartDayKey(bs.year, bs.month + 1);
    }
  }
  return starts;
}

/**
 * Sums values into periods. `fields` lists the numeric fields; every period in
 * the range is returned (zeros included), sorted by date.
 */
export function bucketize<F extends string>(
  range: Pick<AnalyticsRange, "startDay" | "endDay" | "groupBy">,
  fields: readonly F[],
  rows: Array<{ date: Date } & Partial<Record<F, number>>>
): Array<{ start: string } & Record<F, number>> {
  const map = new Map<string, Record<F, number>>();
  for (const start of periodStarts(range)) {
    map.set(start, Object.fromEntries(fields.map((f) => [f, 0])) as Record<F, number>);
  }
  for (const row of rows) {
    const bucket = map.get(periodStartOf(toNepalDayKey(row.date), range.groupBy));
    if (!bucket) continue;
    for (const f of fields) bucket[f] += Number(row[f] ?? 0);
  }
  return [...map.entries()].map(([start, values]) => ({ start, ...values }));
}

export const round = (value: number, places = 2) => {
  const f = 10 ** places;
  return Math.round(value * f) / f;
};
