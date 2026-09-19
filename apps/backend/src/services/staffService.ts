/**
 * Staff management service.
 * Accrual is computed by Nepali (BS) month with day-wise proration.
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

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeDateOnlyUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

function inclusiveDays(start: Date, end: Date): number {
  if (end.getTime() < start.getTime()) return 0;
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

function getDaysInBSMonth(bsYear: number, bsMonth: number): number {
  const monthStart = firstDayOfBSMonthAD(bsYear, bsMonth);
  const nextMonthStart = bsMonth === 12
    ? firstDayOfBSMonthAD(bsYear + 1, 1)
    : firstDayOfBSMonthAD(bsYear, bsMonth + 1);
  return Math.round((nextMonthStart.getTime() - monthStart.getTime()) / DAY_MS);
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

/** Current date in Nepal (UTC+5:45) so "today" in BS is correct regardless of server TZ. */
function getTodayInNepalDateOnly(): Date {
  const nepalOffsetMs = 5.75 * 60 * 60 * 1000;
  const inNepal = new Date(Date.now() + nepalOffsetMs);
  return new Date(Date.UTC(inNepal.getUTCFullYear(), inNepal.getUTCMonth(), inNepal.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Compute total accrued salary for a staff up to "today" (or endDate if stopped).
 * Uses BS month iteration and prorates joining/stopping months by actual BS month days.
 */
export function computeAccruedSalary(staff: Staff, salaries: StaffSalary[]): number {
  const startDate = normalizeDateOnlyUTC(new Date(staff.startDate));
  const endDate = staff.status !== StaffStatus.ACTIVE && staff.endDate
    ? normalizeDateOnlyUTC(new Date(staff.endDate))
    : getTodayInNepalDateOnly();

  const startBS = getBSYearMonth(startDate);
  const endBS = getBSYearMonth(endDate);

  let total = 0;
  for (const { year, month } of iterateBSMonths(startBS.year, startBS.month, endBS.year, endBS.month)) {
    const monthStartAD = firstDayOfBSMonthAD(year, month);
    const nextMonthStartAD = month === 12
      ? firstDayOfBSMonthAD(year + 1, 1)
      : firstDayOfBSMonthAD(year, month + 1);
    const monthEndAD = addDays(nextMonthStartAD, -1);
    const workedStart = maxDate(startDate, monthStartAD);
    const workedEnd = minDate(endDate, monthEndAD);
    const workedDays = inclusiveDays(workedStart, workedEnd);

    if (workedDays <= 0) continue;

    const monthlySalary = getSalaryForMonth(salaries, monthStartAD);
    const daysInMonth = getDaysInBSMonth(year, month);
    total += (monthlySalary / daysInMonth) * workedDays;
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

export interface StaffSummary {
  totalStaff: number;
  activeStaff: number;
  stoppedStaff: number;
  archivedStaff: number;
  totalSalaryExpense: number;
  totalSalaryPayments: number;
  remainingBalance: number;
}

export type StaffStatusFilter = StaffStatus | "ALL";

async function getStaffAccountingRows(ownerId: string, statusFilter: StaffStatusFilter = "ALL") {
  return prisma.staff.findMany({
    where: {
      ownerId,
      ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
    },
    include: {
      salaries: { orderBy: { effectiveFrom: "desc" } },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * List staff for owner with computed balance and current salary.
 */
export async function listStaffForOwner(
  ownerId: string,
  statusFilter: StaffStatusFilter = "ALL"
): Promise<StaffWithBalance[]> {
  const staffList = await getStaffAccountingRows(ownerId, statusFilter);

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

export async function getStaffSummaryForOwner(ownerId: string): Promise<StaffSummary> {
  const staffList = await getStaffAccountingRows(ownerId);

  return staffList.reduce<StaffSummary>(
    (summary, staff) => {
      const balance = computeBalance(staff, staff.salaries, staff.payments);
      const salaryExpense = computeAccruedSalary(staff, staff.salaries);
      const payments = staff.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

      summary.totalStaff += 1;
      summary.totalSalaryExpense += salaryExpense;
      summary.totalSalaryPayments += payments;
      summary.remainingBalance += balance;

      if (staff.status === StaffStatus.ACTIVE) summary.activeStaff += 1;
      else if (staff.status === StaffStatus.STOPPED) summary.stoppedStaff += 1;
      else summary.archivedStaff += 1;

      return summary;
    },
    {
      totalStaff: 0,
      activeStaff: 0,
      stoppedStaff: 0,
      archivedStaff: 0,
      totalSalaryExpense: 0,
      totalSalaryPayments: 0,
      remainingBalance: 0,
    }
  );
}

export async function archiveStaffForOwner(staffId: string, ownerId: string): Promise<StaffWithBalance | null> {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, ownerId },
    include: {
      salaries: { orderBy: { effectiveFrom: "desc" } },
      payments: true,
    },
  });

  if (!staff) {
    return null;
  }

  if (staff.status === StaffStatus.ACTIVE) {
    throw new Error("Only stopped staff can be archived");
  }

  if (staff.status === StaffStatus.ARCHIVED) {
    throw new Error("Staff is already archived");
  }

  const balance = computeBalance(staff, staff.salaries, staff.payments);
  if (Math.abs(balance) > 0.0001) {
    throw new Error("Staff can only be archived when balance is zero");
  }

  const updated = await prisma.staff.update({
    where: { id: staff.id },
    data: { status: StaffStatus.ARCHIVED },
    include: {
      salaries: { orderBy: { effectiveFrom: "desc" } },
      payments: true,
    },
  });

  const updatedBalance = computeBalance(updated, updated.salaries, updated.payments);
  const currentSalary = updated.salaries.length > 0 ? Number(updated.salaries[0].monthlyAmount) : 0;
  const { salaries, payments, ...rest } = updated;

  return {
    ...rest,
    balance: updatedBalance,
    currentMonthlySalary: currentSalary,
  };
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
  | {
      type: "accrual";
      bsYear: number;
      bsMonth: number;
      amount: number;
      monthStartAD: Date;
      workedDays: number;
      daysInMonth: number;
      dailyRate: number;
    }
  | { type: "payment"; id: string; amount: number; paidAt: Date; note: string | null; receiptImageUrl: string | null };

/**
 * Get merged transaction list for details view: accrual entries (per BS month) + payments, sorted by date.
 */
export function getStaffTransactions(staff: Staff, salaries: StaffSalary[], payments: StaffPayment[]): TransactionItem[] {
  const startDate = normalizeDateOnlyUTC(new Date(staff.startDate));
  const endDate = staff.status !== StaffStatus.ACTIVE && staff.endDate
    ? normalizeDateOnlyUTC(new Date(staff.endDate))
    : getTodayInNepalDateOnly();
  const startBS = getBSYearMonth(startDate);
  const endBS = getBSYearMonth(endDate);

  const accruals: TransactionItem[] = [];
  for (const { year, month } of iterateBSMonths(startBS.year, startBS.month, endBS.year, endBS.month)) {
    const monthStartAD = firstDayOfBSMonthAD(year, month);
    const nextMonthStartAD = month === 12
      ? firstDayOfBSMonthAD(year + 1, 1)
      : firstDayOfBSMonthAD(year, month + 1);
    const monthEndAD = addDays(nextMonthStartAD, -1);
    const workedStart = maxDate(startDate, monthStartAD);
    const workedEnd = minDate(endDate, monthEndAD);
    const workedDays = inclusiveDays(workedStart, workedEnd);
    if (workedDays <= 0) continue;

    const daysInMonth = getDaysInBSMonth(year, month);
    const monthlySalary = getSalaryForMonth(salaries, monthStartAD);
    const dailyRate = monthlySalary / daysInMonth;
    const amount = dailyRate * workedDays;
    if (amount > 0) {
      accruals.push({ type: "accrual", bsYear: year, bsMonth: month, amount, monthStartAD, workedDays, daysInMonth, dailyRate });
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
