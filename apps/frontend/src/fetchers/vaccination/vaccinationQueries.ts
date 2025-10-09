import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios";

// ==================== TYPES ====================

export interface Vaccination {
  id: string;
  vaccineName: string;
  scheduledDate: string;
  completedDate?: string;
  status: "PENDING" | "COMPLETED" | "OVERDUE" | "MISSED";
  notes?: string;
  doseNumber: number;
  totalDoses: number;
  daysBetweenDoses?: number;
  batchId?: string;
  farmId?: string;
  batch?: {
    id: string;
    batchNumber: string;
  };
  farm?: {
    id: string;
    name: string;
  };
  reminder?: {
    id: string;
    status: string;
    dueDate: string;
  };
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaccinationSchedule {
  id: string;
  vaccineName: string;
  totalDoses: number;
  daysBetweenDoses?: number;
  notes?: string;
  batchId?: string;
  farmId?: string;
  batch?: {
    id: string;
    batchNumber: string;
  };
  farm?: {
    id: string;
    name: string;
  };
  firstDoseDate: string;
  lastDoseDate: string;
  doses: Vaccination[];
  status: "PENDING" | "COMPLETED" | "OVERDUE" | "MISSED";
  completedDoses: number;
  pendingDoses: number;
  overdueDoses: number;
}

export interface CreateVaccinationData {
  vaccineName: string;
  scheduledDate: string;
  notes?: string;
  batchId?: string;
  farmId?: string;
  doseNumber?: number;
  totalDoses?: number;
  daysBetweenDoses?: number;
}

export interface CreateMultiDoseVaccinationData {
  vaccineName: string;
  firstDoseDate: string;
  totalDoses: number;
  daysBetweenDoses: number;
  notes?: string;
  batchId?: string;
  farmId?: string;
}

export interface UpdateVaccinationData {
  vaccineName?: string;
  scheduledDate?: string;
  completedDate?: string;
  status?: "PENDING" | "COMPLETED" | "OVERDUE" | "MISSED";
  notes?: string;
  doseNumber?: number;
  totalDoses?: number;
  daysBetweenDoses?: number;
  batchId?: string;
  farmId?: string;
}

export interface VaccinationStats {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
  byBatch: Record<string, number>;
}

export interface VaccinationResponse {
  success: boolean;
  data: Vaccination;
  message?: string;
}

export interface VaccinationListResponse {
  success: boolean;
  data: Vaccination[];
  message?: string;
}

export interface VaccinationScheduleListResponse {
  success: boolean;
  data: VaccinationSchedule[];
  message?: string;
}

export interface VaccinationStatsResponse {
  success: boolean;
  data: VaccinationStats;
  message?: string;
}

// ==================== QUERY KEYS ====================
export const vaccinationKeys = {
  all: ["vaccinations"] as const,
  lists: () => [...vaccinationKeys.all, "list"] as const,
  list: (filters: Record<string, any>) => [...vaccinationKeys.lists(), filters] as const,
  details: () => [...vaccinationKeys.all, "detail"] as const,
  detail: (id: string) => [...vaccinationKeys.details(), id] as const,
  batchVaccinations: (batchId: string) => [...vaccinationKeys.all, "batch", batchId] as const,
  upcoming: (days?: number) => [...vaccinationKeys.all, "upcoming", days || 7] as const,
  overdue: () => [...vaccinationKeys.all, "overdue"] as const,
  schedules: () => [...vaccinationKeys.all, "schedules"] as const,
  stats: () => [...vaccinationKeys.all, "stats"] as const,
};

// ==================== QUERY HOOKS ====================

// Get upcoming vaccinations
export const useGetUpcomingVaccinations = (days: number = 7, options?: { enabled?: boolean }) => {
  return useQuery<VaccinationListResponse>({
    queryKey: vaccinationKeys.upcoming(days),
    queryFn: async () => {
      const response = await axiosInstance.get("/vaccinations/upcoming", { 
        params: { days } 
      });
      console.log("Get Upcoming Vaccinations", response.data);
      return response.data;
    },
    enabled: options?.enabled !== false,
  });
};

// Get overdue vaccinations
export const useGetOverdueVaccinations = (options?: { enabled?: boolean }) => {
  return useQuery<VaccinationListResponse>({
    queryKey: vaccinationKeys.overdue(),
    queryFn: async () => {
      const response = await axiosInstance.get("/vaccinations/overdue");
      console.log("Get Overdue Vaccinations", response.data);
      return response.data;
    },
    enabled: options?.enabled !== false,
  });
};

// Get batch vaccinations
export const useGetBatchVaccinations = (batchId: string, options?: { enabled?: boolean }) => {
  return useQuery<VaccinationListResponse>({
    queryKey: vaccinationKeys.batchVaccinations(batchId),
    queryFn: async () => {
      const response = await axiosInstance.get(`/vaccinations/batch/${batchId}`);
      console.log("Get Batch Vaccinations", response.data);
      return response.data;
    },
    enabled: (options?.enabled !== false) && !!batchId,
  });
};

// Get all vaccination schedules
export const useGetVaccinationSchedules = (options?: { enabled?: boolean }) => {
  return useQuery<VaccinationScheduleListResponse>({
    queryKey: vaccinationKeys.schedules(),
    queryFn: async () => {
      const response = await axiosInstance.get("/vaccinations/schedules");
      console.log("Get Vaccination Schedules", response.data);
      return response.data;
    },
    enabled: options?.enabled !== false,
  });
};

// Get vaccination statistics
export const useGetVaccinationStats = (options?: { enabled?: boolean }) => {
  return useQuery<VaccinationStatsResponse>({
    queryKey: vaccinationKeys.stats(),
    queryFn: async () => {
      const response = await axiosInstance.get("/vaccinations/stats");
      console.log("Get Vaccination Stats", response.data);
      return response.data;
    },
    enabled: options?.enabled !== false,
  });
};

// ==================== MUTATION HOOKS ====================

// Create single vaccination
export const useCreateVaccination = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVaccinationData): Promise<VaccinationResponse> => {
      const response = await axiosInstance.post("/vaccinations", data);
      return response.data as VaccinationResponse;
    },
    onSuccess: (data) => {
      // Invalidate vaccination queries
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.overdue() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.schedules() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.stats() });
      
      // Invalidate batch vaccinations if batchId is provided
      if (data.data?.batchId) {
        queryClient.invalidateQueries({ 
          queryKey: vaccinationKeys.batchVaccinations(data.data.batchId) 
        });
      }
    },
  });
};

// Create multi-dose vaccination
export const useCreateMultiDoseVaccination = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMultiDoseVaccinationData): Promise<{
      success: boolean;
      data: Vaccination[];
      message: string;
    }> => {
      const response = await axiosInstance.post("/vaccinations/multi-dose", data);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate vaccination queries
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.overdue() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.schedules() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.stats() });
      
      // Invalidate batch vaccinations if batchId is provided
      if (data.data?.[0]?.batchId) {
        queryClient.invalidateQueries({ 
          queryKey: vaccinationKeys.batchVaccinations(data.data[0].batchId) 
        });
      }
    },
  });
};

// Update vaccination
export const useUpdateVaccination = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateVaccinationData }): Promise<VaccinationResponse> => {
      const response = await axiosInstance.put(`/vaccinations/${id}`, data);
      return response.data as VaccinationResponse;
    },
    onSuccess: (data, variables) => {
      // Invalidate vaccination queries
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.overdue() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.schedules() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.stats() });
      
      // Invalidate batch vaccinations if batchId is provided
      if (data.data?.batchId) {
        queryClient.invalidateQueries({ 
          queryKey: vaccinationKeys.batchVaccinations(data.data.batchId) 
        });
      }
    },
  });
};

// Mark vaccination as completed
export const useMarkVaccinationCompleted = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<VaccinationResponse> => {
      const response = await axiosInstance.post(`/vaccinations/${id}/complete`);
      return response.data as VaccinationResponse;
    },
    onSuccess: (data, id) => {
      // Invalidate vaccination queries
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.overdue() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.schedules() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.stats() });
      
      // Invalidate batch vaccinations if batchId is provided
      if (data.data?.batchId) {
        queryClient.invalidateQueries({ 
          queryKey: vaccinationKeys.batchVaccinations(data.data.batchId) 
        });
      }
    },
  });
};

// Delete vaccination
export const useDeleteVaccination = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean; message: string }> => {
      const response = await axiosInstance.delete(`/vaccinations/${id}`);
      return response.data;
    },
    onSuccess: (data, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: vaccinationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.overdue() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.schedules() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.stats() });
      
      // Invalidate batch vaccinations
      queryClient.invalidateQueries({ 
        queryKey: vaccinationKeys.all,
        predicate: (query) => {
          return query.queryKey[0] === "vaccinations" && 
                 query.queryKey[1] === "batch";
        }
      });
    },
  });
};

// Delete vaccination schedule (entire schedule)
export const useDeleteVaccinationSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean; message: string }> => {
      const response = await axiosInstance.delete(`/vaccinations/schedule/${id}`);
      return response.data;
    },
    onSuccess: (data, id) => {
      // Invalidate all vaccination queries since we're deleting an entire schedule
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.all });
    },
  });
};

// Sync vaccination reminders (admin/utility function)
export const useSyncVaccinationReminders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message: string }> => {
      const response = await axiosInstance.post("/vaccinations/sync-reminders");
      return response.data;
    },
    onSuccess: () => {
      // Invalidate vaccination queries to refresh data
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.overdue() });
      queryClient.invalidateQueries({ queryKey: vaccinationKeys.schedules() });
    },
  });
};
