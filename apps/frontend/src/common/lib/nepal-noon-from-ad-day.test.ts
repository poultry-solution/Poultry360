import { nepalNoonFromAdDay, toNepalDayAd } from "./nepali-date";

describe("nepalNoonFromAdDay", () => {
  it("stores a picked Nepal day at Nepal noon, even for the US-Pacific regression case", () => {
    const date = nepalNoonFromAdDay("2026-11-18");

    // 06:15 UTC is 12:00 in Nepal. A browser-local "T12:00:00" in US
    // Pacific would incorrectly produce 20:00 UTC and show as 19 Nov in Nepal.
    expect(date.toISOString()).toBe("2026-11-18T06:15:00.000Z");
    expect(toNepalDayAd(date)).toBe("2026-11-18");
  });

  it("accepts the ISO value returned by DateInput without changing its Nepal day", () => {
    const date = nepalNoonFromAdDay("2026-11-18T00:00:00.000Z");

    expect(date.toISOString()).toBe("2026-11-18T06:15:00.000Z");
    expect(toNepalDayAd(date)).toBe("2026-11-18");
  });
});
