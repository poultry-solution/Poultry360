import type { CalendarType } from "@/common/lib/nepali-date";

/**
 * Calendar feature flags. Kept for easy re-enablement of AD/BS switching.
 * - EFFECTIVE_CALENDAR_TYPE: Calendar used for display/inputs regardless of stored preference.
 * - CALENDAR_TOGGLE_VISIBLE: When false, hide all UI that lets users switch between AD and Nepali.
 */
export const EFFECTIVE_CALENDAR_TYPE: CalendarType = "BS";
export const CALENDAR_TOGGLE_VISIBLE = false;


