import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  status: "UNREAD" | "READ" | "ARCHIVED";
  createdAt: string;
  readAt: string | null;
}

const NOTIFICATION_PAGE_SIZE = 4;

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (status?: string, limit?: number) => [...notificationKeys.all, "list", status, limit] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

export function useGetNotifications(opts?: { status?: "UNREAD" | "READ"; limit?: number; offset?: number }) {
  return useQuery<{ success: boolean; data: NotificationItem[]; total: number }>({
    queryKey: notificationKeys.list(opts?.status, opts?.limit),
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (opts?.status) params.status = opts.status;
      if (opts?.limit != null) params.limit = opts.limit;
      if (opts?.offset != null) params.offset = opts.offset;
      const res = await axiosInstance.get("/notifications", { params });
      return res.data;
    },
  });
}

export { NOTIFICATION_PAGE_SIZE };

export function useGetUnreadCount() {
  return useQuery<{ success: boolean; data: { count: number } }>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const res = await axiosInstance.get("/notifications/unread-count");
      return res.data;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.post(`/notifications/${id}/read`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post("/notifications/read-all");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
