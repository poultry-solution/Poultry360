import { formatBSLong, getNepalTodayAd } from "@/common/lib/nepali-date";

/**
 * Reminder times are always Nepal time (UTC+5:45, no daylight saving),
 * whatever time zone the phone is set to.
 */
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
const DAY_MS = 86_400_000;

/** "2026-11-06" + "09:00" -> exact moment as ISO, read as Nepal time. */
export function toNepalIso(dateYmd: string, time: string): string | null {
  const ymd = dateYmd.includes("T") ? dateYmd.split("T")[0] : dateYmd;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${ymd}T${time}:00+05:45`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Nepal wall-clock parts of an ISO moment. */
export function nepalParts(iso: string | Date): { ymd: string; time: string; hour: number; minute: number } {
  const wall = new Date(new Date(iso).getTime() + NEPAL_OFFSET_MS);
  const ymd = wall.toISOString().slice(0, 10);
  const hour = wall.getUTCHours();
  const minute = wall.getUTCMinutes();
  return { ymd, time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`, hour, minute };
}

export function addDaysYmd(ymd: string, days: number): string {
  return new Date(Date.parse(`${ymd}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / DAY_MS);
}

/** "5:00 PM" */
export function formatClock(iso: string | Date): string {
  const { hour, minute } = nepalParts(iso);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

export type DayWords = { today: string; tomorrow: string; yesterday: string };
const EN_DAY_WORDS: DayWords = { today: "Today", tomorrow: "Tomorrow", yesterday: "Yesterday" };

/** "Today · 5:00 PM", "Tomorrow · 9:00 AM", "Kartik 25, 2083 · 9:00 AM" */
export function formatWhen(iso: string, words: DayWords = EN_DAY_WORDS, todayYmd = getNepalTodayAd()): string {
  const { ymd } = nepalParts(iso);
  const diff = daysBetween(todayYmd, ymd);
  const day =
    diff === 0 ? words.today : diff === 1 ? words.tomorrow : diff === -1 ? words.yesterday : formatBSLong(ymd);
  return `${day} · ${formatClock(iso)}`;
}

export type ReminderGroup = "LATE" | "TODAY" | "TOMORROW" | "WEEK" | "LATER";

export const GROUP_ORDER: ReminderGroup[] = ["LATE", "TODAY", "TOMORROW", "WEEK", "LATER"];

export function groupOf(iso: string, now = Date.now(), todayYmd = getNepalTodayAd()): ReminderGroup {
  if (new Date(iso).getTime() <= now) return "LATE";
  const diff = daysBetween(todayYmd, nepalParts(iso).ymd);
  if (diff <= 0) return "TODAY";
  if (diff === 1) return "TOMORROW";
  if (diff <= 7) return "WEEK";
  return "LATER";
}

export type QuickChoice<K extends string = string> = { key: K; iso: string };

/** Ready-made times. Ones already in the past are left out. */
export function quickChoices(now = Date.now()): QuickChoice<"q1h" | "q5pm" | "qTomorrow" | "q7d">[] {
  const today = getNepalTodayAd();
  const list: QuickChoice<"q1h" | "q5pm" | "qTomorrow" | "q7d">[] = [
    { key: "q1h", iso: new Date(now + 60 * 60 * 1000).toISOString() },
    { key: "q5pm", iso: toNepalIso(today, "17:00")! },
    { key: "qTomorrow", iso: toNepalIso(addDaysYmd(today, 1), "09:00")! },
    { key: "q7d", iso: toNepalIso(addDaysYmd(today, 7), "09:00")! },
  ];
  return list.filter((c) => new Date(c.iso).getTime() > now + 60_000);
}

/** Snooze choices for a row. */
export function snoozeChoices(now = Date.now()): QuickChoice<"snooze1h" | "snoozeTomorrow">[] {
  const today = getNepalTodayAd();
  return [
    { key: "snooze1h", iso: new Date(now + 60 * 60 * 1000).toISOString() },
    { key: "snoozeTomorrow", iso: toNepalIso(addDaysYmd(today, 1), "09:00")! },
  ];
}
