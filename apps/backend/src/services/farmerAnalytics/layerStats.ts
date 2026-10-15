import { toNepalDayKey } from "../../utils/nepalBsDate";
import { dayKeyFromNumber, dayNumber } from "./period";

/**
 * Hens alive at the start of each Nepal day of a layer batch, between two days.
 * Losses (natural deaths and hens sold) count from the day after they happen,
 * so laying % for a day = eggs that day ÷ hens that morning.
 */
export function hensByDay(
  batch: { startDate: Date; initialChicks: number },
  losses: Array<{ date: Date; count: number }>,
  fromDay: string,
  toDay: string
): Map<string, number> {
  const lossByDay = new Map<number, number>();
  for (const row of losses) {
    const n = dayNumber(toNepalDayKey(row.date));
    lossByDay.set(n, (lossByDay.get(n) ?? 0) + row.count);
  }
  const firstBatchDay = dayNumber(toNepalDayKey(batch.startDate));
  const from = Math.max(dayNumber(fromDay), firstBatchDay);
  const to = dayNumber(toDay);
  const hens = new Map<string, number>();
  let lost = 0;
  for (const [n, count] of lossByDay) if (n < from) lost += count;
  for (let n = from; n <= to; n++) {
    hens.set(dayKeyFromNumber(n), Math.max(0, batch.initialChicks - lost));
    lost += lossByDay.get(n) ?? 0;
  }
  return hens;
}

/** Laying % from eggs and hen-days (null when there were no hens). */
export const layingPercent = (eggs: number, henDays: number) =>
  henDays > 0 ? Math.round((eggs / henDays) * 1000) / 10 : null;
