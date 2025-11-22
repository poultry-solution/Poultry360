"use client";

import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { useCalendar } from "@/common/hooks/useCalendar";
import { useState, useEffect } from "react";
// @ts-ignore - Type definitions not available for this package
import Calendar from "@sbmdkl/nepali-datepicker-reactjs";
import "@sbmdkl/nepali-datepicker-reactjs/dist/index.css";

interface DateInputProps {
  label?: string;
  value: string; // ISO date string (AD format) - always stored as AD
  onChange: (value: string) => void; // Receives ISO date string
  min?: string; // ISO date string
  max?: string; // ISO date string
  className?: string;
}

export function DateInput({
  label,
  value,
  onChange,
  min,
  max,
  className,
}: DateInputProps) {
  const { isBS } = useCalendar();

  // Convert stored AD value to display format
  const adValue = value ? (value.includes("T") ? value.split("T")[0] : value) : "";

  // State for input value
  const [inputValue, setInputValue] = useState(adValue);

  // Update input value when value prop changes
  useEffect(() => {
    if (value) {
      const ad = value.includes("T") ? value.split("T")[0] : value;
      setInputValue(ad);
    } else {
      setInputValue("");
    }
  }, [value]);

  // Handle AD date input change
  const handleADChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setInputValue(inputValue);

    try {
      const adDate = new Date(inputValue + "T00:00:00");
      if (isNaN(adDate.getTime())) {
        return; // Invalid date
      }
      
      // Always save as AD (ISO format)
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

  // Get default date for BS calendar (convert AD to Date object)
  const getDefaultDate = () => {
    if (!value) return undefined;
    try {
      return new Date(value);
    } catch {
      return undefined;
    }
  };

  return (
    <div className={className}>
      {label && <Label className="mb-2">{label}</Label>}
      
      {isBS ? (
        // BS Date Picker - Only show BS calendar for BS users
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
