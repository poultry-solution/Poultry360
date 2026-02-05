"use client";

import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { useCalendar } from "@/common/hooks/useCalendar";
import { parseDateStringLocal } from "@/common/lib/nepali-date";
import { useState, useEffect } from "react";
// @ts-ignore - Type definitions not available for this package
import Calendar from "@sbmdkl/nepali-datepicker-reactjs";
import "@sbmdkl/nepali-datepicker-reactjs/dist/index.css";

interface DateInputProps {
  label?: string;
  value: string | Date | null | undefined; // ISO date string or Date (AD format) - always stored as AD
  onChange: (value: string) => void; // Receives ISO date string
  min?: string; // ISO date string
  max?: string; // ISO date string
  className?: string;
  /** When true, always use native AD date input (avoids BS Calendar e.g. in modals where it can crash) */
  preferNativeInput?: boolean;
}

export function DateInput({
  label,
  value,
  onChange,
  min,
  max,
  className,
  preferNativeInput = false,
}: DateInputProps) {
  const { isBS } = useCalendar();
  const useBSCalendar = isBS && !preferNativeInput;

  // Normalize value to string (callers may pass Date or other)
  const valueStr =
    value == null
      ? ""
      : typeof value === "string"
        ? value
        : value instanceof Date
          ? (isNaN(value.getTime()) ? "" : value.toISOString())
          : String(value);

  // Convert stored AD value to display format
  const adValue = valueStr ? (valueStr.includes("T") ? valueStr.split("T")[0] : valueStr) : "";

  // State for input value
  const [inputValue, setInputValue] = useState(adValue);

  // Update input value when value prop changes
  useEffect(() => {
    if (valueStr) {
      const ad = valueStr.includes("T") ? valueStr.split("T")[0] : valueStr;
      setInputValue(ad);
    } else {
      setInputValue("");
    }
  }, [valueStr]);

  // Handle AD date input change - parse as local to avoid UTC-midnight edge cases
  const handleADChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);

    try {
      const adDate = parseDateStringLocal(raw);
      if (isNaN(adDate.getTime())) return;
      onChange(adDate.toISOString());
    } catch (error) {
      console.error("Date conversion error:", error);
    }
  };

  // Handle BS date picker change
  // The Calendar component provides both bsDate and adDate
  const handleBSDateChange = ({ bsDate, adDate }: { bsDate: string; adDate: string }) => {
    try {
      // Use the adDate provided by the calendar component
      const date = new Date(adDate);
      if (isNaN(date.getTime())) {
        return; // Invalid date
      }
      // Always save as AD (ISO format) - this is what gets stored in DB
      onChange(date.toISOString());
      setInputValue(adDate.split("T")[0]); // Update display value
    } catch (error) {
      console.error("BS date conversion error:", error);
    }
  };

  // Get default date for BS calendar (never pass undefined - package can crash)
  // Use parseDateStringLocal to avoid UTC-midnight edge cases
  const getDefaultDate = (): Date => {
    if (adValue) {
      const d = parseDateStringLocal(adValue);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  return (
    <div className={className}>
      {label && <Label className="mb-2">{label}</Label>}
      
      {useBSCalendar ? (
        // BS Date Picker - Only show BS calendar for BS users (not in modals)
        <Calendar
          onChange={handleBSDateChange}
          defaultDate={getDefaultDate()}
          theme="light"
          {...({ language: "en" } as any)}
        />
      ) : (
        // AD Date Input (HTML5 date picker) - Only show AD picker for AD users
        <Input
          type="date"
          value={inputValue}
          onChange={handleADChange}
          min={min}
          max={max}
          className="w-full"
        />
      )}
    </div>
  );
}
