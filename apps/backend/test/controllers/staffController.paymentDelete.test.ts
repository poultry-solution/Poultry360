jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    staff: { findFirst: jest.fn(), delete: jest.fn() },
    staffPayment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    // Phase 5 wired deletePayment inside a $transaction so the cashbook
    // mirror cleanup is atomic with the staffPayment delete. OWNER-only
    // role guard means these tests (which don't set req.role) never touch
    // the cashMovement table — the mock is here as a safety net.
    cashAccount: { findFirst: jest.fn(), create: jest.fn() },
    cashMovement: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
  client.$transaction = jest.fn((fn: (tx: any) => unknown) => fn(client));
  return { __esModule: true, default: client };
});

jest.mock("../../src/services/staffService", () => ({
  listStaffForOwner: jest.fn(),
  getStaffSummaryForOwner: jest.fn(),
  getStaffById: jest.fn(),
  getStaffTransactions: jest.fn(),
  computeBalance: jest.fn(),
  getFirstDayOfStartBSMonth: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
jest.mock("bcrypt", () => ({
  __esModule: true,
  default: { compare: jest.fn() },
}));

import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { deletePayment, deleteStaff } from "../../src/controller/staffController";

const mockedPrisma = prisma as unknown as {
  staff: { findFirst: jest.Mock; delete: jest.Mock };
  staffPayment: { findFirst: jest.Mock; findMany: jest.Mock; delete: jest.Mock };
  user: { findUnique: jest.Mock };
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

  describe("deleteStaff", () => {
    const req = (body: any = { password: "secret" }) =>
      ({ userId: "owner-1", params: { id: "staff-1" }, body }) as any;

    it("deletes a stopped staff member after the password checks out", async () => {
      mockedPrisma.staff.findFirst.mockResolvedValue({ id: "staff-1", status: "STOPPED" });
      mockedPrisma.user.findUnique.mockResolvedValue({ id: "owner-1", password: "hashed" });
      mockedPrisma.staffPayment.findMany.mockResolvedValue([]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const response = makeResponse();

      await deleteStaff(req(), response);

      expect(mockedPrisma.staff.delete).toHaveBeenCalledWith({ where: { id: "staff-1" } });
      expect(response.json).toHaveBeenCalledWith({
        success: true,
        data: { staffId: "staff-1" },
        message: "Staff deleted",
      });
    });

    it("deletes even when the balance is not settled", async () => {
      // The old archive flow blocked on |balance| <= 0.0001, which accrual
      // could never reach. Delete must not reintroduce that gate.
      mockedPrisma.staff.findFirst.mockResolvedValue({ id: "staff-1", status: "STOPPED" });
      mockedPrisma.user.findUnique.mockResolvedValue({ id: "owner-1", password: "hashed" });
      mockedPrisma.staffPayment.findMany.mockResolvedValue([]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const response = makeResponse();

      await deleteStaff(req(), response);

      expect(mockedPrisma.staff.delete).toHaveBeenCalled();
    });

    it("refuses to delete an active staff member", async () => {
      mockedPrisma.staff.findFirst.mockResolvedValue({ id: "staff-1", status: "ACTIVE" });
      const response = makeResponse();

      await deleteStaff(req(), response);

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        success: false,
        message: "Stop the staff member before deleting",
      });
      expect(mockedPrisma.staff.delete).not.toHaveBeenCalled();
    });

    it("refuses a wrong password", async () => {
      mockedPrisma.staff.findFirst.mockResolvedValue({ id: "staff-1", status: "STOPPED" });
      mockedPrisma.user.findUnique.mockResolvedValue({ id: "owner-1", password: "hashed" });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const response = makeResponse();

      await deleteStaff(req(), response);

      expect(response.status).toHaveBeenCalledWith(401);
      expect(mockedPrisma.staff.delete).not.toHaveBeenCalled();
    });

    it("does not leak another owner's staff", async () => {
      mockedPrisma.staff.findFirst.mockResolvedValue(null);
      const response = makeResponse();

      await deleteStaff(req(), response);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(mockedPrisma.staff.delete).not.toHaveBeenCalled();
    });

    it("cleans up cashbook mirrors for HATCHERY-owned staff payments", async () => {
      // Hatchery was added to the mirror-eligible role gate in Phase 2 of the
      // hatchery cashflow plan. Deleting a hatchery staff member must remove
      // their STAFF_PAYMENT mirrors just like OWNER / DEALER do — otherwise
      // the mirror rows orphan (no FK to StaffPayment).
      mockedPrisma.staff.findFirst.mockResolvedValue({ id: "staff-1", status: "STOPPED" });
      mockedPrisma.user.findUnique.mockResolvedValue({ id: "owner-1", password: "hashed" });
      mockedPrisma.staffPayment.findMany.mockResolvedValue([
        { id: "payment-1", receiptImageUrl: null },
        { id: "payment-2", receiptImageUrl: null },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const mirror = (prisma as any).cashMovement.deleteMany as jest.Mock;
      mirror.mockClear();
      const response = makeResponse();

      await deleteStaff(
        { userId: "owner-1", role: UserRole.HATCHERY, params: { id: "staff-1" }, body: { password: "secret" } } as any,
        response,
      );

      expect(mirror).toHaveBeenCalledTimes(2);
      expect(mirror).toHaveBeenCalledWith({
        where: { userId: "owner-1", sourceType: "STAFF_PAYMENT", sourceId: "payment-1" },
      });
      expect(mirror).toHaveBeenCalledWith({
        where: { userId: "owner-1", sourceType: "STAFF_PAYMENT", sourceId: "payment-2" },
      });
      expect(mockedPrisma.staff.delete).toHaveBeenCalled();
    });

    it("skips mirror cleanup for COMPANY role (no cashbook yet)", async () => {
      mockedPrisma.staff.findFirst.mockResolvedValue({ id: "staff-1", status: "STOPPED" });
      mockedPrisma.user.findUnique.mockResolvedValue({ id: "owner-1", password: "hashed" });
      mockedPrisma.staffPayment.findMany.mockResolvedValue([
        { id: "payment-1", receiptImageUrl: null },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const mirror = (prisma as any).cashMovement.deleteMany as jest.Mock;
      mirror.mockClear();
      const response = makeResponse();

      await deleteStaff(
        { userId: "owner-1", role: UserRole.COMPANY, params: { id: "staff-1" }, body: { password: "secret" } } as any,
        response,
      );

      expect(mirror).not.toHaveBeenCalled();
      expect(mockedPrisma.staff.delete).toHaveBeenCalled();
    });
  });

});
