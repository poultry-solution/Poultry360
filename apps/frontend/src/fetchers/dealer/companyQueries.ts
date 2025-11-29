import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const companySearchKeys = {
  all: ["company-search"] as const,
  search: (query: string) => [...companySearchKeys.all, "search", query] as const,
};

export interface Company {
  id: string;
  name: string;
  owner?: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface CompanySearchResponse {
  success: boolean;
  data: Company[];
}

// Search companies (for dealers to find companies)
export const useSearchCompanies = (search: string) => {
  return useQuery({
    queryKey: companySearchKeys.search(search),
    queryFn: async () => {
      const { data } = await axiosInstance.get<CompanySearchResponse>(
        "/dealer/sales/companies/search",
        {
          params: { search },
        }
      );
      return data;
    },
    enabled: search.length >= 2, // Only search when at least 2 characters
  });
};

