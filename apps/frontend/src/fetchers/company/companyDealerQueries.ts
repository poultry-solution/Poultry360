import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// Query keys
export const companyDealerKeys = {
  all: ["company-dealers"] as const,
  lists: () => [...companyDealerKeys.all, "list"] as const,
  list: (filters: string) => [...companyDealerKeys.lists(), { filters }] as const,
  details: () => [...companyDealerKeys.all, "detail"] as const,
  detail: (id: string) => [...companyDealerKeys.details(), id] as const,
};

// Types
export interface CompanyDealer {
  id: string;
  name: string;
  contact: string;
  address?: string;
  balance?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyDealerInput {
  name: string;
  contact: string;
  address?: string;
}

export interface UpdateCompanyDealerInput extends Partial<CreateCompanyDealerInput> {}

// Get company dealers
export const useGetCompanyDealers = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: companyDealerKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/company/sales/search-dealers?${queryString}`);
      return data;
    },
  });
};

// Search dealers (for quick search in sales flow)
export const useSearchCompanyDealers = (search: string) => {
  return useQuery({
    queryKey: [...companyDealerKeys.all, "search", search],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/company/sales/search-dealers", {
        params: { search, limit: 50 },
      });
      return data;
    },
    enabled: search.length >= 2,
  });
};

// Get company dealer by ID
export const useGetCompanyDealerById = (id: string) => {
  return useQuery({
    queryKey: companyDealerKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/dealers/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

// Create company dealer
export const useCreateCompanyDealer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCompanyDealerInput) => {
      const { data } = await axiosInstance.post("/dealers", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyDealerKeys.lists() });
    },
  });
};

// Update company dealer
export const useUpdateCompanyDealer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateCompanyDealerInput & { id: string }) => {
      const { data } = await axiosInstance.put(`/dealers/${id}`, input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: companyDealerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyDealerKeys.detail(variables.id) });
    },
  });
};

// Delete company dealer
export const useDeleteCompanyDealer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/dealers/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyDealerKeys.lists() });
    },
  });
};

// Archive company-dealer connection
export const useArchiveCompanyDealer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data } = await axiosInstance.post(
        `/verification/companies/dealers/${connectionId}/archive`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyDealerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["company-dealers"] });
      queryClient.invalidateQueries({ queryKey: ["company-dealers-archived"] });
    },
  });
};

// Unarchive company-dealer connection
export const useUnarchiveCompanyDealer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data } = await axiosInstance.post(
        `/verification/companies/dealers/${connectionId}/unarchive`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyDealerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["company-dealers"] });
      queryClient.invalidateQueries({ queryKey: ["company-dealers-archived"] });
    },
  });
};

// Get archived dealers for company
export const useGetArchivedCompanyDealers = () => {
  return useQuery({
    queryKey: ["company-dealers-archived"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/verification/companies/dealers/archived");
      return data;
    },
  });
};

