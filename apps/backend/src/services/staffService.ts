/**
 * Staff management service.
 * Accrual is computed by Nepali (BS) month: each BS month adds one month's salary.
 * All dates stored in DB are AD; we use nepali-date-converter to iterate BS months.
 */

import NepaliDate from "nepali-date-converter";
import prisma from "../utils/prisma";
import { StaffStatus } from "@prisma/client";
import type { Staff, StaffSalary, StaffPayment } from "@prisma/client";

/** First day of BS month (year, month 1-12) as AD Date at midnight UTC (date only). */
function firstDayOfBSMonthAD(bsYear: number, bsMonth: number): Date {
  const nd = new NepaliDate(bsYear, bsMonth - 1, 1);
  const d = nd.toJsDate();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
}

/** Get BS year and month from an AD date. */
function getBSYearMonth(adDate: Date): { year: number; month: number } {
  const nd = new NepaliDate(adDate);
  return { year: nd.getYear(), month: nd.getMonth() + 1 };
}

/**
 * Return the first day of the BS month that contains the given AD date (at UTC midnight).
 * Use when creating staff so startDate and initial salary effectiveFrom align with accrual.
 */
export function getFirstDayOfStartBSMonth(adDate: Date): Date {
  const startBS = getBSYearMonth(adDate);
  return firstDayOfBSMonthAD(startBS.year, startBS.month);
}

/** Iterate BS months from (startYear, startMonth) to (endYear, endMonth) inclusive. */
function* iterateBSMonths(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): Generator<{ year: number; month: number }> {
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    yield { year: y, month: m };
    if (m === 12) {
      m = 1;
      y += 1;
    } else {
      m += 1;
    }
  }
}

/** Get the salary amount (number) effective at a given AD date (start of month). */
function getSalaryForMonth(salaries: StaffSalary[], monthStartAD: Date): number {
  const sorted = [...salaries].sort(
    (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
  );
  for (const s of sorted) {
    if (new Date(s.effectiveFrom).getTime() <= monthStartAD.getTime()) {
      return Number(s.monthlyAmount);
    }
  }
  return 0;
}

/** Current moment in Nepal (UTC+5:45) so "today" in BS is correct regardless of server TZ. */
function getTodayInNepal(): Date {
  const nepalOffsetMs = 5.75 * 60 * 60 * 1000;
  return new Date(Date.now() + nepalOffsetMs);
}

/**
 * Compute total accrued salary for a staff up to "today" (or endDate if stopped).
 * Uses BS month iteration: each BS month adds the salary effective that month.
 */
export function computeAccruedSalary(staff: Staff, salaries: StaffSalary[]): number {
  const startDate = new Date(staff.startDate);
  const endDate = staff.status === StaffStatus.STOPPED && staff.endDate
    ? new Date(staff.endDate)
    : getTodayInNepal();

  const startBS = getBSYearMonth(startDate);
  const endBS = getBSYearMonth(endDate);

  let total = 0;
  for (const { year, month } of iterateBSMonths(startBS.year, startBS.month, endBS.year, endBS.month)) {
    const monthStartAD = firstDayOfBSMonthAD(year, month);
    total += getSalaryForMonth(salaries, monthStartAD);
  }
  return total;
}

/**
 * Balance = accrued - total payments.
 * Positive = owner owes staff (due), negative = advance.
 */
export function computeBalance(staff: Staff, salaries: StaffSalary[], payments: StaffPayment[]): number {
  const accrued = computeAccruedSalary(staff, salaries);
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  return accrued - totalPayments;
}

export interface StaffWithBalance extends Staff {
  balance: number;
  currentMonthlySalary: number;
}

/**
 * List staff for owner with computed balance and current salary.
 */
export async function listStaffForOwner(ownerId: string): Promise<StaffWithBalance[]> {
  const staffList = await prisma.staff.findMany({
    where: { ownerId },
    include: {
      salaries: { orderBy: { effectiveFrom: "desc" } },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return staffList.map((s) => {
    const balance = computeBalance(s, s.salaries, s.payments);
    const currentSalary = s.salaries.length > 0 ? Number(s.salaries[0].monthlyAmount) : 0;
    const { salaries, payments, ...staff } = s;
    return {
      ...staff,
      balance,
      currentMonthlySalary: currentSalary,
    };
  });
}

/**
 * Get one staff by id (must belong to owner) with balance and full salary/payment lists.
 */
export async function getStaffById(staffId: string, ownerId: string) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, ownerId },
    include: {
      salaries: { orderBy: { effectiveFrom: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!staff) return null;
  const balance = computeBalance(staff, staff.salaries, staff.payments);
  const currentSalary = staff.salaries.length > 0
    ? Number(staff.salaries[staff.salaries.length - 1].monthlyAmount)
    : 0;
  return {
    ...staff,
    balance,
    currentMonthlySalary: currentSalary,
  };
}

export type TransactionItem =
  | { type: "accrual"; bsYear: number; bsMonth: number; amount: number; monthStartAD: Date }
  | { type: "payment"; id: string; amount: number; paidAt: Date; note: string | null; receiptImageUrl: string | null };

/**
 * Get merged transaction list for details view: accrual entries (per BS month) + payments, sorted by date.
 */
export function getStaffTransactions(staff: Staff, salaries: StaffSalary[], payments: StaffPayment[]): TransactionItem[] {
  const startDate = new Date(staff.startDate);
  const endDate = staff.status === StaffStatus.STOPPED && staff.endDate
    ? new Date(staff.endDate)
    : new Date();
  const startBS = getBSYearMonth(startDate);
  const endBS = getBSYearMonth(endDate);

  const accruals: TransactionItem[] = [];
  for (const { year, month } of iterateBSMonths(startBS.year, startBS.month, endBS.year, endBS.month)) {
    const monthStartAD = firstDayOfBSMonthAD(year, month);
    const amount = getSalaryForMonth(salaries, monthStartAD);
    if (amount > 0) {
      accruals.push({ type: "accrual", bsYear: year, bsMonth: month, amount, monthStartAD });
    }
  }

  const paymentItems: TransactionItem[] = payments.map((p) => ({
    type: "payment" as const,
    id: p.id,
    amount: Number(p.amount),
    paidAt: new Date(p.paidAt),
    note: p.note,
    receiptImageUrl: p.receiptImageUrl,
  }));

  const all: TransactionItem[] = [...accruals, ...paymentItems];
  all.sort((a, b) => {
    const dateA = a.type === "accrual" ? a.monthStartAD.getTime() : a.paidAt.getTime();
    const dateB = b.type === "accrual" ? b.monthStartAD.getTime() : b.paidAt.getTime();
    return dateA - dateB;
  });
  return all;
}
