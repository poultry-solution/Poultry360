import {
  convertADtoBS,
  convertBSToAD,
  differenceInNepalDays,
  formatADShort,
  formatBSLong,
  getFirstDayOfBSMonthAD,
  getNepalTodayAd,
  nepalBatchAge,
  nepalInclusiveRangeToIsoParams,
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
});
