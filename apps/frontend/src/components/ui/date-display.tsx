"use client";

import { useCalendar } from "@/hooks/useCalendar";

interface DateDisplayProps {
  date: Date | string;
  format?: 'short' | 'long' | 'relative';
  className?: string;
}

export function DateDisplay({ date, format = 'short', className }: DateDisplayProps) {
  const { toDisplayDate, formatRelativeDate, calendarType } = useCalendar();
  
  const displayText = format === 'relative' 
    ? formatRelativeDate(date)
    : toDisplayDate(date, format === 'long' ? 'long' : 'short');
  
  return (
    <span className={className} title={`${calendarType} Calendar`}>
      {displayText}
    </span>
  );
}
