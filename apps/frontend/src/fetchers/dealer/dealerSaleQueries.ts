import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// Query keys
export const dealerSaleKeys = {
  all: ["dealer-sales"] as const,
  lists: () => [...dealerSaleKeys.all, "list"] as const,
  list: (filters: string) => [...dealerSaleKeys.lists(), { filters }] as const,
  details: () => [...dealerSaleKeys.all, "detail"] as const,
  detail: (id: string) => [...dealerSaleKeys.details(), id] as const,
  statistics: () => [...dealerSaleKeys.all, "statistics"] as const,
};

// Types
export interface DealerSale {
  id: string;
  invoiceNumber: string;
  date: Date;
  totalAmount: number;
  paidAmount: number;
  dueAmount?: number;
  isCredit: boolean;
  paymentMethod?: string;
  notes?: string;
  dealerId: string;
  customerId?: string;
  farmerId?: string;
  accountId?: string;
  customer?: any;
  farmer?: any;
  items: DealerSaleItem[];
  payments: DealerSalePayment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DealerSaleItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  productId: string;
  dealerProduct?: any;
  product?: any;
}

export interface DealerSalePayment {
  id: string;
  amount: number;
  paymentDate: Date;
  method?: string;
  notes?: string;
  status?: string;
}

export interface CreateDealerSaleInput {
  customerId: string;
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

export interface CreateCustomerInput {
  name: string;
  phone: string;
  address?: string;
  category?: string;
}

// Get dealer sales with filters
export const useGetDealerSales = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  isPaid?: boolean;
  customerId?: string;
  farmerId?: string;
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: dealerSaleKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/dealer/sales?${queryString}`);
      return data;
    },
  });
};

// Get dealer sale by ID
export const useGetDealerSaleById = (id: string) => {
  return useQuery({
    queryKey: dealerSaleKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/dealer/sales/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

// Get sales statistics
export const useGetSalesStatistics = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: dealerSaleKeys.statistics(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/dealer/sales/statistics?${queryString}`
      );
      return data;
    },
  });
};

// Search customers/farmers
export const useSearchCustomers = (search: string) => {
  return useQuery({
    queryKey: ["dealer-customer-search", search],
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/dealer/sales/customers/search`,
        {
          params: { search },
        }
      );
      return data;
    },
    enabled: search.length >= 2,
  });
};

// Create dealer sale
export const useCreateDealerSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDealerSaleInput) => {
      const { data } = await axiosInstance.post("/dealer/sales", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerSaleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerSaleKeys.statistics() });
      queryClient.invalidateQueries({ queryKey: ["dealerProducts"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] });
    },
  });
};

// Add sale payment
export const useAddSalePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: AddSalePaymentInput & { id: string }) => {
      const { data } = await axiosInstance.post(
        `/dealer/sales/${id}/payments`,
        input
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dealerSaleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerSaleKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: dealerSaleKeys.statistics() });
      queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] });
    },
  });
};

// Create customer on-the-fly
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => {
      const { data } = await axiosInstance.post("/dealer/sales/customers", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealer-customers"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-customer-search"] });
    },
  });
};
