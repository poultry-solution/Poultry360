import {
  AnalyticsRangeError,
  autoGroupBy,
  bucketize,
  parseAnalyticsRange,
  periodStartOf,
  periodStarts,
  withAllTimeStart,
} from "../../src/services/farmerAnalytics/period";
import { ranInPeriod } from "../../src/services/farmerAnalytics/scope";
import { hensByDay, layingPercent } from "../../src/services/farmerAnalytics/layerStats";

// 2026-10-15 is Ashwin 29, 2083; Ashwin 1 was 2026-09-17 (Thursday).
const now = new Date("2026-10-15T06:00:00.000Z");

describe("parseAnalyticsRange", () => {
  it("is all time up to today when no dates are given", () => {
    const range = parseAnalyticsRange({}, now);
    expect(range.allTime).toBe(true);
    expect(range.endDay).toBe("2026-10-15");
    expect(range.end.toISOString()).toBe("2026-10-15T18:14:59.999Z"); // end of the Nepal day
    const full = withAllTimeStart(range, new Date("2026-04-20T08:00:00.000Z"));
    expect(full.startDay).toBe("2026-04-20");
    expect(full.start.toISOString()).toBe("2026-04-19T18:15:00.000Z"); // Nepal midnight
    expect(full.groupBy).toBe("monthly");
    expect(withAllTimeStart(range, null)).toBe(range);
  });

  it("uses the chosen dates as Nepal days", () => {
    const range = parseAnalyticsRange({ startDate: "2026-09-17", endDate: "2026-10-15" }, now);
    expect(range.allTime).toBe(false);
    expect(range.start.toISOString()).toBe("2026-09-16T18:15:00.000Z");
    expect(range.groupBy).toBe("daily");
  });

  it("refuses a start after the end, and bad dates", () => {
    expect(() => parseAnalyticsRange({ startDate: "2026-10-10", endDate: "2026-10-01" }, now)).toThrow(AnalyticsRangeError);
    expect(() => parseAnalyticsRange({ startDate: "10/01/2026" }, now)).toThrow(AnalyticsRangeError);
  });

  it("picks grouping from the range length unless asked", () => {
    expect(autoGroupBy("2026-09-17", "2026-10-15")).toBe("daily");
    expect(autoGroupBy("2026-07-17", "2026-10-15")).toBe("weekly");
    expect(autoGroupBy("2026-04-14", "2026-10-15")).toBe("monthly");
    expect(parseAnalyticsRange({ groupBy: "monthly" }, now).groupBy).toBe("monthly");
  });
});

describe("periods", () => {
  it("starts weeks on Sunday and months on the BS month's first day", () => {
    expect(periodStartOf("2026-10-15", "weekly")).toBe("2026-10-11"); // Thursday → Sunday
    expect(periodStartOf("2026-10-11", "weekly")).toBe("2026-10-11");
    expect(periodStartOf("2026-10-15", "monthly")).toBe("2026-09-17"); // Ashwin 1
    expect(periodStartOf("2026-09-16", "monthly")).toBe("2026-08-17"); // Bhadra 1
  });

  it("lists every period, including empty ones, in date order", () => {
    expect(periodStarts({ startDay: "2026-08-20", endDay: "2026-10-15", groupBy: "monthly" })).toEqual([
      "2026-08-17",
      "2026-09-17",
    ]);
    const days = periodStarts({ startDay: "2026-09-28", endDay: "2026-10-02", groupBy: "daily" });
    expect(days).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
  });

  it("puts a sale at 23:00 UTC on the next Nepal day and fills empty days with 0", () => {
    const rows = bucketize({ startDay: "2026-10-01", endDay: "2026-10-03", groupBy: "daily" }, ["sales"] as const, [
      { date: new Date("2026-10-01T23:00:00.000Z"), sales: 500 }, // 4:45 am Oct 2 in Nepal
      { date: new Date("2026-10-01T06:00:00.000Z"), sales: 100 },
      { date: new Date("2026-12-01T06:00:00.000Z"), sales: 999 }, // outside the range
    ]);
    expect(rows).toEqual([
      { start: "2026-10-01", sales: 100 },
      { start: "2026-10-02", sales: 500 },
      { start: "2026-10-03", sales: 0 },
    ]);
  });
});

describe("ranInPeriod", () => {
  const range = parseAnalyticsRange({ startDate: "2026-10-01", endDate: "2026-10-15" }, now);
  it.each([
    ["running now", new Date("2026-09-01"), null, true],
    ["closed during the period", new Date("2026-08-20"), new Date("2026-10-05"), true],
    ["closed before the period", new Date("2026-07-01"), new Date("2026-09-20"), false],
    ["starts after the period", new Date("2026-10-20"), null, false],
  ])("%s", (_label, startDate, endDate, expected) => {
    expect(ranInPeriod({ startDate, endDate }, range)).toBe(expected);
  });
});

describe("hensByDay", () => {
  it("counts losses from the next morning and ignores days before the batch", () => {
    const hens = hensByDay(
      { startDate: new Date("2026-10-01T00:00:00.000Z"), initialChicks: 1000 },
      [
        { date: new Date("2026-10-02T06:00:00.000Z"), count: 100 },
        { date: new Date("2026-10-03T06:00:00.000Z"), count: 50 },
      ],
      "2026-09-29",
      "2026-10-04"
    );
    expect([...hens.entries()]).toEqual([
      ["2026-10-01", 1000],
      ["2026-10-02", 1000],
      ["2026-10-03", 900],
      ["2026-10-04", 850],
    ]);
    expect(layingPercent(765, 900)).toBe(85);
    expect(layingPercent(10, 0)).toBeNull();
  });
});
