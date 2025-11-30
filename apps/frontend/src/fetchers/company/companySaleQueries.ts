import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// Query keys
export const companySaleKeys = {
  all: ["company-sales"] as const,
  lists: () => [...companySaleKeys.all, "list"] as const,
  list: (filters: string) => [...companySaleKeys.lists(), { filters }] as const,
  details: () => [...companySaleKeys.all, "detail"] as const,
  detail: (id: string) => [...companySaleKeys.details(), id] as const,
  statistics: () => [...companySaleKeys.all, "statistics"] as const,
};

// Types
export interface CompanySale {
  id: string;
  invoiceNumber: string;
  date: Date;
  totalAmount: number;
  paidAmount: number;
  dueAmount?: number;
  isCredit: boolean;
  paymentMethod?: string;
  notes?: string;
  companyId: string;
  dealerId: string;
  dealer?: any;
  items: CompanySaleItem[];
  payments: CompanySalePayment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanySaleItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  productId: string;
  product?: any;
}

export interface CompanySalePayment {
  id: string;
  amount: number;
  paymentDate: Date;
  method?: string;
  notes?: string;
}

export interface CreateCompanySaleInput {
  dealerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  paidAmount: number;
  paymentMethod?: string;
  notes?: string;
  date?: Date;
}

export interface AddSalePaymentInput {
  amount: number;
  paymentDate?: Date;
  description?: string;
  paymentMethod?: string;
}

// Get company sales with filters
export const useGetCompanySales = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  isPaid?: boolean;
  dealerId?: string;
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: companySaleKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/company/sales?${queryString}`);
      return data;
    },
  });
};

// Get company sale by ID
export const useGetCompanySaleById = (id: string) => {
  return useQuery({
    queryKey: companySaleKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/company/sales/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

// Get sales statistics
export const useGetCompanySalesStatistics = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: companySaleKeys.statistics(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/company/sales/statistics?${queryString}`
      );
      return data;
    },
  });
};

// Create company sale
export const useCreateCompanySale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCompanySaleInput) => {
      const { data } = await axiosInstance.post("/company/sales", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companySaleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companySaleKeys.statistics() });
      queryClient.invalidateQueries({ queryKey: ["companyProducts"] });
    },
  });
};

// Add sale payment
export const useAddCompanySalePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: AddSalePaymentInput & { id: string }) => {
      const { data } = await axiosInstance.post(
        `/company/sales/${id}/payments`,
        input
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: companySaleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companySaleKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: companySaleKeys.statistics() });
    },
  });
};

