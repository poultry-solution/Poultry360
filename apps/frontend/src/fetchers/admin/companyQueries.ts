import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== QUERY KEYS ====================
export const adminCompanyKeys = {
  all: ["admin-companies"] as const,
  lists: () => [...adminCompanyKeys.all, "list"] as const,
  list: (filters: string) =>
    [...adminCompanyKeys.lists(), { filters }] as const,
  details: () => [...adminCompanyKeys.all, "detail"] as const,
  detail: (id: string) => [...adminCompanyKeys.details(), id] as const,
};

// ==================== TYPES ====================
export interface AdminCompany {
  id: string;
  name: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    name: string;
    phone: string;
    status: string;
    createdAt: Date;
  };
  _count: {
    dealerCompanies: number;
    companySales: number;
    consignments: number;
    ledgerEntries: number;
    paymentRequests?: number;
  };
  managedBy?: Array<{
    id: string;
    name: string;
    phone: string;
    status: string;
  }>;
}

export interface CreateCompanyInput {
  ownerName: string;
  ownerPhone: string;
  ownerPassword: string;
  companyName: string;
  companyAddress?: string;
  ownerStatus?: "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";
}

export interface UpdateCompanyInput {
  ownerName?: string;
  ownerPhone?: string;
  ownerPassword?: string;
  companyName?: string;
  companyAddress?: string;
  ownerStatus?: "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";
}

export interface CompaniesResponse {
  success: boolean;
  data: AdminCompany[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CompanyResponse {
  success: boolean;
  data: AdminCompany;
}

export interface AdminCompanyFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";
}

// ==================== QUERY HOOKS ====================

// Get all companies
export const useGetAdminCompanies = (
  filters: AdminCompanyFilters = {},
  options?: { enabled?: boolean }
) => {
  const queryString = new URLSearchParams(
    Object.entries(filters)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  // Only enable query if explicitly enabled and search conditions are met
  const shouldFetch =
    (options?.enabled ?? true) &&
    (!filters.search || filters.search.length >= 2);

  return useQuery<CompaniesResponse>({
    queryKey: adminCompanyKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<CompaniesResponse>(
        `/admin/companies?${queryString}`
      );
      return data;
    },
    staleTime: 3000, // Cache for 5 seconds to prevent flickering
    enabled: shouldFetch, // Only fetch when explicitly enabled and conditions are met
    refetchOnWindowFocus: false, // Prevent refetch on window focus
  });
};

// Get company by ID
export const useGetAdminCompanyById = (id: string) => {
  return useQuery<CompanyResponse>({
    queryKey: adminCompanyKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<CompanyResponse>(
        `/admin/companies/${id}`
      );
      return data;
    },
    enabled: !!id,
  });
};

// ==================== MUTATION HOOKS ====================

// Create company
export const useCreateAdminCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCompanyInput) => {
      const { data } = await axiosInstance.post("/admin/companies", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCompanyKeys.lists() });
    },
  });
};

// Update company
export const useUpdateAdminCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateCompanyInput & { id: string }) => {
      const { data } = await axiosInstance.put(`/admin/companies/${id}`, input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminCompanyKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: adminCompanyKeys.detail(variables.id),
      });
    },
  });
};

// Delete company
export const useDeleteAdminCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/admin/companies/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCompanyKeys.lists() });
    },
  });
};
