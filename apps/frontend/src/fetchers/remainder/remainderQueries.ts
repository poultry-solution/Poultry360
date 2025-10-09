import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Reminder,
  CreateReminder,
  UpdateReminder,
  ReminderType,
  ReminderStatus,
  RecurrencePattern,
} from "@myapp/shared-types";

import axiosInstance from "@/lib/axios";

// ==================== TYPES ====================

interface ReminderFilters {
  page?: number;
  limit?: number;
  type?: ReminderType;
  status?: ReminderStatus;
  farmId?: string;
  batchId?: string;
  dueDate?: string;
  search?: string;
}

interface ReminderStatistics {
  totalReminders: number;
  pendingReminders: number;
  completedReminders: number;
  overdueReminders: number;
  todayReminders: number;
}

interface ReminderListResponse {
  success: boolean;
  data: Reminder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ReminderResponse {
  success: boolean;
  data: Reminder;
}

interface ReminderStatisticsResponse {
  success: boolean;
  data: ReminderStatistics;
}

// ==================== QUERY KEYS ====================

export const reminderKeys = {
  all: ["reminders"] as const,
  lists: () => [...reminderKeys.all, "list"] as const,
  list: (filters: ReminderFilters) =>
    [...reminderKeys.lists(), filters] as const,
  details: () => [...reminderKeys.all, "detail"] as const,
  detail: (id: string) => [...reminderKeys.details(), id] as const,
  upcoming: (days?: number) => [...reminderKeys.all, "upcoming", days] as const,
  overdue: () => [...reminderKeys.all, "overdue"] as const,
  scheduled: () => [...reminderKeys.all, "scheduled"] as const,
  statistics: () => [...reminderKeys.all, "statistics"] as const,
};

// ==================== QUERY HOOKS ====================

// Get all reminders with filters
export const useGetReminders = (filters: ReminderFilters = {}) => {
  return useQuery({
    queryKey: reminderKeys.list(filters),
    queryFn: async (): Promise<ReminderListResponse> => {
      const params = new URLSearchParams();

      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.type) params.append("type", filters.type);
      if (filters.status) params.append("status", filters.status);
      if (filters.farmId) params.append("farmId", filters.farmId);
      if (filters.batchId) params.append("batchId", filters.batchId);
      if (filters.dueDate) params.append("dueDate", filters.dueDate);
      if (filters.search) params.append("search", filters.search);

      const response = await axiosInstance.get(
        `/reminders?${params.toString()}`
      );
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Get reminder by ID
export const useGetReminder = (id: string) => {
  return useQuery({
    queryKey: reminderKeys.detail(id),
    queryFn: async (): Promise<ReminderResponse> => {
      const response = await axiosInstance.get(`/reminders/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get upcoming reminders
export const useGetUpcomingReminders = (days: number = 7) => {
  return useQuery({
    queryKey: reminderKeys.upcoming(days),
    queryFn: async (): Promise<ReminderListResponse> => {
      // Backend doesn't expose /upcoming; fetch all and filter client-side
      const response = await axiosInstance.get(`/reminders`);
      const all: Reminder[] = response.data?.data || [];
      const now = new Date();
      const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const filtered = all.filter((r: any) => {
        const due = new Date(r.dueDate);
        return r.status === 'PENDING' && due > now && due <= end;
      });
      return {
        success: true,
        data: filtered,
        pagination: {
          page: 1,
          limit: filtered.length,
          total: filtered.length,
          totalPages: 1,
        },
      } as ReminderListResponse;
    },
    staleTime: 1 * 60 * 1000,
  });
};

// Get overdue reminders
export const useGetOverdueReminders = () => {
  return useQuery({
    queryKey: reminderKeys.overdue(),
    queryFn: async (): Promise<ReminderListResponse> => {
      // Fetch by status=OVERDUE
      const response = await axiosInstance.get(`/reminders?status=OVERDUE`);
      return response.data;
    },
    staleTime: 1 * 60 * 1000,
  });
};

// Get completed reminders for today
export const useGetCompletedTodayReminders = () => {
  return useQuery({
    queryKey: [...reminderKeys.all, 'completed-today'],
    queryFn: async (): Promise<ReminderListResponse> => {
      // Fetch by status=COMPLETED and filter for today
      const response = await axiosInstance.get(`/reminders?status=COMPLETED`);
      const all: Reminder[] = response.data?.data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayCompleted = all.filter((r: any) => {
        const completedDate = new Date(r.updatedAt || r.createdAt);
        return completedDate >= today && completedDate < tomorrow;
      });
      
      return {
        success: true,
        data: todayCompleted,
        pagination: {
          page: 1,
          limit: todayCompleted.length,
          total: todayCompleted.length,
          totalPages: 1,
        },
      } as ReminderListResponse;
    },
    staleTime: 1 * 60 * 1000,
  });
};

// Get all scheduled (future) reminders (any distance in future)
export const useGetScheduledReminders = () => {
  return useQuery({
    queryKey: reminderKeys.scheduled(),
    queryFn: async (): Promise<ReminderListResponse> => {
      // Fetch all PENDING and sort by dueDate ascending
      const response = await axiosInstance.get(`/reminders?status=PENDING`);
      const list: Reminder[] = response.data?.data || [];
      const sorted = [...list].sort(
        (a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      return {
        success: true,
        data: sorted,
        pagination: {
          page: 1,
          limit: sorted.length,
          total: sorted.length,
          totalPages: 1,
        },
      } as ReminderListResponse;
    },
    staleTime: 2 * 60 * 1000,
  });
};

// Get reminder statistics
export const useGetReminderStatistics = () => {
  return useQuery({
    queryKey: reminderKeys.statistics(),
    queryFn: async (): Promise<ReminderStatisticsResponse> => {
      // Backend route is /reminders/stats
      const response = await axiosInstance.get("/reminders/stats");
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ==================== MUTATION HOOKS ====================

// Create reminder
export const useCreateReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReminder): Promise<ReminderResponse> => {
      const response = await axiosInstance.post("/reminders", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all reminder queries to refetch data
      queryClient.invalidateQueries({ queryKey: reminderKeys.all });
    },
  });
};

// Update reminder
export const useUpdateReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateReminder;
    }): Promise<ReminderResponse> => {
      const response = await axiosInstance.put(`/reminders/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      // Invalidate specific reminder and all lists
      queryClient.invalidateQueries({ queryKey: reminderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: reminderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.statistics() });
    },
  });
};

// Mark reminder as completed
export const useMarkReminderCompleted = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<ReminderResponse> => {
      // Backend route is POST /reminders/:id/mark-completed
      const response = await axiosInstance.post(`/reminders/${id}/mark-completed`);
      return response.data;
    },
    onSuccess: (_, id) => {
      // Invalidate all reminder queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: reminderKeys.all });
      
      // Specifically invalidate completed today and scheduled queries
      queryClient.invalidateQueries({ queryKey: [...reminderKeys.all, 'completed-today'] });
      queryClient.invalidateQueries({ queryKey: reminderKeys.scheduled() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.overdue() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.statistics() });
    },
  });
};

// Mark reminder as not done (reschedule)
export const useMarkReminderNotDone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, rescheduleMinutes = 60 }: { id: string; rescheduleMinutes?: number; }): Promise<ReminderResponse> => {
      const response = await axiosInstance.post(`/reminders/${id}/mark-not-done`, { rescheduleMinutes });
      return response.data;
    },
    onSuccess: (_, { id }) => {
      // Invalidate all reminder queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: reminderKeys.all });
      
      // Specifically invalidate completed today and scheduled queries
      queryClient.invalidateQueries({ queryKey: [...reminderKeys.all, 'completed-today'] });
      queryClient.invalidateQueries({ queryKey: reminderKeys.scheduled() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.overdue() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.statistics() });
    },
  });
};

// Get reminders needing acknowledgment (OVERDUE list shorthand)
export const useGetRemindersNeedingAcknowledgment = () => {
  return useQuery({
    queryKey: [...reminderKeys.all, 'needing-acknowledgment'],
    queryFn: async (): Promise<Reminder[]> => {
      const response = await axiosInstance.get(`/reminders/needing-acknowledgment`);
      return response.data?.data || [];
    },
    staleTime: 60 * 1000,
  });
};

// Create custom time reminder
export const useCreateCustomTimeReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description?: string; specificTime: string; isRecurring?: boolean; farmId?: string; batchId?: string; }): Promise<ReminderResponse> => {
      const response = await axiosInstance.post(`/reminders/custom-time`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.all });
    },
  });
};

// Create custom interval reminder
export const useCreateCustomIntervalReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description?: string; interval: { unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months'; value: number }; farmId?: string; batchId?: string; }): Promise<ReminderResponse> => {
      const response = await axiosInstance.post(`/reminders/custom-interval`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.all });
    },
  });
};

// Create day-of-week reminder
export const useCreateDayOfWeekReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description?: string; dayOfWeek: number; timeOfDay: string; farmId?: string; batchId?: string; }): Promise<ReminderResponse> => {
      const response = await axiosInstance.post(`/reminders/day-of-week`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.all });
    },
  });
};

// Delete reminder
export const useDeleteReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      id: string
    ): Promise<{ success: boolean; message: string }> => {
      const response = await axiosInstance.delete(`/reminders/${id}`);
      return response.data;
    },
    onSuccess: (_, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: reminderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: reminderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.overdue() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.statistics() });
    },
  });
};

// Clean up duplicate recurring reminders
export const useCleanupDuplicateReminders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message: string; duplicatesRemoved: number }> => {
      const response = await axiosInstance.post(`/reminders/cleanup-duplicates`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all reminder queries to refresh the data
      queryClient.invalidateQueries({ queryKey: reminderKeys.all });
    },
  });
};

// ==================== UTILITY HOOKS ====================

// Get reminders by type
export const useGetRemindersByType = (
  type: ReminderType,
  filters: Omit<ReminderFilters, "type"> = {}
) => {
  return useGetReminders({ ...filters, type });
};

// Get reminders by status
export const useGetRemindersByStatus = (
  status: ReminderStatus,
  filters: Omit<ReminderFilters, "status"> = {}
) => {
  return useGetReminders({ ...filters, status });
};

// Get farm reminders
export const useGetFarmReminders = (
  farmId: string,
  filters: Omit<ReminderFilters, "farmId"> = {}
) => {
  return useGetReminders({ ...filters, farmId });
};

// Get batch reminders
export const useGetBatchReminders = (
  batchId: string,
  filters: Omit<ReminderFilters, "batchId"> = {}
) => {
  return useGetReminders({ ...filters, batchId });
};

// Get today's reminders
export const useGetTodayReminders = () => {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  return useGetReminders({ dueDate: today });
};

// ==================== COMBINED HOOKS ====================

// Get reminder dashboard data (upcoming, overdue, statistics)
export const useGetReminderDashboard = () => {
  const upcoming = useGetUpcomingReminders(7);
  const overdue = useGetOverdueReminders();
  const statistics = useGetReminderStatistics();

  return {
    upcoming: upcoming.data?.data || [],
    overdue: overdue.data?.data || [],
    statistics: statistics.data?.data || {
      totalReminders: 0,
      pendingReminders: 0,
      completedReminders: 0,
      overdueReminders: 0,
      todayReminders: 0,
    },
    isLoading: upcoming.isLoading || overdue.isLoading || statistics.isLoading,
    error: upcoming.error || overdue.error || statistics.error,
  };
};

// ==================== HELPER FUNCTIONS ====================

// Helper function to get reminder type display name
export const getReminderTypeDisplayName = (type: ReminderType): string => {
  const typeMap: Record<ReminderType, string> = {
    VACCINATION: "Vaccination",
    FEEDING: "Feeding",
    MEDICATION: "Medication",
    CLEANING: "Cleaning",
    WEIGHING: "Weighing",
    SUPPLIER_PAYMENT: "Supplier Payment",
    CUSTOMER_PAYMENT: "Customer Payment",
    GENERAL: "General",
  };
  return typeMap[type] || type;
};

// Helper function to get reminder status display name
export const getReminderStatusDisplayName = (
  status: ReminderStatus
): string => {
  const statusMap: Record<ReminderStatus, string> = {
    PENDING: "Pending",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    OVERDUE: "Overdue",
  };
  return statusMap[status] || status;
};

// Helper function to get recurrence pattern display name
export const getRecurrencePatternDisplayName = (
  pattern: RecurrencePattern
): string => {
  const patternMap: Record<RecurrencePattern, string> = {
    NONE: "No Repeat",
    DAILY: "Daily",
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    CUSTOM: "Custom",
  };
  return patternMap[pattern] || pattern;
};

// Helper function to get reminder type color
export const getReminderTypeColor = (type: ReminderType): string => {
  const colorMap: Record<ReminderType, string> = {
    VACCINATION: "bg-blue-100 text-blue-800",
    FEEDING: "bg-green-100 text-green-800",
    MEDICATION: "bg-red-100 text-red-800",
    CLEANING: "bg-yellow-100 text-yellow-800",
    WEIGHING: "bg-purple-100 text-purple-800",
    SUPPLIER_PAYMENT: "bg-orange-100 text-orange-800",
    CUSTOMER_PAYMENT: "bg-pink-100 text-pink-800",
    GENERAL: "bg-gray-100 text-gray-800",
  };
  return colorMap[type] || "bg-gray-100 text-gray-800";
};

// Helper function to get reminder status color
export const getReminderStatusColor = (status: ReminderStatus): string => {
  const colorMap: Record<ReminderStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-800",
    OVERDUE: "bg-red-100 text-red-800",
  };
  return colorMap[status] || "bg-gray-100 text-gray-800";
};

// Helper function to check if reminder is due soon (within 24 hours)
export const isReminderDueSoon = (dueDate: string | Date): boolean => {
  const due = new Date(dueDate);
  const now = new Date();
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  return diffHours <= 24 && diffHours > 0;
};

// Helper function to check if reminder is overdue
export const isReminderOverdue = (dueDate: string | Date): boolean => {
  const due = new Date(dueDate);
  const now = new Date();
  return due < now;
};

// Helper function to format due date for display
export const formatReminderDueDate = (dueDate: string | Date): string => {
  const date = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;

  return date.toLocaleDateString();
};
