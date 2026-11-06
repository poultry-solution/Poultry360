"use client";

import { useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";

export type ReminderModuleProp = "farmer" | "hatchery";

/**
 * English text for reminders. Farmer screens read the same keys from
 * `farmer.dashboard.reminder.*` (en + ne); hatchery is English only.
 */
export const REMINDER_EN = {
  title: "Reminders",
  add: "Add",
  empty: "No reminders. Add one so you don't forget.",
  loading: "Loading...",
  loadError: "Could not load reminders.",
  tryAgain: "Try again",
  late: "Late",
  today: "Today",
  tomorrow: "Tomorrow",
  yesterday: "Yesterday",
  week: "This week",
  later: "Later",
  markDone: "Mark done",
  doneToast: "Marked done",
  undo: "Undo",
  alreadyDone: "Already done by {name}",
  nextMade: "Next one: {when}",
  nextAlready: "The next one was already made.",
  snooze: "Snooze",
  snooze1h: "1 hour later",
  snoozeTomorrow: "Tomorrow 9 AM",
  snoozed: "Moved to {when}",
  edit: "Change",
  delete: "Delete",
  deleteTitle: "Delete this reminder?",
  deleteBody: "It will be removed for everyone. This can't be undone.",
  deleted: "Reminder deleted",
  cancel: "Cancel",
  showDone: "Show done",
  hideDone: "Hide done",
  noDone: "Nothing done yet.",
  loadMore: "Load more",
  doneBy: "Done by {name}",
  by: "by {name}",
  onlyMe: "Only me",
  everyone: "Everyone",
  you: "You",
  owner: "Owner",
  inactive: "(inactive)",
  repeatDaily: "Every day",
  repeatWeekly: "Every week",
  repeatMonthly: "Every month",
  repeatEveryN: "Every {n} days",
  addTitle: "Add reminder",
  editTitle: "Change reminder",
  what: "What to remember",
  placeholder: "e.g. Vaccination due, Feed order",
  when: "When",
  date: "Date",
  time: "Time",
  q1h: "In 1 hour",
  q5pm: "Today 5 PM",
  qTomorrow: "Tomorrow 9 AM",
  q7d: "In 7 days",
  linkTo: "Link to (optional)",
  farm: "Farm",
  batch: "Batch",
  none: "None",
  linkType: "Type",
  parentBatch: "Parent batch",
  incubation: "Incubation",
  party: "Party",
  pickOne: "Choose one",
  who: "Who gets an alert",
  pick: "Pick people",
  hintOnlyMe: "Only you will get a phone alert.",
  hintEveryone: "Everyone in your business will get a phone alert.",
  hintPick: "Only the people you pick will get an alert.",
  repeat: "Repeat",
  never: "Never",
  everyNDays: "Every few days",
  days: "days",
  until: "Until (optional)",
  save: "Save",
  saving: "Saving...",
  needWhat: "Write what to remember.",
  needWhen: "Pick a date and time.",
  pastWhen: "Pick a time later than now.",
  needPeople: "Pick at least one person.",
  needDays: "Repeat every 1 to 365 days.",
  remindMe: "Remind me",
} as const;

export type ReminderTextKey = keyof typeof REMINDER_EN;

function fill(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m));
}

export function useReminderText(module: ReminderModuleProp) {
  const { t } = useI18n();
  return useCallback(
    (key: ReminderTextKey, params?: Record<string, string | number>) => {
      if (module === "farmer") {
        const full = `farmer.dashboard.reminder.${key}`;
        const value = t(full, params);
        if (value && value !== full) return value;
      }
      return fill(REMINDER_EN[key], params);
    },
    [module, t]
  );
}
