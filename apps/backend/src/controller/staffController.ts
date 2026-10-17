import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { Prisma, StaffAttendanceStatus, StaffPayType, StaffStatus } from "@prisma/client";
import {
  listStaffForOwner,
  getStaffSummaryForOwner,
  getStaffById as getStaffByIdService,
  getStaffTransactions,
  computeBalance,
  getFirstDayOfStartBSMonth,
  getTodayInNepalDateOnly,
  normalizeDateOnlyUTC,
  type StaffPayTypeFilter,
  type StaffStatusFilter,
} from "../services/staffService";

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseDecimal(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/**
 * When a rate starts. Monthly salary always starts on the first day of a BS
 * month, because a monthly rate is looked up once per month.
 */
function rateStartDate(payType: StaffPayType, date: Date): Date {
  return payType === StaffPayType.MONTHLY ? getFirstDayOfStartBSMonth(date) : normalizeDateOnlyUTC(date);
}

/**
 * Save a salary rate. A rate that starts on the same day as an existing one
 * replaces it, so correcting a wrong salary always works the same way.
 */
async function upsertRate(
  tx: Prisma.TransactionClient,
  staffId: string,
  rate: number,
  effectiveFrom: Date
) {
  const existing = await tx.staffSalary.findFirst({ where: { staffId, effectiveFrom } });
  if (existing) {
    return tx.staffSalary.update({ where: { id: existing.id }, data: { rate } });
  }
  return tx.staffSalary.create({ data: { staffId, rate, effectiveFrom } });
}

// ==================== LIST ====================
export const listStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const statusParam = typeof req.query.status === "string" ? req.query.status.toUpperCase() : "ALL";
    const allowedStatus: StaffStatusFilter =
      statusParam === "ACTIVE" || statusParam === "STOPPED" ? statusParam : "ALL";
    const payTypeParam = typeof req.query.payType === "string" ? req.query.payType.toUpperCase() : "ALL";
    const allowedPayType: StaffPayTypeFilter =
      payTypeParam === StaffPayType.MONTHLY || payTypeParam === StaffPayType.DAILY ? payTypeParam : "ALL";
    const list = await listStaffForOwner(ownerId, allowedStatus, allowedPayType);
    res.json({ success: true, data: list });
  } catch (error) {
    console.error("List staff error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getStaffSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const summary = await getStaffSummaryForOwner(ownerId);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Get staff summary error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== GET ONE ====================
export const getStaffById = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    const { id } = req.params;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const staff = await getStaffByIdService(id, ownerId);
    if (!staff) {
      res.status(404).json({ success: false, message: "Staff not found" });
      return;
    }
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error("Get staff by id error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== CREATE ====================
export const createStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const { name, startDate, payType: payTypeInput } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }
    const payType = payTypeInput === undefined ? StaffPayType.MONTHLY : payTypeInput;
    if (payType !== StaffPayType.MONTHLY && payType !== StaffPayType.DAILY) {
      res.status(400).json({ success: false, message: "Pay type must be MONTHLY or DAILY" });
      return;
    }
    const start = parseDate(startDate);
    if (!start) {
      res.status(400).json({ success: false, message: "Valid start date is required" });
      return;
    }
    // `monthlySalary` is still accepted from older app versions.
    const rate = parseDecimal(req.body.rate ?? req.body.monthlySalary);
    if (rate === null || rate < 0) {
      res.status(400).json({
        success: false,
        message: payType === StaffPayType.DAILY ? "Valid daily wage is required" : "Valid monthly salary is required",
      });
      return;
    }
    const normalizedStartDate = normalizeDateOnlyUTC(start);
    // Staff and first rate are saved together, so a staff member can never
    // exist without a rate and silently earn nothing.
    const staff = await prisma.$transaction(async (tx) => {
      const created = await tx.staff.create({
        data: {
          ownerId,
          name: name.trim(),
          payType,
          startDate: normalizedStartDate,
          status: StaffStatus.ACTIVE,
        },
      });
      await tx.staffSalary.create({
        data: {
          staffId: created.id,
          rate,
          effectiveFrom: rateStartDate(payType, normalizedStartDate),
        },
      });
      return created;
    });
    const withBalance = await getStaffByIdService(staff.id, ownerId);
    res.status(201).json({ success: true, data: withBalance });
  } catch (error) {
    console.error("Create staff error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== UPDATE (name only or add new salary) ====================
export const updateStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    const { id } = req.params;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const existing = await prisma.staff.findFirst({
      where: { id, ownerId },
      include: { salaries: true, payments: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, message: "Staff not found" });
      return;
    }
    const { name, startDate, effectiveFrom } = req.body;
    const updates: { name?: string; startDate?: Date } = {};
    if (name !== undefined && typeof name === "string" && name.trim().length > 0) {
      updates.name = name.trim();
    }
    // A wrong joining date otherwise accrues salary from the wrong day forever.
    // Nothing is stored: computeAccruedSalary re-reads startDate on every call.
    if (startDate !== undefined) {
      const parsedStart = parseDate(startDate);
      if (!parsedStart) {
        res.status(400).json({ success: false, message: "Valid start date is required" });
        return;
      }
      updates.startDate = normalizeDateOnlyUTC(parsedStart);
      if (existing.endDate && updates.startDate.getTime() > normalizeDateOnlyUTC(existing.endDate).getTime()) {
        res.status(400).json({ success: false, message: "Start date cannot be after the last working date" });
        return;
      }
    }

    // `monthlySalary` is still accepted from older app versions.
    const rateInput = req.body.rate ?? req.body.monthlySalary;
    let newRate: { rate: number; effectiveFrom: Date } | null = null;
    if (rateInput != null && effectiveFrom != null) {
      const rate = parseDecimal(rateInput);
      const effFrom = parseDate(effectiveFrom);
      if (rate === null || rate < 0 || !effFrom) {
        res.status(400).json({ success: false, message: "Valid salary and start date are required" });
        return;
      }
      newRate = { rate, effectiveFrom: rateStartDate(existing.payType, effFrom) };
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(updates).length > 0) {
        await tx.staff.update({ where: { id }, data: updates });
      }
      if (newRate) {
        await upsertRate(tx, id, newRate.rate, newRate.effectiveFrom);
      }
    });
    const updated = await getStaffByIdService(id, ownerId);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update staff error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== STOP ====================
export const stopStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    const { id } = req.params;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const staff = await prisma.staff.findFirst({
      where: { id, ownerId },
    });
    if (!staff) {
      res.status(404).json({ success: false, message: "Staff not found" });
      return;
    }
    if (staff.status === StaffStatus.STOPPED) {
      res.status(400).json({ success: false, message: "Staff is already stopped" });
      return;
    }
    const parsedEndDate = parseDate(req.body?.endDate);
    const today = getTodayInNepalDateOnly();
    const endDate = parsedEndDate ? normalizeDateOnlyUTC(parsedEndDate) : today;
    const startDate = normalizeDateOnlyUTC(new Date(staff.startDate));
    if (endDate.getTime() < startDate.getTime()) {
      res.status(400).json({ success: false, message: "End date cannot be before start date" });
      return;
    }
    // A future last day would count days not worked yet as already due.
    if (endDate.getTime() > today.getTime()) {
      res.status(400).json({ success: false, message: "Last working date cannot be in the future" });
      return;
    }
    await prisma.staff.update({
      where: { id },
      data: { status: StaffStatus.STOPPED, endDate },
    });
    const updated = await getStaffByIdService(id, ownerId);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Stop staff error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== RESUME ====================
/** Undo a stop made by mistake: salary accrues again from the old end date onward. */
export const resumeStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    const { id } = req.params;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const staff = await prisma.staff.findFirst({ where: { id, ownerId }, select: { id: true, status: true } });
    if (!staff) {
      res.status(404).json({ success: false, message: "Staff not found" });
      return;
    }
    if (staff.status !== StaffStatus.STOPPED) {
      res.status(400).json({ success: false, message: "Staff is already active" });
      return;
    }
    await prisma.staff.update({
      where: { id },
      data: { status: StaffStatus.ACTIVE, endDate: null },
    });
    const updated = await getStaffByIdService(id, ownerId);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Resume staff error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== SALARY RATES ====================
/** Fix a wrong rate or its start date. */
export const updateSalaryRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    const { id, salaryId } = req.params;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const staff = await prisma.staff.findFirst({ where: { id, ownerId }, select: { id: true, payType: true } });
    if (!staff) {
      res.status(404).json({ success: false, message: "Staff not found" });
      return;
    }
    const salary = await prisma.staffSalary.findFirst({ where: { id: salaryId, staffId: staff.id } });
    if (!salary) {
      res.status(404).json({ success: false, message: "Salary not found" });
      return;
    }
    const rate = parseDecimal(req.body?.rate);
    if (rate === null || rate < 0) {
      res.status(400).json({ success: false, message: "Valid salary is required" });
      return;
    }
    let effectiveFrom = salary.effectiveFrom;
    if (req.body?.effectiveFrom != null) {
      const parsed = parseDate(req.body.effectiveFrom);
      if (!parsed) {
        res.status(400).json({ success: false, message: "Valid start date is required" });
        return;
      }
      effectiveFrom = rateStartDate(staff.payType, parsed);
    }
    const clash = await prisma.staffSalary.findFirst({
      where: { staffId: staff.id, effectiveFrom, id: { not: salary.id } },
    });
    if (clash) {
      res.status(400).json({ success: false, message: "Another salary already starts on this date" });
      return;
    }
    await prisma.staffSalary.update({ where: { id: salary.id }, data: { rate, effectiveFrom } });
    const updated = await getStaffByIdService(id, ownerId);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update staff salary error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/** Remove a wrong rate. The last remaining rate cannot be removed. */
export const deleteSalaryRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    const { id, salaryId } = req.params;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const staff = await prisma.staff.findFirst({
      where: { id, ownerId },
      select: { id: true, salaries: { select: { id: true } } },
    });
    if (!staff) {
      res.status(404).json({ success: false, message: "Staff not found" });
      return;
    }
    if (!staff.salaries.some((s) => s.id === salaryId)) {
      res.status(404).json({ success: false, message: "Salary not found" });
      return;
    }
    if (staff.salaries.length <= 1) {
      res.status(400).json({ success: false, message: "Staff must keep at least one salary" });
      return;
    }
    await prisma.staffSalary.delete({ where: { id: salaryId } });
    const updated = await getStaffByIdService(id, ownerId);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Delete staff salary error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== ATTENDANCE ====================
/**
 * Mark one day for a daily wage worker. PRESENT is the normal state, so it
 * removes any stored mark instead of saving a row.
 */
export const setAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    const { id } = req.params;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const staff = await prisma.staff.findFirst({ where: { id, ownerId } });
    if (!staff) {
      res.status(404).json({ success: false, message: "Staff not found" });
      return;
    }
    if (staff.payType !== StaffPayType.DAILY) {
      res.status(400).json({ success: false, message: "Attendance is only for daily wage staff" });
      return;
    }
    const parsed = parseDate(req.body?.date);
    if (!parsed) {
      res.status(400).json({ success: false, message: "Valid date is required" });
      return;
    }
    const date = normalizeDateOnlyUTC(parsed);
    const today = getTodayInNepalDateOnly();
    const lastDay = staff.endDate && staff.endDate.getTime() < today.getTime() ? normalizeDateOnlyUTC(staff.endDate) : today;
    if (date.getTime() < normalizeDateOnlyUTC(staff.startDate).getTime() || date.getTime() > lastDay.getTime()) {
      res.status(400).json({ success: false, message: "Date must be between joining date and today or last working date" });
      return;
    }
    const status = req.body?.status;
    if (status === "PRESENT") {
      await prisma.staffAttendance.deleteMany({ where: { staffId: staff.id, date } });
    } else if (status === StaffAttendanceStatus.ABSENT || status === StaffAttendanceStatus.HALF_DAY) {
      await prisma.staffAttendance.upsert({
        where: { staffId_date: { staffId: staff.id, date } },
        create: { staffId: staff.id, date, status },
        update: { status },
      });
    } else {
      res.status(400).json({ success: false, message: "Status must be PRESENT, ABSENT or HALF_DAY" });
      return;
    }
    const updated = await getStaffByIdService(id, ownerId);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Set staff attendance error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== ADD PAYMENT ====================
export const addPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    const { id } = req.params;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const staff = await prisma.staff.findFirst({
      where: { id, ownerId },
      include: { salaries: true, payments: true },
    });
    if (!staff) {
      res.status(404).json({ success: false, message: "Staff not found" });
      return;
    }
    const { amount, paidAt, note, receiptImageUrl } = req.body;
    const amt = parseDecimal(amount);
    if (amt === null || amt <= 0) {
      res.status(400).json({ success: false, message: "Valid amount is required" });
      return;
    }
    const paid = parseDate(paidAt);
    if (!paid) {
      res.status(400).json({ success: false, message: "Valid payment date is required" });
      return;
    }
    const payment = await prisma.staffPayment.create({
      data: {
        staffId: id,
        amount: amt,
        paidAt: paid,
        note: typeof note === "string" ? note.trim() || null : null,
        receiptImageUrl: typeof receiptImageUrl === "string" && receiptImageUrl.trim() ? receiptImageUrl.trim() : null,
      },
    });
    const updated = await getStaffByIdService(id, ownerId);
    res.status(201).json({ success: true, data: updated, payment });
  } catch (error) {
    console.error("Add staff payment error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== DELETE PAYMENT ====================
export const deletePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    const { id, paymentId } = req.params;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const staff = await prisma.staff.findFirst({
      where: { id, ownerId },
      select: { id: true, status: true },
    });
    if (!staff) {
      res.status(404).json({ success: false, message: "Staff not found" });
      return;
    }

    const payment = await prisma.staffPayment.findFirst({
      where: { id: paymentId, staffId: staff.id },
    });
    if (!payment) {
      res.status(404).json({ success: false, message: "Payment not found" });
      return;
    }

    await prisma.staffPayment.delete({ where: { id: payment.id } });
    res.json({
      success: true,
      data: { paymentId: payment.id, staffId: staff.id },
      message: "Payment deleted",
    });
  } catch (error) {
    console.error("Delete staff payment error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== DELETE ====================
/**
 * Permanently delete a payroll staff member.
 *
 * Deliberately has NO balance check. The old archive flow required
 * |balance| <= 0.0001, which was unreachable: accrual is
 * salary / days-in-BS-month * days-worked, so it lands on repeating decimals
 * and no whole-rupee payment can ever settle it exactly.
 *
 * StaffSalary and StaffPayment are both onDelete: Cascade, so one delete
 * removes the salary history and payments with it.
 */
export const deleteStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    const { id } = req.params;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const staff = await prisma.staff.findFirst({
      where: { id, ownerId },
      select: { id: true, status: true },
    });
    if (!staff) {
      res.status(404).json({ success: false, message: "Staff not found" });
      return;
    }
    // Stopping first makes the deletion deliberate: an actively employed
    // person can never be removed in a single step.
    if (staff.status !== StaffStatus.STOPPED) {
      res.status(400).json({
        success: false,
        message: "Stop the staff member before deleting",
      });
      return;
    }

    const { password } = req.body ?? {};
    if (!password) {
      res.status(400).json({ success: false, message: "Password confirmation is required" });
      return;
    }
    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    const validPassword = await bcrypt.compare(password, owner.password);
    if (!validPassword) {
      res.status(401).json({ success: false, message: "Invalid password. Deletion cancelled." });
      return;
    }

    await prisma.staff.delete({ where: { id: staff.id } });
    res.json({ success: true, data: { staffId: staff.id }, message: "Staff deleted" });
  } catch (error) {
    console.error("Delete staff error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== GET TRANSACTIONS ====================
export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    const { id } = req.params;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const staff = await prisma.staff.findFirst({
      where: { id, ownerId },
      include: { salaries: true, payments: true, attendance: true },
    });
    if (!staff) {
      res.status(404).json({ success: false, message: "Staff not found" });
      return;
    }
    const transactions = getStaffTransactions(staff, staff.salaries, staff.payments, staff.attendance);
    const balance = computeBalance(staff, staff.salaries, staff.payments, staff.attendance);
    res.json({ success: true, data: { transactions, balance } });
  } catch (error) {
    console.error("Get staff transactions error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
