"use client";

import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { useCalendar } from "@/common/hooks/useCalendar";
import { convertADtoBS } from "@/common/lib/nepali-date";
// @ts-ignore - Type definitions not available for this package
import Calendar from "@sbmdkl/nepali-datepicker-reactjs";
import "@sbmdkl/nepali-datepicker-reactjs/dist/index.css";

interface DateInputProps {
  label?: string;
  value: string | Date | null | undefined;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
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
  const useBSInput = isBS && !preferNativeInput;

  // Normalize value to AD date string (YYYY-MM-DD)
  const getADValue = (): string => {
    if (!value) return "";
    
    try {
      if (typeof value === "string") {
        return value.includes("T") ? value.split("T")[0] : value;
      }
      if (value instanceof Date && !isNaN(value.getTime())) {
        return value.toISOString().split("T")[0];
      }
    } catch (err) {
      console.error("Error normalizing value:", err);
    }
    return "";
  };

  const adValue = getADValue();

  const handleADChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Only update if it's a valid date
    if (raw && raw.length === 10) { // YYYY-MM-DD format
      try {
        const date = new Date(raw);
        if (!isNaN(date.getTime())) {
          onChange(date.toISOString());
        }
      } catch (err) {
        console.error("Date conversion error:", err);
      }
    }
  };

  const handleBSPickerChange = ({ adDate }: { bsDate: string; adDate: string }) => {
    try {
      const date = new Date(adDate);
      if (!isNaN(date.getTime())) {
        onChange(date.toISOString());
      }
    } catch (err) {
      console.error("BS date picker error:", err);
    }
  };

  // Get default date for BS picker (in BS format)
  const getDefaultDateForPicker = (): string => {
    if (adValue) {
      try {
        const bsDate = convertADtoBS(adValue);
        return bsDate;
      } catch (err) {
        console.error("Error converting current value to BS:", err);
      }
    }
    
    // Fallback to today
    try {
      const today = new Date().toISOString().split("T")[0];
      return convertADtoBS(today);
    } catch (err) {
      console.error("Error getting today's BS date:", err);
      return "";
    }
  };

  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}
      
      {useBSInput ? (
        <Calendar
          key={adValue || "empty"}
          onChange={handleBSPickerChange}
          defaultDate={getDefaultDateForPicker()}
          minDate={min}
          maxDate={max}
          className="w-full rounded-md border border-input"
          theme="dark"
          language="en"
        />
      ) : (
        <Input
          type="date"
          value={adValue}
          onChange={handleADChange}
          min={min}
          max={max}
          className="w-full"
        />
      )}
    </div>
  );
}