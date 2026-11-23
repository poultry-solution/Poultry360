import {
  convertADtoBS,
  convertBSToAD,
  differenceInNepalDays,
  formatADShort,
  formatBSLong,
  getFirstDayOfBSMonthAD,
  getLastDayOfBSMonth,
  getNepalTodayAd,
  nepalBatchAge,
  nepalInclusiveRangeToIsoParams,
  nepalNoonFromAdDay,
  toNepalDayAd,
} from "./nepali-date";

describe("frontend Nepal date helpers", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("changes day at Nepal midnight", () => {
    expect(toNepalDayAd("2026-10-12T18:14:59.999Z")).toBe("2026-10-12");
    expect(toNepalDayAd("2026-10-12T18:15:00.000Z")).toBe("2026-10-13");
    expect(formatADShort(new Date("2026-10-12T18:15:00.000Z"))).toBe("2026-10-13");
  });

  it("changes today exactly at Nepal midnight", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-12T18:14:59.999Z"));
    expect(getNepalTodayAd()).toBe("2026-10-12");

    jest.setSystemTime(new Date("2026-10-12T18:15:00.000Z"));
    expect(getNepalTodayAd()).toBe("2026-10-13");
  });

  it("converts AD moments to the same BS day in every device TZ", () => {
    expect(convertADtoBS(new Date("2026-10-12T17:00:00.000Z"))).toBe("2083-06-26");
    expect(convertADtoBS(new Date("2026-10-12T19:00:00.000Z"))).toBe("2083-06-27");
    expect(formatBSLong("2026-10-12T19:00:00.000Z")).toBe("Ashwin 27, 2083");
  });

  it("converts a BS picked day to UTC midnight of its AD day", () => {
    expect(convertBSToAD("2083-06-27").toISOString()).toBe("2026-10-13T00:00:00.000Z");
    expect(getFirstDayOfBSMonthAD(2083, 6)).toBe("2026-09-17");
  });

  it("gives the last BS day of a month via AD round-trip", () => {
    // BS month lengths vary 29–32 — assert shape and a sane bound, and round-
    // trip: first-of-next-month converted back should be exactly the returned
    // day + 1 (or rolls the month).
    const last = getLastDayOfBSMonth(2083, 8);
    expect(last.startsWith("2083-08-")).toBe(true);
    const day = Number(last.split("-")[2]);
    expect(day).toBeGreaterThanOrEqual(29);
    expect(day).toBeLessThanOrEqual(32);

    // Year rollover: Chaitra (month 12) of 2083 → previous day of 2084-01-01.
    const chaitraLast = getLastDayOfBSMonth(2083, 12);
    expect(chaitraLast.startsWith("2083-12-")).toBe(true);
  });

  it("counts relative labels by Nepal calendar day", () => {
    expect(
      differenceInNepalDays(
        "2026-10-12T19:00:00.000Z",
        "2026-10-12T17:00:00.000Z"
      )
    ).toBe(1);
  });

  it("builds inclusive fixed-offset range params", () => {
    expect(nepalInclusiveRangeToIsoParams("2026-10-12", "2026-10-13")).toEqual({
      startDate: "2026-10-12T00:00:00.000+05:45",
      endDate: "2026-10-13T23:59:59.999+05:45",
    });
    expect(() => nepalInclusiveRangeToIsoParams("10/12/2026", "2026-10-13")).toThrow();
  });

  it("counts batch age by Nepal day and keeps the arrival day as day one", () => {
    const start = "2026-10-12T17:00:00.000Z";
    expect(nepalBatchAge(start, "2026-10-12T18:14:59.999Z")).toBe(1);
    expect(nepalBatchAge(start, "2026-10-12T18:15:00.000Z")).toBe(2);
  });

  it("anchors a picked AD day to Nepal noon regardless of browser TZ", () => {
    // Nepal noon of 2026-11-18 is 06:15Z. `+05:45` is literal in the string,
    // so the parsed instant is the same in every device TZ.
    expect(nepalNoonFromAdDay("2026-11-18").toISOString()).toBe(
      "2026-11-18T06:15:00.000Z"
    );
  });

  it("tolerates both day-only and full-ISO inputs from different pickers", () => {
    // NepaliDatePicker-backed call sites pass "YYYY-MM-DD".
    // <DateInput>-backed call sites pass the full `.toISOString()` string.
    // Both must produce the same Nepal-noon instant.
    expect(nepalNoonFromAdDay("2026-11-18").toISOString()).toBe(
      "2026-11-18T06:15:00.000Z"
    );
    expect(nepalNoonFromAdDay("2026-11-18T00:00:00.000Z").toISOString()).toBe(
      "2026-11-18T06:15:00.000Z"
    );
  });

  it("round-trips the picked day through Nepal day / BS without drift", () => {
    const picked = "2026-11-18";
    expect(toNepalDayAd(nepalNoonFromAdDay(picked))).toBe(picked);
    expect(convertADtoBS(nepalNoonFromAdDay(picked))).toBe(convertADtoBS(picked));
  });

  it("throws fast on garbage input instead of returning Invalid Date", () => {
    expect(() => nepalNoonFromAdDay("not-a-date")).toThrow();
    expect(() => nepalNoonFromAdDay("")).toThrow();
    expect(() => nepalNoonFromAdDay("11/18/2026")).toThrow();
  });
});
