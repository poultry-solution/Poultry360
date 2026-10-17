"use client";

import { useState } from "react";
import { NepaliDatePicker } from "@/common/components/ui/nepali-date-picker";
import {
  convertADtoBS,
  getBSYearMonthFromAD,
  getFirstDayOfBSMonthAD,
  getNepalTodayAd,
} from "@/common/lib/nepali-date";

/** AD YYYY-MM-DD dates; the server reads them as full Nepal days. */
export type DateRange = { startDate: string; endDate: string };

/** Problem with a custom range, or null when it can be used. */
export function getRangeError(startDate: string, endDate: string, today: string): string | null {
  if (!startDate || !endDate) return "Please pick both dates.";
  if (startDate > today || endDate > today) return "Dates cannot be in the future.";
  if (startDate > endDate) return "Start date must be on or before end date.";
  return null;
}

export function toBsLabel(adDate: string) {
  try {
    return convertADtoBS(adDate);
  } catch {
    return adDate;
  }
}

export function describeRange(range: DateRange | null) {
  if (!range) return "All time";
  const start = toBsLabel(range.startDate);
  const end = toBsLabel(range.endDate);
  return start === end ? start : `${start} to ${end}`;
}

/**
 * All time by default; "Custom" starts at the 1st of this Nepali month → today.
 * While the picked dates are wrong, `appliedRange` keeps the last good range.
 */
export function useNepaliDateRange() {
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customStartAd, setCustomStartAd] = useState("");
  const [customEndAd, setCustomEndAd] = useState("");
  const [appliedRange, setAppliedRange] = useState<DateRange | null>(null);

  const rangeError = isCustomRange ? getRangeError(customStartAd, customEndAd, getNepalTodayAd()) : null;

  const setCustomDates = (startDate: string, endDate: string) => {
    setCustomStartAd(startDate);
    setCustomEndAd(endDate);
    if (!getRangeError(startDate, endDate, getNepalTodayAd())) {
      setAppliedRange({ startDate, endDate });
    }
  };

  const showCustomRange = () => {
    if (isCustomRange) return;
    const today = getNepalTodayAd();
    const { year, month } = getBSYearMonthFromAD(today);
    setIsCustomRange(true);
    setCustomDates(getFirstDayOfBSMonthAD(year, month), today);
  };

  const showAllTime = () => {
    setIsCustomRange(false);
    setCustomStartAd("");
    setCustomEndAd("");
    setAppliedRange(null);
  };

  return {
    isCustomRange,
    customStartAd,
    customEndAd,
    appliedRange,
    rangeError,
    rangeLabel: describeRange(appliedRange),
    setCustomDates,
    showCustomRange,
    showAllTime,
  };
}

export type NepaliDateRangeState = ReturnType<typeof useNepaliDateRange>;

/** "All time | Custom dates" switch. */
export function RangeModeSwitch({ state, size = "md" }: { state: NepaliDateRangeState; size?: "sm" | "md" }) {
  const pad = size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
      {([
        { key: "all", label: "All time", active: !state.isCustomRange, onClick: state.showAllTime },
        { key: "custom", label: size === "sm" ? "Custom" : "Custom dates", active: state.isCustomRange, onClick: state.showCustomRange },
      ] as const).map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={option.onClick}
          className={`flex-1 rounded font-medium transition-colors sm:flex-none ${pad} ${option.active ? "bg-primary text-primary-foreground shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Start / end Nepali pickers plus the error line. Render only when custom is on. */
export function CustomRangePickers({ state }: { state: NepaliDateRangeState }) {
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Start date</p>
          <NepaliDatePicker
            defaultDate={state.customStartAd ? toBsLabel(state.customStartAd) : undefined}
            onChange={({ adDate }) => state.setCustomDates(adDate.split("T")[0], state.customEndAd)}
            className="w-full rounded-md border border-gray-300"
            theme="light"
            language="en"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">End date</p>
          <NepaliDatePicker
            defaultDate={state.customEndAd ? toBsLabel(state.customEndAd) : undefined}
            onChange={({ adDate }) => state.setCustomDates(state.customStartAd, adDate.split("T")[0])}
            className="w-full rounded-md border border-gray-300"
            theme="light"
            language="en"
          />
        </div>
      </div>
      {state.rangeError ? (
        <p className="text-sm text-red-600">
          {state.rangeError} Still showing {state.rangeLabel}.
        </p>
      ) : null}
    </div>
  );
}
