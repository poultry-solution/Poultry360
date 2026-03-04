import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export type ReminderListType = "due" | "upcoming" | "all";

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  reminderDate: string;
  isNoticed: boolean;
  farmId: string | null;
  batchId: string | null;
  farm?: { id: string; name: string } | null;
  batch?: { id: string; batchNumber: string } | null;
  createdAt: string;
  updatedAt: string;
}

export const reminderKeys = {
  all: ["reminders"] as const,
  list: (type: ReminderListType) => [...reminderKeys.all, type] as const,
};

export function useGetReminders(type: ReminderListType = "due") {
  return useQuery<{ success: boolean; data: Reminder[] }>({
    queryKey: reminderKeys.list(type),
    queryFn: async () => {
      const res = await axiosInstance.get("/reminders", { params: { type } });
      return res.data;
    },
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      title: string;
      reminderDate: string;
      farmId?: string | null;
      batchId?: string | null;
    }) => {
      const res = await axiosInstance.post("/reminders", body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.all });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/reminders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.all });
    },
  });
}
