jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    staff: { findMany: jest.fn() },
  },
}));

import prisma from "../../src/utils/prisma";
import {
  computeBalance,
  getStaffSummaryForOwner,
  listStaffForOwner,
} from "../../src/services/staffService";

const mockedFindMany = (
  prisma as unknown as { staff: { findMany: jest.Mock } }
).staff.findMany;

function makeStaff(paymentAmounts: number[]) {
  return {
    id: "staff-1",
    ownerId: "owner-1",
    name: "Test staff",
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: null,
    status: "ACTIVE",
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    salaries: [],
    payments: paymentAmounts.map((amount, index) => ({
      id: `payment-${index + 1}`,
      staffId: "staff-1",
      amount,
      paidAt: new Date("2026-10-02T00:00:00.000Z"),
      note: null,
      receiptImageUrl: null,
      createdAt: new Date("2026-10-02T00:00:00.000Z"),
    })),
  };
}

describe("Staff payment number consistency", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("raises the staff balance by exactly the deleted payment amount", () => {
    const before = makeStaff([100, 250]);
    const after = makeStaff([250]);

    const balanceBefore = computeBalance(before as any, [], before.payments as any);
    const balanceAfter = computeBalance(after as any, [], after.payments as any);

    expect(balanceAfter - balanceBefore).toBe(100);
  });

  it("updates the staff list balance from the remaining payments", async () => {
    mockedFindMany
      .mockResolvedValueOnce([makeStaff([100, 250])])
      .mockResolvedValueOnce([makeStaff([250])]);

    const before = await listStaffForOwner("owner-1");
    const after = await listStaffForOwner("owner-1");

    expect(before[0].balance).toBe(-350);
    expect(after[0].balance).toBe(-250);
  });

  it("updates total payments and remaining balance from the same rows", async () => {
    mockedFindMany
      .mockResolvedValueOnce([makeStaff([100, 250])])
      .mockResolvedValueOnce([makeStaff([250])]);

    const before = await getStaffSummaryForOwner("owner-1");
    const after = await getStaffSummaryForOwner("owner-1");

    expect(before.totalSalaryPayments).toBe(350);
    expect(before.remainingBalance).toBe(-350);
    expect(after.totalSalaryPayments).toBe(250);
    expect(after.remainingBalance).toBe(-250);
  });
});
