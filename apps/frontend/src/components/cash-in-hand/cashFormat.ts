/** Shared number and time formats for the Cash in hand screens. */

const amountFormat = new Intl.NumberFormat("en-NP", {
  style: "currency",
  currency: "NPR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const nepalTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kathmandu",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function formatCashAmount(value: number | string | null | undefined) {
  return amountFormat.format(Number(value || 0));
}

/** Time in Nepal, whatever the device time zone is. */
export function formatNepalTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : nepalTime.format(date);
}
