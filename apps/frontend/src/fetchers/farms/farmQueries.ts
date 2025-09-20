import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Farm, 
  CreateFarm, 
  UpdateFarm,
  FarmResponse,
  FarmListResponse,
  FarmDetailResponse
} from "@myapp/shared-types";
import axiosInstance from "@/lib/axios";

// ==================== QUERY KEYS ====================
export const farmKeys = {
  all: ["farms"] as const,
  lists: () => [...farmKeys.all, "list"] as const,
  list: (filters: Record<string, any>) => [...farmKeys.lists(), filters] as const,
  details: () => [...farmKeys.all, "detail"] as const,
  detail: (id: string) => [...farmKeys.details(), id] as const,
  myFarms: () => [...farmKeys.all, "my-farms"] as const,
  analytics: (id: string) => [...farmKeys.detail(id), "analytics"] as const,
};

// ==================== QUERY HOOKS ====================

// Get all farms
export const useGetAllFarms = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  ownerId?: string;
  managerId?: string;
}) => {
  return useQuery<FarmListResponse>({
    queryKey: farmKeys.list(params || {}),
    queryFn: async () => {
      const response = await axiosInstance.get("/farms", { params });
      return response.data;
    },
  });
};

// Get current user's farms
export const useGetUserFarms = (type?: "owned" | "managed" | "all") => {
  return useQuery<FarmListResponse>({
    queryKey: [...farmKeys.myFarms(), { type }],
    queryFn: async () => {
      const response = await axiosInstance.get("/farms/my-farms", { 
        params: { type } 
      });
      console.log("Get User farms", response.data);
      return response.data;
    },
  });
};

// Get farm by ID
export const useGetFarmById = (id: string, options?: { enabled?: boolean }) => {
  return useQuery<FarmDetailResponse>({
    queryKey: farmKeys.detail(id),
    queryFn: async () => {
      const response = await axiosInstance.get(`/farms/${id}`);
      return response.data;
    },
    enabled: !!id && (options?.enabled !== false),
  });
};

// Get farm analytics
export const useGetFarmAnalytics = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: farmKeys.analytics(id),
    queryFn: async () => {
      const response = await axiosInstance.get(`/farms/${id}/analytics`);
      return response.data;
    },
    enabled: !!id && (options?.enabled !== false),
  });
};

// ==================== MUTATION HOOKS ====================

// Create farm
export const useCreateFarm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFarm) => {
      const response = await axiosInstance.post("/farms", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate farm queries
      queryClient.invalidateQueries({ queryKey: farmKeys.lists() });
      queryClient.invalidateQueries({ queryKey: farmKeys.myFarms() });
    },
  });
};

// Update farm
export const useUpdateFarm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFarm }) => {
      const response = await axiosInstance.put(`/farms/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate farm queries
      queryClient.invalidateQueries({ queryKey: farmKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: farmKeys.lists() });
      queryClient.invalidateQueries({ queryKey: farmKeys.myFarms() });
      queryClient.invalidateQueries({ queryKey: farmKeys.analytics(variables.id) });
    },
  });
};

// Delete farm
export const useDeleteFarm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/farms/${id}`);
      return response.data;
    },
    onSuccess: (data, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: farmKeys.detail(id) });
      queryClient.removeQueries({ queryKey: farmKeys.analytics(id) });
      queryClient.invalidateQueries({ queryKey: farmKeys.lists() });
      queryClient.invalidateQueries({ queryKey: farmKeys.myFarms() });
    },
  });
};

// Add manager to farm
export const useAddManagerToFarm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ farmId, managerId }: { farmId: string; managerId: string }) => {
      const response = await axiosInstance.post(`/farms/${farmId}/managers`, { managerId });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate farm queries
      queryClient.invalidateQueries({ queryKey: farmKeys.detail(variables.farmId) });
      queryClient.invalidateQueries({ queryKey: farmKeys.lists() });
      queryClient.invalidateQueries({ queryKey: farmKeys.myFarms() });
    },
  });
};

// Remove manager from farm
export const useRemoveManagerFromFarm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ farmId, managerId }: { farmId: string; managerId: string }) => {
      const response = await axiosInstance.delete(`/farms/${farmId}/managers/${managerId}`);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate farm queries
      queryClient.invalidateQueries({ queryKey: farmKeys.detail(variables.farmId) });
      queryClient.invalidateQueries({ queryKey: farmKeys.lists() });
      queryClient.invalidateQueries({ queryKey: farmKeys.myFarms() });
    },
  });
};
