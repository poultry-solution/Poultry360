import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, CreateUser, UpdateUser, UserRole } from "@myapp/shared-types";

// Local fallback until shared-types exports UserStatus
export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// ==================== QUERY KEYS ====================
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters: Record<string, any>) =>
    [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  current: () => [...userKeys.all, "current"] as const,
  owners: () => [...userKeys.all, "owners"] as const,
  managers: () => [...userKeys.all, "managers"] as const,
  stats: () => [...userKeys.all, "stats"] as const,
};

// ==================== QUERY HOOKS ====================

// Get all users
export const useGetAllUsers = (
  params?: {
    page?: number;
    limit?: number;
    role?: UserRole;
    status?: UserStatus;
    search?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: userKeys.list(params || {}),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append("page", params.page.toString());
      if (params?.limit) searchParams.append("limit", params.limit.toString());
      if (params?.role) searchParams.append("role", params.role);
      if (params?.status) searchParams.append("status", params.status);
      if (params?.search) searchParams.append("search", params.search);

      const response = await fetch(`${API_BASE}/users?${searchParams}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: options?.enabled !== false,
  });
};

// Get current user
export const useGetCurrentUser = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: userKeys.current(),
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/users/me`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch current user");
      return response.json();
    },
    enabled: options?.enabled !== false,
  });
};

// Get user by ID
export const useGetUserById = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: options?.enabled === true && !!id,
  });
};

// Get owner users
export const useGetOwnerUsers = (
  params?: {
    page?: number;
    limit?: number;
    search?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [...userKeys.owners(), params || {}],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append("page", params.page.toString());
      if (params?.limit) searchParams.append("limit", params.limit.toString());
      if (params?.search) searchParams.append("search", params.search);

      const response = await fetch(
        `${API_BASE}/users/owners/list?${searchParams}`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch owner users");
      return response.json();
    },
    enabled: options?.enabled !== false,
  });
};

// Get manager users
export const useGetManagerUsers = (
  params?: {
    page?: number;
    limit?: number;
    search?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [...userKeys.managers(), params || {}],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append("page", params.page.toString());
      if (params?.limit) searchParams.append("limit", params.limit.toString());
      if (params?.search) searchParams.append("search", params.search);

      const response = await fetch(
        `${API_BASE}/users/managers/list?${searchParams}`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch manager users");
      return response.json();
    },
    enabled: options?.enabled !== false,
  });
};

// Get user statistics
export const useGetUserStatistics = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: userKeys.stats(),
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/users/stats/overview`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch user statistics");
      return response.json();
    },
    enabled: options?.enabled !== false,
  });
};

// ==================== MUTATION HOOKS ====================

// Update user
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUser }) => {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update user");
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch user queries
      queryClient.invalidateQueries({
        queryKey: userKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: userKeys.current() });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

// Delete user
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete user");
      return response.json();
    },
    onSuccess: (data, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.owners() });
      queryClient.invalidateQueries({ queryKey: userKeys.managers() });
      queryClient.invalidateQueries({ queryKey: userKeys.stats() });
    },
  });
};

// Update user status
export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UserStatus }) => {
      const response = await fetch(`${API_BASE}/users/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update user status");
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate user queries
      queryClient.invalidateQueries({
        queryKey: userKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.owners() });
      queryClient.invalidateQueries({ queryKey: userKeys.managers() });
      queryClient.invalidateQueries({ queryKey: userKeys.stats() });
    },
  });
};
