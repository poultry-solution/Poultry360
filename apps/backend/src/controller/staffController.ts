import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { StaffStatus } from "@prisma/client";
import {
  listStaffForOwner,
  getStaffSummaryForOwner,
  getStaffById as getStaffByIdService,
  getStaffTransactions,
  computeBalance,
  getFirstDayOfStartBSMonth,
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

function normalizeDateOnlyUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function parseDecimal(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
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
    const list = await listStaffForOwner(ownerId, allowedStatus);
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
    const { name, startDate, monthlySalary } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }
    const start = parseDate(startDate);
    if (!start) {
      res.status(400).json({ success: false, message: "Valid start date is required" });
      return;
    }
    const salary = parseDecimal(monthlySalary);
    if (salary === null || salary < 0) {
      res.status(400).json({ success: false, message: "Valid monthly salary is required" });
      return;
    }
    const normalizedStartDate = normalizeDateOnlyUTC(start);
    // Initial salary is effective from the first day of the joining BS month;
    // accrual itself uses the exact joining date for proration.
    const firstDayOfStartMonth = getFirstDayOfStartBSMonth(start);
    const staff = await prisma.staff.create({
      data: {
        ownerId,
        name: name.trim(),
        startDate: normalizedStartDate,
        status: StaffStatus.ACTIVE,
      },
    });
    await prisma.staffSalary.create({
      data: {
        staffId: staff.id,
        monthlyAmount: salary,
        effectiveFrom: firstDayOfStartMonth,
      },
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
    const { name, startDate, monthlySalary, effectiveFrom } = req.body;
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
      updates.startDate = parsedStart;
    }
    if (Object.keys(updates).length > 0) {
      await prisma.staff.update({
        where: { id },
        data: updates,
      });
    }
    if (monthlySalary != null && effectiveFrom != null) {
      const amount = parseDecimal(monthlySalary);
      const effFrom = parseDate(effectiveFrom);
      if (amount !== null && amount >= 0 && effFrom) {
        const effNormalized = new Date(Date.UTC(effFrom.getFullYear(), effFrom.getMonth(), effFrom.getDate(), 0, 0, 0, 0));
        await prisma.staffSalary.create({
          data: {
            staffId: id,
            monthlyAmount: amount,
            effectiveFrom: effNormalized,
          },
        });
      }
    }
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
    const endDate = normalizeDateOnlyUTC(parsedEndDate ?? new Date());
    const startDate = normalizeDateOnlyUTC(new Date(staff.startDate));
    if (endDate.getTime() < startDate.getTime()) {
      res.status(400).json({ success: false, message: "End date cannot be before start date" });
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
      include: { salaries: true, payments: true },
    });
    if (!staff) {
      res.status(404).json({ success: false, message: "Staff not found" });
      return;
    }
    const transactions = getStaffTransactions(staff, staff.salaries, staff.payments);
    const balance = computeBalance(staff, staff.salaries, staff.payments);
    res.json({ success: true, data: { transactions, balance } });
  } catch (error) {
    console.error("Get staff transactions error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
