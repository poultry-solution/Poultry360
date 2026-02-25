import { EFFECTIVE_CALENDAR_TYPE } from "@/common/config/calendar";
import { useUser } from "@/common/store/store";
import {
  convertADtoBS,
  convertBSToAD,
  formatADShort,
  formatBSLong,
  parseDateStringLocal,
  type CalendarType,
} from "@/common/lib/nepali-date";

export type { CalendarType };

/**
 * Hook for calendar operations. Effective calendar is forced to Nepali (BS) for all users;
 * stored preference and toggle UI are kept internally for future re-enablement.
 * Always stores dates as AD (ISO format) in database; displays in effective calendar (BS).
 */
export const useCalendar = () => {
  useUser(); // keep subscription so hook still updates when user changes
  const calendarType: CalendarType = EFFECTIVE_CALENDAR_TYPE;
  const isBS = calendarType === "BS";

  /**
   * Display date in user's preferred calendar format
   * @param date - AD date (from database)
   * @param format - 'short' (YYYY-MM-DD) or 'long' (Month Day, Year)
   */
  const toDisplayDate = (
    date: Date | string,
    format: "short" | "long" = "short"
  ): string => {
    const dateObj =
      typeof date === "string" ? parseDateStringLocal(date) : date;
    if (isNaN(dateObj.getTime())) return "";

    if (calendarType === "BS") {
      if (format === "long") return formatBSLong(dateObj);
      return convertADtoBS(dateObj);
    }

    if (format === "long") {
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    return formatADShort(dateObj);
  };

  /**
   * Convert date string to AD Date (ISO format) for storage
   * @param dateString - Date string in either BS or AD format
   * @param inputCalendarType - Calendar type of the input ('BS' or 'AD')
   */
  const toISODate = (
    dateString: string,
    inputCalendarType?: CalendarType
  ): Date => {
    if (inputCalendarType === "BS" || (!inputCalendarType && isBS)) {
      return convertBSToAD(dateString);
    }
    return parseDateStringLocal(dateString);
  };

  /**
   * Format relative date (Today, Yesterday, etc.) or full date
   */
  const formatRelativeDate = (date: Date | string): string => {
    const dateObj =
      typeof date === "string" ? parseDateStringLocal(date) : date;
    if (isNaN(dateObj.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays === -1) return "Tomorrow";
    if (diffDays > 0 && diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 0 && diffDays > -7) return `In ${Math.abs(diffDays)} days`;

    return toDisplayDate(dateObj, "long");
  };

  return {
    calendarType,
    isBS,
    toDisplayDate,
    toISODate,
    convertADtoBS,
    convertBSToAD,
    formatRelativeDate,
  };
};
