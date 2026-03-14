export type CalendarType = "AD" | "BS";
export declare const toDisplayDate: (date: Date | string, calendarType?: CalendarType, format?: "short" | "long") => string;
export declare const toISODate: (dateString: string, calendarType?: CalendarType) => Date;
export declare const formatRelativeDate: (date: Date | string, calendarType?: CalendarType) => string;
