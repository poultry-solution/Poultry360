import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/common/lib/axios";

// ==================== TYPES ====================

export type ListForSaleCategoryPublic = "CHICKEN" | "EGGS" | "LAYERS" | "FISH" | "OTHER";

export interface ListForSalePublicItem {
  id: string;
  companyName: string;
  category: ListForSaleCategoryPublic;
  phone: string;
  rate: number | null;
  quantity: number;
  unit: string;
  availabilityFrom: string;
  availabilityTo: string;
  avgWeightKg: number | null;
  eggVariants: Array<{ size: string; quantity: number; rate: number }> | null;
  typeVariants: Array<{ type: string; quantity: number; rate: number }> | null;
  createdAt: string;
}

interface PublicListForSaleResponse {
  success: boolean;
  data: ListForSalePublicItem[];
  total: number;
}

// ==================== QUERY KEYS ====================

export const publicListForSaleKeys = {
  all: ["public", "list-for-sale"] as const,
  list: (category?: ListForSaleCategoryPublic | null, limit?: number, offset?: number) =>
    [...publicListForSaleKeys.all, category ?? "all", limit, offset] as const,
};

// ==================== QUERIES ====================

export function usePublicListForSale(
  category?: ListForSaleCategoryPublic | null,
  limit = 50,
  offset = 0
) {
  return useQuery<PublicListForSaleResponse>({
    queryKey: publicListForSaleKeys.list(category, limit, offset),
    queryFn: async () => {
      const params: Record<string, string | number> = { limit, offset };
      if (category) params.category = category;
      const { data } = await publicApi.get<PublicListForSaleResponse>("/public/list-for-sale", {
        params,
      });
      return data;
    },
  });
}
