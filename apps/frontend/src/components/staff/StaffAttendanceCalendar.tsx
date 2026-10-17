"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { getTodayLocalDate } from "@/common/lib/utils";
import {
  BS_MONTH_NAMES,
  getBSYearMonthFromAD,
  getFirstDayOfBSMonthAD,
} from "@/common/lib/nepali-date";
import {
  useSetStaffAttendance,
  type AttendanceStatus,
  type StaffAttendance,
  type StaffOwner,
} from "@/fetchers/staff/staffQueries";

interface StaffAttendanceCalendarProps {
  owner: StaffOwner;
  staffId: string;
  startDate: string;
  endDate: string | null;
  attendance: StaffAttendance[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Tapping a day moves it to the next status. */
const NEXT_STATUS: Record<AttendanceStatus, AttendanceStatus> = {
  PRESENT: "ABSENT",
  ABSENT: "HALF_DAY",
  HALF_DAY: "PRESENT",
};

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  PRESENT: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  ABSENT: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  HALF_DAY: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
};

/** Date strings are plain YYYY-MM-DD days; UTC math keeps them stable in any timezone. */
function addDaysToDateString(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

function shiftBSMonth(year: number, month: number, by: number) {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * Attendance for a daily wage worker, one BS month at a time. Every day counts
 * as present unless marked, so the owner only taps the days someone missed.
 */
export function StaffAttendanceCalendar({
  owner,
  staffId,
  startDate,
  endDate,
  attendance,
}: StaffAttendanceCalendarProps) {
  const firstDay = startDate.split("T")[0];
  const today = getTodayLocalDate();
  const savedEnd = endDate ? endDate.split("T")[0] : today;
  const lastDay = savedEnd < today ? savedEnd : today;

  const [shown, setShown] = useState(() => getBSYearMonthFromAD(lastDay));
  const setAttendance = useSetStaffAttendance(owner);
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  const statusByDate = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const a of attendance) map.set(a.date.split("T")[0], a.status);
    return map;
  }, [attendance]);

  const monthStart = getFirstDayOfBSMonthAD(shown.year, shown.month);
  const next = shiftBSMonth(shown.year, shown.month, 1);
  const daysInMonth = daysBetween(monthStart, getFirstDayOfBSMonthAD(next.year, next.month));
  const [y, m, d] = monthStart.split("-").map(Number);
  const leadingBlanks = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = addDaysToDateString(monthStart, i);
    return {
      bsDay: i + 1,
      date,
      status: statusByDate.get(date) ?? ("PRESENT" as AttendanceStatus),
      inRange: date >= firstDay && date <= lastDay,
    };
  });
  const counted = days.filter((day) => day.inRange);
  const absent = counted.filter((day) => day.status === "ABSENT").length;
  const half = counted.filter((day) => day.status === "HALF_DAY").length;

  const canGoBack = getFirstDayOfBSMonthAD(shown.year, shown.month) > firstDay;
  const canGoForward = getFirstDayOfBSMonthAD(next.year, next.month) <= lastDay;

  const toggle = async (date: string, status: AttendanceStatus) => {
    setPendingDate(date);
    try {
      await setAttendance.mutateAsync({
        staffId,
        date: `${date}T00:00:00.000Z`,
        status: NEXT_STATUS[status],
      });
    } finally {
      setPendingDate(null);
    }
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={!canGoBack}
          onClick={() => setShown(shiftBSMonth(shown.year, shown.month, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold">
            {BS_MONTH_NAMES[shown.month - 1]} {shown.year}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {counted.length - absent - half * 0.5} days worked · {absent} absent · {half} half day
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={!canGoForward}
          onClick={() => setShown(next)}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="text-[10px] font-medium uppercase text-muted-foreground">
            {weekday}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((day) =>
          day.inRange ? (
            <button
              key={day.date}
              type="button"
              title={day.date}
              disabled={pendingDate !== null}
              onClick={() => toggle(day.date, day.status)}
              className={`flex h-9 flex-col items-center justify-center rounded-md border text-xs font-medium transition-colors disabled:opacity-60 ${STATUS_STYLE[day.status]}`}
            >
              {day.bsDay}
              {day.status !== "PRESENT" && (
                <span className="text-[8px] font-semibold leading-none">
                  {day.status === "ABSENT" ? "A" : "½"}
                </span>
              )}
            </button>
          ) : (
            <span
              key={day.date}
              className="flex h-9 items-center justify-center rounded-md text-xs text-muted-foreground/40"
            >
              {day.bsDay}
            </span>
          )
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-200" /> Present
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-200" /> Absent
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-200" /> Half day
        </span>
        <span>Tap a day to change it.</span>
      </div>
    </div>
  );
}
