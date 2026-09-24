import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { writeBusinessAudit } from "../services/businessAuditService";
import prisma from "../utils/prisma";

function parseAmount(value: unknown): Prisma.Decimal | null {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(raw)) return null;

  const amount = new Prisma.Decimal(raw);
  return amount.greaterThan(0) && amount.lessThanOrEqualTo("99999999.99") ? amount : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today ? date : null;
}

/** A simple cash-flow view: real customer payments less admin-entered expenses. */
export const getAdminFinanceOverview = async (
  _req: Request,
  res: Response
): Promise<any> => {
  try {
    const [payments, expenses] = await Promise.all([
      prisma.accountPayment.findMany({
        where: { account: { isTestAccount: false } },
        select: {
          id: true,
          type: true,
          amount: true,
          paidAt: true,
          createdAt: true,
          account: { select: { id: true, name: true, phone: true } },
        },
      }),
      prisma.adminExpense.findMany({
        select: { id: true, description: true, amount: true, spentAt: true, createdAt: true },
      }),
    ]);

    const chronologicalEntries = [
      ...payments.map((payment) => ({
        id: `payment:${payment.id}`,
        type: "INCOME" as const,
        date: payment.paidAt,
        createdAt: payment.createdAt,
        description: `${payment.type === "INITIAL" ? "First-time payment" : "Annual maintenance"} — ${payment.account.name}`,
        reference: payment.account.phone,
        income: Number(payment.amount),
        expense: 0,
      })),
      ...expenses.map((expense) => ({
        id: `expense:${expense.id}`,
        type: "EXPENSE" as const,
        date: expense.spentAt,
        createdAt: expense.createdAt,
        description: expense.description,
        reference: null,
        income: 0,
        expense: Number(expense.amount),
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime() || a.createdAt.getTime() - b.createdAt.getTime());

    let balance = 0;
    const entries = chronologicalEntries.map((entry) => {
      balance += entry.income - entry.expense;
      return { ...entry, balance };
    }).reverse();

    const totalIncome = payments.reduce((total, payment) => total + Number(payment.amount), 0);
    const totalExpenses = expenses.reduce((total, expense) => total + Number(expense.amount), 0);

    return res.json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        entries,
      },
    });
  } catch (error) {
    console.error("Get admin finance overview error:", error);
    return res.status(500).json({ success: false, message: "Failed to load finance overview" });
  }
};

export const createAdminExpense = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
    const amount = parseAmount(req.body?.amount);
    const spentAt = parseDate(req.body?.spentAt);
    if (!description || description.length > 160 || !amount || !spentAt) {
      return res.status(400).json({
        success: false,
        message: "A description, positive amount, and non-future expense date are required",
      });
    }

    const expense = await prisma.$transaction(async (tx) => {
      const createdExpense = await tx.adminExpense.create({
        data: { description, amount, spentAt },
        select: { id: true, description: true, amount: true, spentAt: true, createdAt: true },
      });
      await writeBusinessAudit(req, {
        action: "admin.finance_expense.recorded",
        targetType: "AdminExpense",
        targetId: createdExpense.id,
        description: `Recorded admin expense: ${description}`,
        businessType: "ADMIN",
        metadata: { amount: amount.toString(), spentAt: spentAt.toISOString().slice(0, 10) },
      }, tx);
      return createdExpense;
    });

    return res.status(201).json({
      success: true,
      data: { ...expense, amount: Number(expense.amount) },
    });
  } catch (error) {
    console.error("Create admin expense error:", error);
    return res.status(500).json({ success: false, message: "Failed to record expense" });
  }
};
