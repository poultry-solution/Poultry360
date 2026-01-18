import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== TYPES ====================

export interface PublicDealer {
  id: string;
  name: string;
  contact: string;
  address?: string;
  owner?: {
    name: string;
    phone: string;
  };
}

interface PublicDealersResponse {
  success: boolean;
  data: PublicDealer[];
  message?: string;
}

interface PublicDealerSearchFilters {
  search?: string;
  limit?: number;
}

// ==================== QUERY KEYS ====================

export const publicDealerKeys = {
  all: ["public-dealers"] as const,
  search: (search?: string) => [...publicDealerKeys.all, "search", search] as const,
};

// ==================== QUERIES ====================

// Public dealer search - no auth required
export const useSearchPublicDealers = (
  filters: PublicDealerSearchFilters = {},
  options?: { enabled?: boolean }
) => {
  const queryString = new URLSearchParams(
    Object.entries(filters)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  // Only enable if search is at least 2 characters
  const shouldFetch =
    (options?.enabled ?? true) &&
    filters.search !== undefined &&
    filters.search.length >= 2;

  return useQuery<PublicDealersResponse>({
    queryKey: publicDealerKeys.search(filters.search),
    queryFn: async () => {
      const { data } = await axiosInstance.get<PublicDealersResponse>(
        `/public/dealers/search?${queryString}`
      );
      return data;
    },
    staleTime: 5000, // Cache for 5 seconds
    enabled: shouldFetch,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
