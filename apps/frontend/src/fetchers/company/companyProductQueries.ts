import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// Query keys
export const companyProductKeys = {
  all: ["company-products"] as const,
  lists: () => [...companyProductKeys.all, "list"] as const,
  list: (filters: string) => [...companyProductKeys.lists(), { filters }] as const,
  details: () => [...companyProductKeys.all, "detail"] as const,
  detail: (id: string) => [...companyProductKeys.details(), id] as const,
  summary: () => [...companyProductKeys.all, "summary"] as const,
};

// Types
export interface CompanyProduct {
  id: string;
  name: string;
  description?: string;
  type: string;
  unit: string;
  price: number;
  quantity: number;
  currentStock: number;
  totalPrice: number;
  imageUrl?: string;
  supplierId?: string;
  companyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyProductInput {
  name: string;
  description?: string;
  type: string;
  unit: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface UpdateCompanyProductInput extends Partial<CreateCompanyProductInput> {}

export interface CompanyProductsResponse {
  success: boolean;
  data: CompanyProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CompanyProductSummaryResponse {
  success: boolean;
  data: {
    totalProducts: number;
    totalInventoryValue: number;
    dealersCount: number;
    productsByType: Array<{
      type: string;
      count: number;
      totalQuantity: number;
      totalValue: number;
    }>;
  };
}

// Get company products
export const useGetCompanyProducts = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: companyProductKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<CompanyProductsResponse>(
        `/company/products?${queryString}`
      );
      return data;
    },
  });
};

// Get company product by ID
export const useGetCompanyProductById = (id: string) => {
  return useQuery({
    queryKey: companyProductKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/company/products/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

// Get company product summary
export const useGetCompanyProductSummary = () => {
  return useQuery({
    queryKey: companyProductKeys.summary(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<CompanyProductSummaryResponse>(
        "/company/products/summary"
      );
      return data;
    },
  });
};

// Create company product
export const useCreateCompanyProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCompanyProductInput) => {
      const { data } = await axiosInstance.post("/company/products", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyProductKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyProductKeys.summary() });
    },
  });
};

// Update company product
export const useUpdateCompanyProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateCompanyProductInput & { id: string }) => {
      const { data } = await axiosInstance.put(`/company/products/${id}`, input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: companyProductKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyProductKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: companyProductKeys.summary() });
    },
  });
};

// Delete company product
export const useDeleteCompanyProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/company/products/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyProductKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyProductKeys.summary() });
    },
  });
};

// Adjust product stock
export const useAdjustCompanyProductStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { data } = await axiosInstance.post(
        `/company/products/${id}/adjust-stock`,
        { quantity }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: companyProductKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyProductKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: companyProductKeys.summary() });
    },
  });
};

