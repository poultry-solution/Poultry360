import NepaliDate from "nepali-date-converter";

export type CalendarType = "AD" | "BS";

export const toDisplayDate = (
  date: Date | string,
  calendarType: CalendarType = "AD",
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

export const toISODate = (
  dateString: string,
  calendarType: CalendarType = "AD"
): Date => {
  if (calendarType === "BS") {
    const [year, month, day] = dateString.split("-").map(Number);
    const nepaliDate = new NepaliDate(year, month - 1, day);
    return nepaliDate.toJsDate();
  }

  return new Date(dateString);
};

export const formatRelativeDate = (
  date: Date | string,
  calendarType: CalendarType = "AD"
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays === -1) return "Tomorrow";
  if (diffDays > 0 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 0 && diffDays > -7) return `In ${Math.abs(diffDays)} days`;

  return toDisplayDate(dateObj, calendarType, "long");
};
