import {
  getNepalBsMonthWindow,
  getNepalBsTodayString,
  nepalBatchDay,
  toNepalBsDayString,
  toNepalDayKey,
} from "../../src/utils/nepalBsDate";
import {
  parseDealerDateRange,
  parseNepalBoundary,
  parseNepalRange,
} from "../../src/utils/dealerSaleDateRange";

describe("Nepal date helpers", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("changes day at Nepal midnight, not UTC midnight", () => {
    const beforeNepalMidnight = new Date("2026-10-12T18:14:59.999Z");
    const afterNepalMidnight = new Date("2026-10-12T18:15:00.000Z");

    expect(toNepalDayKey(beforeNepalMidnight)).toBe("2026-10-12");
    expect(toNepalDayKey(afterNepalMidnight)).toBe("2026-10-13");
    expect(toNepalBsDayString(beforeNepalMidnight)).toBe("2083-06-26");
    expect(toNepalBsDayString(afterNepalMidnight)).toBe("2083-06-27");
  });

  it("gets BS today from the real Nepal day in any server TZ", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-12T17:00:00.000Z"));
    expect(getNepalBsTodayString()).toBe("2083-06-26");

    jest.setSystemTime(new Date("2026-10-12T19:00:00.000Z"));
    expect(getNepalBsTodayString()).toBe("2083-06-27");
  });

  it("builds full Nepal day bounds and rejects impossible dates", () => {
    expect(parseNepalBoundary("2026-10-13", "start")?.toISOString()).toBe(
      "2026-10-12T18:15:00.000Z"
    );
    expect(parseNepalBoundary("2026-10-13", "end")?.toISOString()).toBe(
      "2026-10-13T18:14:59.999Z"
    );
    expect(() => parseNepalBoundary("2026-02-30", "start")).toThrow();
    expect(parseDealerDateRange("2026-10-14", "2026-10-13")).toEqual({
      ok: false,
      message: "startDate must be before or equal to endDate",
    });
  });

  it("parses empty and one-sided user ranges without widening bad input", () => {
    expect(parseNepalRange(undefined, undefined)).toEqual({ ok: true, filter: {} });
    expect(parseNepalRange("   ", "")).toEqual({ ok: true, filter: {} });

    const startOnly = parseNepalRange("2026-10-13", undefined);
    expect(startOnly.ok).toBe(true);
    if (startOnly.ok) {
      expect(startOnly.filter.gte?.toISOString()).toBe("2026-10-12T18:15:00.000Z");
      expect(startOnly.filter.lte).toBeUndefined();
    }

    const endOnlyIso = parseNepalRange(
      undefined,
      "2026-10-13T23:59:59.999+05:45"
    );
    expect(endOnlyIso.ok).toBe(true);
    if (endOnlyIso.ok) {
      expect(endOnlyIso.filter.gte).toBeUndefined();
      expect(endOnlyIso.filter.lte?.toISOString()).toBe("2026-10-13T18:14:59.999Z");
    }
  });

  it("rejects malformed, impossible, and inverted user ranges", () => {
    expect(parseNepalRange("not-a-date", "2026-10-13")).toEqual({
      ok: false,
      message: "Invalid startDate or endDate (expected YYYY-MM-DD)",
    });
    expect(parseNepalRange("2026-02-30", "2026-03-01")).toEqual({
      ok: false,
      message: "Invalid startDate or endDate (expected YYYY-MM-DD)",
    });
    expect(parseNepalRange("2026-10-14", "2026-10-13")).toEqual({
      ok: false,
      message: "startDate must be before or equal to endDate",
    });
  });

  it("keeps BS month and batch day math stable at the midnight gap", () => {
    const now = new Date("2026-10-12T19:00:00.000Z");
    const month = getNepalBsMonthWindow(now);
    expect(month.monthLabel).toBe("Ashwin 2083");
    expect(month.daysElapsed).toBe(27);
    expect(month.currentStart.toISOString()).toBe("2026-09-16T18:15:00.000Z");
    expect(nepalBatchDay(new Date("2026-10-12T17:00:00.000Z"), now)).toBe(2);
  });
});
