import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { toast } from "sonner";

// ==================== TYPES ====================

export type ListForSaleCategory = "CHICKEN" | "EGGS" | "LAYERS" | "FISH" | "OTHER";
export type ListForSaleStatus = "ACTIVE" | "ARCHIVED";

export interface EggVariant {
  size: string;
  quantity: number;
  rate: number;
}

export interface TypeVariant {
  type: string;
  quantity: number;
  rate: number;
}

export interface ListForSaleItem {
  id: string;
  userId: string;
  companyName: string;
  category: ListForSaleCategory;
  phone: string;
  rate: number | null;
  quantity: number;
  unit: string;
  availabilityFrom: string;
  availabilityTo: string;
  avgWeightKg: number | null;
  eggVariants: EggVariant[] | null;
  typeVariants: TypeVariant[] | null;
  status: ListForSaleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListForSaleBody {
  category: ListForSaleCategory;
  phone: string;
  rate?: number | null;
  quantity: number;
  unit: string;
  availabilityFrom: string;
  availabilityTo: string;
  avgWeightKg?: number | null;
  eggVariants?: EggVariant[] | null;
  typeVariants?: TypeVariant[] | null;
}

export interface UpdateListForSaleBody extends Partial<CreateListForSaleBody> {}

// ==================== QUERY KEYS ====================

export const listForSaleKeys = {
  all: ["list-for-sale"] as const,
  lists: () => [...listForSaleKeys.all, "list"] as const,
  list: (filters?: { status?: ListForSaleStatus; category?: ListForSaleCategory }) =>
    [...listForSaleKeys.lists(), filters ?? {}] as const,
  details: () => [...listForSaleKeys.all, "detail"] as const,
  detail: (id: string) => [...listForSaleKeys.details(), id] as const,
};

// ==================== QUERIES ====================

export function useFarmerListForSale(filters?: { status?: ListForSaleStatus; category?: ListForSaleCategory }) {
  return useQuery({
    queryKey: listForSaleKeys.list(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ success: boolean; data: ListForSaleItem[] }>(
        "/farmer/list-for-sale",
        { params: filters }
      );
      return data;
    },
  });
}

export function useFarmerListForSaleById(id: string | null) {
  return useQuery({
    queryKey: listForSaleKeys.detail(id ?? ""),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ success: boolean; data: ListForSaleItem }>(
        `/farmer/list-for-sale/${id}`
      );
      return data;
    },
    enabled: !!id,
  });
}

// ==================== MUTATIONS ====================

export function useCreateListForSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateListForSaleBody) => {
      const { data } = await axiosInstance.post<{ success: boolean; data: ListForSaleItem }>(
        "/farmer/list-for-sale",
        body
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listForSaleKeys.all });
      toast.success("Listing created");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to create listing");
    },
  });
}

export function useUpdateListForSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateListForSaleBody }) => {
      const { data } = await axiosInstance.put<{ success: boolean; data: ListForSaleItem }>(
        `/farmer/list-for-sale/${id}`,
        body
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listForSaleKeys.all });
      toast.success("Listing updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to update listing");
    },
  });
}

export function useDeleteListForSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete<{ success: boolean }>(`/farmer/list-for-sale/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listForSaleKeys.all });
      toast.success("Listing deleted");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to delete listing");
    },
  });
}

export function useArchiveListForSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.patch<{ success: boolean; data: ListForSaleItem }>(
        `/farmer/list-for-sale/${id}/archive`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listForSaleKeys.all });
      toast.success("Listing archived");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to archive");
    },
  });
}

export function useUnarchiveListForSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.patch<{ success: boolean; data: ListForSaleItem }>(
        `/farmer/list-for-sale/${id}/unarchive`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listForSaleKeys.all });
      toast.success("Listing is live again");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to unarchive");
    },
  });
}
