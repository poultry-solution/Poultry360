import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Farm, 
  CreateFarm, 
  UpdateFarm 
} from "@myapp/shared-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

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
  return useQuery({
    queryKey: farmKeys.list(params || {}),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append("page", params.page.toString());
      if (params?.limit) searchParams.append("limit", params.limit.toString());
      if (params?.search) searchParams.append("search", params.search);
      if (params?.ownerId) searchParams.append("ownerId", params.ownerId);
      if (params?.managerId) searchParams.append("managerId", params.managerId);

      const response = await fetch(`${API_BASE}/farms?${searchParams}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch farms");
      return response.json();
    },
  });
};

// Get current user's farms
export const useGetUserFarms = (type?: "owned" | "managed" | "all") => {
  return useQuery({
    queryKey: [...farmKeys.myFarms(), { type }],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (type) searchParams.append("type", type);

      const response = await fetch(`${API_BASE}/farms/my-farms?${searchParams}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch user farms");
      return response.json();
    },
  });
};

// Get farm by ID
export const useGetFarmById = (id: string) => {
  return useQuery({
    queryKey: farmKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/farms/${id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch farm");
      return response.json();
    },
    enabled: !!id,
  });
};

// Get farm analytics
export const useGetFarmAnalytics = (id: string) => {
  return useQuery({
    queryKey: farmKeys.analytics(id),
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/farms/${id}/analytics`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch farm analytics");
      return response.json();
    },
    enabled: !!id,
  });
};

// ==================== MUTATION HOOKS ====================

// Create farm
export const useCreateFarm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFarm) => {
      const response = await fetch(`${API_BASE}/farms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create farm");
      return response.json();
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
      const response = await fetch(`${API_BASE}/farms/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update farm");
      return response.json();
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
      const response = await fetch(`${API_BASE}/farms/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete farm");
      return response.json();
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
      const response = await fetch(`${API_BASE}/farms/${farmId}/managers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ managerId }),
      });
      if (!response.ok) throw new Error("Failed to add manager to farm");
      return response.json();
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
      const response = await fetch(`${API_BASE}/farms/${farmId}/managers/${managerId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to remove manager from farm");
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate farm queries
      queryClient.invalidateQueries({ queryKey: farmKeys.detail(variables.farmId) });
      queryClient.invalidateQueries({ queryKey: farmKeys.lists() });
      queryClient.invalidateQueries({ queryKey: farmKeys.myFarms() });
    },
  });
};
