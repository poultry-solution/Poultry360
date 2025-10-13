import { useUser } from "@/common/store/store";
// import {
//   toDisplayDate,
//   toISODate,
//   formatRelativeDate,
//   CalendarType,
// } from "@myapp/utils/calendar"; // Removed - no longer using shared packages

type CalendarType = 'AD' | 'BS';

// Simple fallback functions
const toDisplayDate = (date: Date | string, calendarType: CalendarType, format?: 'short' | 'long'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString();
};

const toISODate = (dateString: string, calendarType: CalendarType): string => {
  return new Date(dateString).toISOString();
};

const formatRelativeDate = (date: Date | string, calendarType: CalendarType): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  return `${diffInDays} days ago`;
};

export const useCalendar = () => {
  const user = useUser();
  const calendarType: CalendarType = user?.calendarType || "AD";

  return {
    calendarType,
    toDisplayDate: (date: Date | string, format?: "short" | "long") =>
      toDisplayDate(date, calendarType, format),
    toISODate: (dateString: string) => toISODate(dateString, calendarType),
    formatRelativeDate: (date: Date | string) =>
      formatRelativeDate(date, calendarType),
  };
};
