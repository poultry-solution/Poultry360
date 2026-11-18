import { toNepalDayAd } from "@/common/lib/nepali-date";

type ListingDateFields = {
  availabilityFrom?: string;
  availabilityTo?: string;
};

const LEGACY_UTC_END_SUFFIX = "T23:59:59.999Z";

function legacyDayEndToNepal(iso?: string): string | undefined {
  if (!iso?.endsWith(LEGACY_UTC_END_SUFFIX)) return iso;
  return `${iso.slice(0, -1)}+05:45`;
}

/**
 * Old listing rows used 23:59 UTC as a day end. That instant is the next Nepal
 * day, so reinterpret that exact legacy encoding as 23:59 Nepal for display
 * and the next edit. Other real timestamps are left unchanged.
 */
export function normalizeListingDates<T extends ListingDateFields>(item: T): T {
  return {
    ...item,
    availabilityTo: legacyDayEndToNepal(item.availabilityTo),
  };
}

/** Build full Nepal-day bounds from the days currently shown in the form. */
export function buildListingAvailabilityBounds(
  availabilityFrom: Date | string,
  availabilityTo: Date | string
): { availabilityFrom: string; availabilityTo: string } {
  const fromDay = toNepalDayAd(availabilityFrom);
  const toDay = toNepalDayAd(availabilityTo);
  return {
    availabilityFrom: fromDay ? `${fromDay}T00:00:00.000+05:45` : "",
    availabilityTo: toDay ? `${toDay}T23:59:59.999+05:45` : "",
  };
}
