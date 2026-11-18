import { EFFECTIVE_CALENDAR_TYPE } from "@/common/config/calendar";
import { useUser } from "@/common/store/store";
import {
  convertADtoBS,
  convertBSToAD,
  formatADShort,
  formatBSLong,
  differenceInNepalDays,
  getNepalTodayAd,
  toNepalDayAd,
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
    const day = toNepalDayAd(date);
    if (!day) return "";

    if (calendarType === "BS") {
      if (format === "long") return formatBSLong(day);
      return convertADtoBS(day);
    }

    if (format === "long") {
      return new Date(`${day}T00:00:00.000Z`).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
    }

    return formatADShort(day);
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
    return new Date(`${dateString}T00:00:00.000Z`);
  };

  /**
   * Format relative date (Today, Yesterday, etc.) or full date
   */
  const formatRelativeDate = (date: Date | string): string => {
    const day = toNepalDayAd(date);
    if (!day) return "";
    const diffDays = differenceInNepalDays(getNepalTodayAd(), day);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays === -1) return "Tomorrow";
    if (diffDays > 0 && diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 0 && diffDays > -7) return `In ${Math.abs(diffDays)} days`;

    return toDisplayDate(day, "long");
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
