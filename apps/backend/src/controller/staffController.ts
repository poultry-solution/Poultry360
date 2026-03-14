import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { StaffStatus } from "@prisma/client";
import {
  listStaffForOwner,
  getStaffById as getStaffByIdService,
  getStaffTransactions,
  computeBalance,
  getFirstDayOfStartBSMonth,
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

// ==================== LIST ====================
export const listStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.userId;
    if (!ownerId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const list = await listStaffForOwner(ownerId);
    res.json({ success: true, data: list });
  } catch (error) {
    console.error("List staff error:", error);
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
    // Normalize to first day of start BS month so accrual and initial salary align (first month gets salary)
    const firstDayOfStartMonth = getFirstDayOfStartBSMonth(start);
    const staff = await prisma.staff.create({
      data: {
        ownerId,
        name: name.trim(),
        startDate: firstDayOfStartMonth,
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
    const { name, monthlySalary, effectiveFrom } = req.body;
    const updates: { name?: string } = {};
    if (name !== undefined && typeof name === "string" && name.trim().length > 0) {
      updates.name = name.trim();
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
    const endDate = new Date();
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
