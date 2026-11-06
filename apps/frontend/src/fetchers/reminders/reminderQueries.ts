import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export type ReminderModule = "FARMER" | "HATCHERY";
export type ReminderAudience = "ONLY_ME" | "EVERYONE" | "SELECTED";
export type ReminderRepeat = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "EVERY_N_DAYS";

type Named = { id: string; name: string };

export interface Reminder {
  id: string;
  userId: string;
  module: ReminderModule;
  title: string;
  /** Exact moment (ISO). */
  reminderDate: string;
  audience: ReminderAudience;
  notifyOwner: boolean;
  createdByStaffId: string | null;
  createdByStaff?: Named | null;
  notifiedAt: string | null;
  doneAt: string | null;
  doneByStaff?: Named | null;
  repeat: ReminderRepeat;
  repeatEveryDays: number | null;
  repeatUntil: string | null;
  repeatedTo?: { id: string } | null;
  farmId: string | null;
  batchId: string | null;
  hatcheryBatchId: string | null;
  incubationId: string | null;
  hatcheryPartyId: string | null;
  farm?: Named | null;
  batch?: { id: string; batchNumber: string } | null;
  hatcheryBatch?: { id: string; code: string; name: string | null } | null;
  incubation?: { id: string; code: string; name: string | null } | null;
  hatcheryParty?: Named | null;
  recipients: { staffUser: { id: string; name: string; isActive: boolean } }[];
  createdAt: string;
  updatedAt: string;
}

export interface ReminderInput {
  title: string;
  reminderDate: string;
  farmId?: string | null;
  batchId?: string | null;
  hatcheryBatchId?: string | null;
  incubationId?: string | null;
  hatcheryPartyId?: string | null;
  audience: ReminderAudience;
  notifyOwner?: boolean;
  staffIds?: string[];
  repeat: ReminderRepeat;
  repeatEveryDays?: number | null;
  repeatUntil?: string | null;
}

export interface ReminderPeople {
  owner: { name: string };
  staff: Named[];
}

export const reminderKeys = {
  all: ["reminders"] as const,
  active: () => [...reminderKeys.all, "active"] as const,
  done: (limit: number) => [...reminderKeys.all, "done", limit] as const,
  people: () => [...reminderKeys.all, "people"] as const,
};

export function useActiveReminders(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reminderKeys.active(),
    queryFn: async () => {
      const res = await axiosInstance.get<{ data: Reminder[] }>("/reminders", { params: { view: "active" } });
      return res.data.data;
    },
    // Keeps "Late" and "Today" moving without a page reload.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    enabled: options?.enabled ?? true,
  });
}

export function useDoneReminders(limit: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reminderKeys.done(limit),
    queryFn: async () => {
      const res = await axiosInstance.get<{ data: Reminder[]; total: number }>("/reminders", {
        params: { view: "done", limit, offset: 0 },
      });
      return res.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useReminderPeople(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reminderKeys.people(),
    queryFn: async () => {
      const res = await axiosInstance.get<{ data: ReminderPeople }>("/reminders/people");
      return res.data.data;
    },
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

function useReminderMutation<TVars>(run: (vars: TVars) => Promise<any>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.all });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useCreateReminder() {
  return useReminderMutation(async (body: ReminderInput) => {
    const res = await axiosInstance.post<{ data: Reminder }>("/reminders", body);
    return res.data;
  });
}

export function useUpdateReminder() {
  return useReminderMutation(async ({ id, body }: { id: string; body: ReminderInput }) => {
    const res = await axiosInstance.patch<{ data: Reminder }>(`/reminders/${id}`, body);
    return res.data;
  });
}

export function useMarkReminderDone() {
  return useReminderMutation(async (id: string) => {
    const res = await axiosInstance.post<{ data: Reminder; alreadyDone: boolean; next: Reminder | null }>(
      `/reminders/${id}/done`
    );
    return res.data;
  });
}

export function useUndoReminderDone() {
  return useReminderMutation(async (id: string) => {
    const res = await axiosInstance.post<{ data: Reminder; nextAlreadyMade: boolean }>(`/reminders/${id}/undo`);
    return res.data;
  });
}

export function useSnoozeReminder() {
  return useReminderMutation(async ({ id, until }: { id: string; until: string }) => {
    const res = await axiosInstance.post<{ data: Reminder }>(`/reminders/${id}/snooze`, { until });
    return res.data;
  });
}

export function useDeleteReminder() {
  return useReminderMutation(async (id: string) => {
    const res = await axiosInstance.delete(`/reminders/${id}`);
    return res.data;
  });
}

/** Server message for a failed reminder call (reads `message` or `error`). */
export function reminderErrorText(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const data = (error as any)?.response?.data;
  return data?.message || data?.error || fallback;
}
