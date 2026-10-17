jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {},
}));

import {
  computeAccruedSalary,
  getCurrentRate,
  getFirstDayOfStartBSMonth,
  getStaffTransactions,
} from "../../src/services/staffService";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function staff(overrides: Record<string, unknown> = {}) {
  return {
    id: "staff-1",
    ownerId: "owner-1",
    name: "Test staff",
    payType: "MONTHLY",
    startDate: day("2026-08-01"),
    endDate: day("2026-09-30"),
    status: "STOPPED",
    createdAt: day("2026-08-01"),
    updatedAt: day("2026-08-01"),
    ...overrides,
  } as any;
}

function rate(amount: number, effectiveFrom: Date, createdAt = day("2026-01-01"), id = `rate-${amount}`) {
  return { id, staffId: "staff-1", rate: amount, effectiveFrom, createdAt } as any;
}

function mark(iso: string, status: "ABSENT" | "HALF_DAY") {
  return { id: `att-${iso}`, staffId: "staff-1", date: day(iso), status, createdAt: day(iso), updatedAt: day(iso) } as any;
}

describe("Daily wage staff", () => {
  const daily = staff({ payType: "DAILY", startDate: day("2026-10-01"), endDate: day("2026-10-10") });

  it("earns the daily rate for every day from joining to the last day", () => {
    expect(computeAccruedSalary(daily, [rate(600, day("2026-10-01"))])).toBe(6000);
  });

  it("pays nothing for absent days and half for half days", () => {
    const attendance = [mark("2026-10-03", "ABSENT"), mark("2026-10-04", "HALF_DAY")];
    expect(computeAccruedSalary(daily, [rate(600, day("2026-10-01"))], attendance)).toBe(5100);
  });

  it("uses each day's own rate when the wage changes mid month", () => {
    const rates = [rate(500, day("2026-10-01")), rate(700, day("2026-10-06"))];
    expect(computeAccruedSalary(daily, rates)).toBe(6000);
  });

  it("reports worked, absent and half days per month", () => {
    const attendance = [mark("2026-10-03", "ABSENT"), mark("2026-10-04", "HALF_DAY")];
    const lines = getStaffTransactions(daily, [rate(600, day("2026-10-01"))], [], attendance)
      .filter((tx) => tx.type === "accrual") as any[];
    expect(lines.reduce((sum, l) => sum + l.workedDays, 0)).toBe(8.5);
    expect(lines.reduce((sum, l) => sum + l.absentDays, 0)).toBe(1);
    expect(lines.reduce((sum, l) => sum + l.halfDays, 0)).toBe(1);
  });

  it("ignores attendance for monthly staff", () => {
    const monthly = staff();
    const rates = [rate(30000, getFirstDayOfStartBSMonth(day("2026-08-01")))];
    expect(computeAccruedSalary(monthly, rates, [mark("2026-08-10", "ABSENT")])).toBe(
      computeAccruedSalary(monthly, rates)
    );
  });
});

describe("Salary rate fixes", () => {
  it("pays the first rate for days before it when the joining date moves earlier", () => {
    const movedEarlier = staff({ startDate: day("2026-06-01") });
    const firstRateFromJoiningMonth = [rate(30000, getFirstDayOfStartBSMonth(day("2026-08-01")))];
    const rateFromLongAgo = [rate(30000, day("2020-01-01"))];
    expect(computeAccruedSalary(movedEarlier, firstRateFromJoiningMonth)).toBe(
      computeAccruedSalary(movedEarlier, rateFromLongAgo)
    );
  });

  it("uses the newest rate when two start on the same day, whatever order they load in", () => {
    const monthStart = getFirstDayOfStartBSMonth(day("2026-08-01"));
    const older = rate(30000, monthStart, day("2026-08-01"), "older");
    const newer = rate(20000, monthStart, day("2026-08-05"), "newer");
    const s = staff();
    expect(computeAccruedSalary(s, [older, newer])).toBe(computeAccruedSalary(s, [newer]));
    expect(computeAccruedSalary(s, [newer, older])).toBe(computeAccruedSalary(s, [newer]));
  });

  it("does not show a future raise as the current salary", () => {
    jest.useFakeTimers().setSystemTime(day("2026-10-12"));
    const active = staff({ status: "ACTIVE", endDate: null });
    const rates = [rate(30000, day("2026-08-01")), rate(35000, day("2027-01-15"))];
    expect(getCurrentRate(active, rates)).toBe(30000);
    jest.useRealTimers();
  });

  it("rounds monthly salary to whole rupees each month so cash can settle it", () => {
    const s = staff({ startDate: day("2026-08-05") });
    const lines = getStaffTransactions(s, [rate(30000, day("2020-01-01"))], [])
      .filter((tx) => tx.type === "accrual");
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(Number.isInteger(line.amount)).toBe(true);
  });
});

describe("Future last working date", () => {
  it("never counts days after today, even if the end date is in the future", () => {
    jest.useFakeTimers().setSystemTime(day("2026-10-05"));
    const daily = staff({ payType: "DAILY", startDate: day("2026-10-01"), endDate: day("2026-10-20") });
    expect(computeAccruedSalary(daily, [rate(600, day("2026-10-01"))])).toBe(3000);
    jest.useRealTimers();
  });
});
