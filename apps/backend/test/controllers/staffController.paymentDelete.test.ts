jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    staff: { findFirst: jest.fn() },
    staffPayment: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("../../src/services/staffService", () => ({
  listStaffForOwner: jest.fn(),
  getStaffSummaryForOwner: jest.fn(),
  getStaffById: jest.fn(),
  getStaffTransactions: jest.fn(),
  computeBalance: jest.fn(),
  getFirstDayOfStartBSMonth: jest.fn(),
  archiveStaffForOwner: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
import { deletePayment } from "../../src/controller/staffController";

const mockedPrisma = prisma as unknown as {
  staff: { findFirst: jest.Mock };
  staffPayment: { findFirst: jest.Mock; delete: jest.Mock };
};
function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

describe("Delete staff payment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes an owned payment and returns its ids", async () => {
    mockedPrisma.staff.findFirst.mockResolvedValue({ id: "staff-1", status: "ACTIVE" });
    mockedPrisma.staffPayment.findFirst.mockResolvedValue({
      id: "payment-1",
      staffId: "staff-1",
      amount: 500,
    });
    mockedPrisma.staffPayment.delete.mockResolvedValue({ id: "payment-1" });
    const response = makeResponse();

    await deletePayment(
      {
        userId: "owner-1",
        params: { id: "staff-1", paymentId: "payment-1" },
      } as any,
      response,
    );

    expect(mockedPrisma.staff.findFirst).toHaveBeenCalledWith({
      where: { id: "staff-1", ownerId: "owner-1" },
      select: { id: true, status: true },
    });
    expect(mockedPrisma.staffPayment.findFirst).toHaveBeenCalledWith({
      where: { id: "payment-1", staffId: "staff-1" },
    });
    expect(mockedPrisma.staffPayment.delete).toHaveBeenCalledWith({
      where: { id: "payment-1" },
    });
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: { paymentId: "payment-1", staffId: "staff-1" },
      message: "Payment deleted",
    });
  });

  it("does not delete a payment that does not belong to the staff member", async () => {
    mockedPrisma.staff.findFirst.mockResolvedValue({ id: "staff-1", status: "ACTIVE" });
    mockedPrisma.staffPayment.findFirst.mockResolvedValue(null);
    const response = makeResponse();

    await deletePayment(
      {
        userId: "owner-1",
        params: { id: "staff-1", paymentId: "other-payment" },
      } as any,
      response,
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Payment not found",
    });
    expect(mockedPrisma.staffPayment.delete).not.toHaveBeenCalled();
  });

  it("keeps archived staff payment history read-only", async () => {
    mockedPrisma.staff.findFirst.mockResolvedValue({ id: "staff-1", status: "ARCHIVED" });
    const response = makeResponse();

    await deletePayment(
      {
        userId: "owner-1",
        params: { id: "staff-1", paymentId: "payment-1" },
      } as any,
      response,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Archived staff payments cannot be deleted",
    });
    expect(mockedPrisma.staffPayment.findFirst).not.toHaveBeenCalled();
    expect(mockedPrisma.staffPayment.delete).not.toHaveBeenCalled();
  });
});
