/** Shared number and time formats for the Cash in hand screens. */

import { NEPAL_TIME_ZONE } from "@/common/lib/nepali-date";

// Lakh commas ("1,13,100.00"); the रू sign is added in formatCashAmount.
const amountFormat = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const nepalTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: NEPAL_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function formatCashAmount(value: number | string | null | undefined) {
  const n = Number(value || 0);
  return `${n < 0 ? "-" : ""}रू ${amountFormat.format(Math.abs(n))}`;
}

/** Time in Nepal, whatever the device time zone is. */
export function formatNepalTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : nepalTime.format(date);
}
