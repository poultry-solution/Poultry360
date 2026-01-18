import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== TYPES ====================

export interface PublicCompany {
  id: string;
  name: string;
  address?: string;
  owner?: {
    name: string;
    phone: string;
  };
}

interface PublicCompaniesResponse {
  success: boolean;
  data: PublicCompany[];
  message?: string;
}

interface PublicCompanySearchFilters {
  search?: string;
  limit?: number;
}

// ==================== QUERY KEYS ====================

export const publicCompanyKeys = {
  all: ["public-companies"] as const,
  search: (search?: string) => [...publicCompanyKeys.all, "search", search] as const,
};

// ==================== QUERIES ====================

// Public company search - no auth required
export const useSearchPublicCompanies = (
  filters: PublicCompanySearchFilters = {},
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

  return useQuery<PublicCompaniesResponse>({
    queryKey: publicCompanyKeys.search(filters.search),
    queryFn: async () => {
      const { data } = await axiosInstance.get<PublicCompaniesResponse>(
        `/public/companies/search?${queryString}`
      );
      return data;
    },
    staleTime: 5000, // Cache for 3 seconds
    enabled: shouldFetch,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
