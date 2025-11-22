"use client";

import { useCalendar } from "@/common/hooks/useCalendar";

interface DateDisplayProps {
  date: Date | string;
  format?: "short" | "long" | "relative";
  className?: string;
}

/**
 * DateDisplay Component
 * Displays dates according to user's calendar preference (BS or AD)
 * Always receives AD dates (ISO format) from database
 * Automatically converts and displays in user's preferred format
 */
export function DateDisplay({
  date,
  format = "short",
  className,
}: DateDisplayProps) {
  const { toDisplayDate, formatRelativeDate, calendarType } = useCalendar();

  // Handle invalid/empty dates
  if (!date) {
    return <span className={className}>-</span>;
  }

  try {
    const displayText =
      format === "relative"
        ? formatRelativeDate(date)
        : toDisplayDate(date, format === "long" ? "long" : "short");

    return (
      <span className={className} title={`${calendarType} Calendar`}>
        {displayText}
      </span>
    );
  } catch (error) {
    console.error("Date display error:", error);
    // Fallback to ISO string if conversion fails
    const fallback =
      typeof date === "string" ? date : date.toISOString().split("T")[0];
    return <span className={className}>{fallback}</span>;
  }
}
