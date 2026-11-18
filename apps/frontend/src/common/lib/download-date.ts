import { toNepalDayAd } from "@/common/lib/nepali-date";

export type DownloadDateRange = {
  startDate?: string;
  endDate?: string;
};

/** Keep rows whose timestamps fall inside the selected inclusive Nepal days. */
export function filterRowsByDate<T>(
  rows: T[],
  range: DownloadDateRange,
  getDate: (row: T) => string | Date | null | undefined
) {
  if (!range.startDate && !range.endDate) return rows;
  return rows.filter((row) => {
    const value = getDate(row);
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const day = toNepalDayAd(date);
    return (!range.startDate || day >= range.startDate) &&
      (!range.endDate || day <= range.endDate);
  });
}
