import { useUser } from "@/common/store/store";
import NepaliDate from "nepali-date-converter";

export type CalendarType = "AD" | "BS";

/**
 * Hook for calendar operations based on user preference
 * Always stores dates as AD (ISO format) in database
 * Displays dates according to user's calendar preference (BS or AD)
 */
export const useCalendar = () => {
  const user = useUser();
  const calendarType: CalendarType = (user?.calendarType || "AD") as CalendarType;
  const isBS = calendarType === "BS";

  /**
   * Convert AD date to BS format (YYYY-MM-DD)
   */
  const convertADtoBS = (adDate: Date | string): string => {
    try {
      const dateObj = typeof adDate === "string" ? new Date(adDate) : adDate;
      const nepaliDate = new NepaliDate(dateObj);
      const year = nepaliDate.getYear();
      const month = nepaliDate.getMonth() + 1;
      const day = nepaliDate.getDate();
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    } catch (error) {
      console.error("AD to BS conversion error:", error);
      return "";
    }
  };

  /**
   * Convert BS date string (YYYY-MM-DD) to AD Date
   */
  const convertBSToAD = (bsDateString: string): Date => {
    try {
      const [year, month, day] = bsDateString.split("-").map(Number);
      const nepaliDate = new NepaliDate(year, month - 1, day);
      return nepaliDate.toJsDate();
    } catch (error) {
      console.error("BS to AD conversion error:", error);
      throw error;
    }
  };

  /**
   * Display date in user's preferred calendar format
   * @param date - AD date (from database)
   * @param format - 'short' (YYYY-MM-DD) or 'long' (Month Day, Year)
   */
  const toDisplayDate = (
    date: Date | string,
    format: "short" | "long" = "short"
  ): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (calendarType === "BS") {
      const nepaliDate = new NepaliDate(dateObj);
      const year = nepaliDate.getYear();
      const month = nepaliDate.getMonth() + 1;
      const day = nepaliDate.getDate();

      if (format === "long") {
        const monthNames = [
          "Baisakh",
          "Jestha",
          "Ashadh",
          "Shrawan",
          "Bhadra",
          "Ashwin",
          "Kartik",
          "Mangsir",
          "Poush",
          "Magh",
          "Falgun",
          "Chaitra",
        ];
        return `${monthNames[month - 1]} ${day}, ${year}`;
      }

      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    // AD format
    if (format === "long") {
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    return dateObj.toISOString().split("T")[0];
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
    // If input is BS, convert to AD
    if (inputCalendarType === "BS" || (!inputCalendarType && isBS)) {
      return convertBSToAD(dateString);
    }

    // Otherwise, treat as AD
    return new Date(dateString);
  };

  /**
   * Format relative date (Today, Yesterday, etc.) or full date
   */
  const formatRelativeDate = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
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

