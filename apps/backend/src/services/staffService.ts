/**
 * Staff management service.
 *
 * Two pay types:
 * - MONTHLY: monthly salary, prorated by days worked in each Nepali (BS) month.
 * - DAILY: daily wage for every working day; days marked ABSENT earn nothing and
 *   HALF_DAY earns half.
 *
 * Nothing earned is stored: it is recomputed from start/end dates, salary rates
 * and attendance on every read. All dates stored in DB are AD (UTC midnight).
 */

import NepaliDate from "nepali-date-converter";
import prisma from "../utils/prisma";
import { StaffAttendanceStatus, StaffPayType, StaffStatus } from "@prisma/client";
import type { Staff, StaffSalary, StaffPayment, StaffAttendance } from "@prisma/client";

/** First day of BS month (year, month 1-12) as AD Date at midnight UTC (date only). */
function firstDayOfBSMonthAD(bsYear: number, bsMonth: number): Date {
  const nd = new NepaliDate(bsYear, bsMonth - 1, 1);
  const d = nd.toJsDate();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeDateOnlyUTC(date: Date): Date {
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

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Get BS year and month from an AD date. */
function getBSYearMonth(adDate: Date): { year: number; month: number } {
  const nd = new NepaliDate(adDate);
  return { year: nd.getYear(), month: nd.getMonth() + 1 };
}

/**
 * Return the first day of the BS month that contains the given AD date (at UTC midnight).
 * Monthly salary rates always start on a BS month boundary.
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

/** Newest rate first; for the same effective date the most recently created wins. */
function sortRatesNewestFirst(salaries: StaffSalary[]): StaffSalary[] {
  return [...salaries].sort((a, b) => {
    const byDate = new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime();
    if (byDate !== 0) return byDate;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Rate in effect on a date. Days before the first rate use the first rate, so
 * moving the joining date earlier never makes those days earn nothing.
 */
function getRateOn(sortedNewestFirst: StaffSalary[], date: Date): number {
  if (sortedNewestFirst.length === 0) return 0;
  for (const s of sortedNewestFirst) {
    if (new Date(s.effectiveFrom).getTime() <= date.getTime()) {
      return Number(s.rate);
    }
  }
  return Number(sortedNewestFirst[sortedNewestFirst.length - 1].rate);
}

/** Current date in Nepal (UTC+5:45) so "today" in BS is correct regardless of server TZ. */
export function getTodayInNepalDateOnly(): Date {
  const nepalOffsetMs = 5.75 * 60 * 60 * 1000;
  const inNepal = new Date(Date.now() + nepalOffsetMs);
  return new Date(Date.UTC(inNepal.getUTCFullYear(), inNepal.getUTCMonth(), inNepal.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Last day that earns pay: the end date when stopped, otherwise today in Nepal.
 * Never after today, so an end date saved in the future cannot make unworked days due.
 */
function getAccrualEndDate(staff: Staff): Date {
  const today = getTodayInNepalDateOnly();
  if (staff.status === StaffStatus.ACTIVE || !staff.endDate) return today;
  return minDate(normalizeDateOnlyUTC(new Date(staff.endDate)), today);
}

export interface AccrualLine {
  type: "accrual";
  bsYear: number;
  bsMonth: number;
  amount: number;
  monthStartAD: Date;
  /** Days paid for. Half days count as 0.5. */
  workedDays: number;
  daysInMonth: number;
  /** MONTHLY: salary / days in month. DAILY: the daily rate (latest in the month). */
  dailyRate: number;
  absentDays: number;
  halfDays: number;
}

/** One line per BS month from joining to the accrual end date. */
function computeAccrualLines(
  staff: Staff,
  salaries: StaffSalary[],
  attendance: StaffAttendance[] = []
): AccrualLine[] {
  const startDate = normalizeDateOnlyUTC(new Date(staff.startDate));
  const endDate = getAccrualEndDate(staff);
  if (endDate.getTime() < startDate.getTime()) return [];

  const rates = sortRatesNewestFirst(salaries);
  const isDaily = staff.payType === StaffPayType.DAILY;
  const attendanceByDay = new Map<number, StaffAttendanceStatus>();
  if (isDaily) {
    for (const a of attendance) {
      attendanceByDay.set(normalizeDateOnlyUTC(new Date(a.date)).getTime(), a.status);
    }
  }

  const startBS = getBSYearMonth(startDate);
  const endBS = getBSYearMonth(endDate);
  const lines: AccrualLine[] = [];

  for (const { year, month } of iterateBSMonths(startBS.year, startBS.month, endBS.year, endBS.month)) {
    const monthStartAD = firstDayOfBSMonthAD(year, month);
    const nextMonthStartAD = month === 12
      ? firstDayOfBSMonthAD(year + 1, 1)
      : firstDayOfBSMonthAD(year, month + 1);
    const daysInMonth = Math.round((nextMonthStartAD.getTime() - monthStartAD.getTime()) / DAY_MS);
    const workedStart = maxDate(startDate, monthStartAD);
    const workedEnd = minDate(endDate, addDays(nextMonthStartAD, -1));
    const calendarDays = inclusiveDays(workedStart, workedEnd);
    if (calendarDays <= 0) continue;

    if (isDaily) {
      let amount = 0;
      let workedDays = 0;
      let absentDays = 0;
      let halfDays = 0;
      for (let d = workedStart; d.getTime() <= workedEnd.getTime(); d = addDays(d, 1)) {
        const status = attendanceByDay.get(d.getTime());
        const share = status === StaffAttendanceStatus.ABSENT ? 0 : status === StaffAttendanceStatus.HALF_DAY ? 0.5 : 1;
        if (status === StaffAttendanceStatus.ABSENT) absentDays += 1;
        if (status === StaffAttendanceStatus.HALF_DAY) halfDays += 1;
        workedDays += share;
        amount += getRateOn(rates, d) * share;
      }
      lines.push({
        type: "accrual",
        bsYear: year,
        bsMonth: month,
        amount: roundMoney(amount),
        monthStartAD,
        workedDays,
        daysInMonth,
        dailyRate: getRateOn(rates, workedEnd),
        absentDays,
        halfDays,
      });
    } else {
      const monthlySalary = getRateOn(rates, monthStartAD);
      const dailyRate = monthlySalary / daysInMonth;
      // Whole rupees per month, so a balance can be settled exactly with cash.
      lines.push({
        type: "accrual",
        bsYear: year,
        bsMonth: month,
        amount: Math.round(dailyRate * calendarDays),
        monthStartAD,
        workedDays: calendarDays,
        daysInMonth,
        dailyRate,
        absentDays: 0,
        halfDays: 0,
      });
    }
  }
  return lines;
}

/** Total earned up to today (or the end date if stopped). */
export function computeAccruedSalary(
  staff: Staff,
  salaries: StaffSalary[],
  attendance: StaffAttendance[] = []
): number {
  return roundMoney(computeAccrualLines(staff, salaries, attendance).reduce((sum, line) => sum + line.amount, 0));
}

/**
 * Balance = accrued - total payments.
 * Positive = owner owes staff (due), negative = advance.
 */
export function computeBalance(
  staff: Staff,
  salaries: StaffSalary[],
  payments: StaffPayment[],
  attendance: StaffAttendance[] = []
): number {
  const accrued = computeAccruedSalary(staff, salaries, attendance);
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  return roundMoney(accrued - totalPayments);
}

/** Rate in effect today, or on the last working day for stopped staff. A future raise is not "current" yet. */
export function getCurrentRate(staff: Staff, salaries: StaffSalary[]): number {
  return getRateOn(sortRatesNewestFirst(salaries), getAccrualEndDate(staff));
}

export interface StaffWithBalance extends Staff {
  balance: number;
  currentRate: number;
}

export interface StaffSummary {
  totalStaff: number;
  activeStaff: number;
  stoppedStaff: number;
  monthlyStaff: number;
  dailyStaff: number;
  totalSalaryExpense: number;
  totalSalaryPayments: number;
  remainingBalance: number;
}

export type StaffStatusFilter = StaffStatus | "ALL";
export type StaffPayTypeFilter = StaffPayType | "ALL";

async function getStaffAccountingRows(
  ownerId: string,
  statusFilter: StaffStatusFilter = "ALL",
  payTypeFilter: StaffPayTypeFilter = "ALL"
) {
  return prisma.staff.findMany({
    where: {
      ownerId,
      ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
      ...(payTypeFilter === "ALL" ? {} : { payType: payTypeFilter }),
    },
    include: {
      salaries: { orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }] },
      payments: true,
      attendance: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * List staff for owner with computed balance and current rate.
 */
export async function listStaffForOwner(
  ownerId: string,
  statusFilter: StaffStatusFilter = "ALL",
  payTypeFilter: StaffPayTypeFilter = "ALL"
): Promise<StaffWithBalance[]> {
  const staffList = await getStaffAccountingRows(ownerId, statusFilter, payTypeFilter);

  return staffList.map((s) => {
    const balance = computeBalance(s, s.salaries, s.payments, s.attendance);
    const currentRate = getCurrentRate(s, s.salaries);
    const { salaries, payments, attendance, ...staff } = s;
    return {
      ...staff,
      balance,
      currentRate,
    };
  });
}

export async function getStaffSummaryForOwner(ownerId: string): Promise<StaffSummary> {
  const staffList = await getStaffAccountingRows(ownerId);

  return staffList.reduce<StaffSummary>(
    (summary, staff) => {
      const salaryExpense = computeAccruedSalary(staff, staff.salaries, staff.attendance);
      const payments = staff.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

      summary.totalStaff += 1;
      summary.totalSalaryExpense = roundMoney(summary.totalSalaryExpense + salaryExpense);
      summary.totalSalaryPayments = roundMoney(summary.totalSalaryPayments + payments);
      summary.remainingBalance = roundMoney(summary.remainingBalance + salaryExpense - payments);

      if (staff.status === StaffStatus.ACTIVE) summary.activeStaff += 1;
      else summary.stoppedStaff += 1;
      if (staff.payType === StaffPayType.DAILY) summary.dailyStaff += 1;
      else summary.monthlyStaff += 1;

      return summary;
    },
    {
      totalStaff: 0,
      activeStaff: 0,
      stoppedStaff: 0,
      monthlyStaff: 0,
      dailyStaff: 0,
      totalSalaryExpense: 0,
      totalSalaryPayments: 0,
      remainingBalance: 0,
    }
  );
}

export async function getStaffById(staffId: string, ownerId: string) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, ownerId },
    include: {
      salaries: { orderBy: [{ effectiveFrom: "asc" }, { createdAt: "asc" }] },
      payments: { orderBy: { paidAt: "desc" } },
      attendance: { orderBy: { date: "asc" } },
    },
  });
  if (!staff) return null;
  return {
    ...staff,
    balance: computeBalance(staff, staff.salaries, staff.payments, staff.attendance),
    currentRate: getCurrentRate(staff, staff.salaries),
  };
}

export type TransactionItem =
  | AccrualLine
  | { type: "payment"; id: string; amount: number; paidAt: Date; note: string | null; receiptImageUrl: string | null };

/**
 * Get merged transaction list for details view: accrual entries (per BS month) + payments, sorted by date.
 */
export function getStaffTransactions(
  staff: Staff,
  salaries: StaffSalary[],
  payments: StaffPayment[],
  attendance: StaffAttendance[] = []
): TransactionItem[] {
  const accruals: TransactionItem[] = computeAccrualLines(staff, salaries, attendance).filter(
    (line) => line.amount > 0
  );

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
