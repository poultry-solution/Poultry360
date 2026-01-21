import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// Query keys
export const dealerCompanyKeys = {
  all: ["dealer-company"] as const,
  products: () => [...dealerCompanyKeys.all, "products"] as const,
  productList: (companyId: string, filters: string) =>
    [...dealerCompanyKeys.products(), companyId, { filters }] as const,
};

// Types
export interface CompanyProduct {
  id: string;
  name: string;
  description?: string;
  type: string;
  unit: string;
  price: number;
  currentStock: number;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyInfo {
  id: string;
  name: string;
  address?: string;
}

export interface CompanyProductsResponse {
  success: boolean;
  data: CompanyProduct[];
  company: CompanyInfo;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Get company products for catalog
export const useGetCompanyProducts = (
  companyId: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
  }
) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: dealerCompanyKeys.productList(companyId, queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<CompanyProductsResponse>(
        `/dealer/companies/${companyId}/products?${queryString}`
      );
      return data;
    },
    enabled: !!companyId,
  });
};
