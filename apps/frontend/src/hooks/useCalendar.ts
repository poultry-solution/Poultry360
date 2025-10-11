import { useUser } from '@/store/store';
import { toDisplayDate, toISODate, formatRelativeDate, CalendarType } from '@myapp/utils/calendar';

export const useCalendar = () => {
  const user = useUser();
  const calendarType: CalendarType = user?.calendarType || 'AD';
  
  return {
    calendarType,
    toDisplayDate: (date: Date | string, format?: 'short' | 'long') => 
      toDisplayDate(date, calendarType, format),
    toISODate: (dateString: string) => 
      toISODate(dateString, calendarType),
    formatRelativeDate: (date: Date | string) => 
      formatRelativeDate(date, calendarType),
  };
};
