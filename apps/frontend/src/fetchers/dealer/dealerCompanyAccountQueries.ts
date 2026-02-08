import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// Query keys
export const dealerCompanyAccountKeys = {
  all: ["dealer-company-account"] as const,
  lists: () => [...dealerCompanyAccountKeys.all, "list"] as const,
  details: () => [...dealerCompanyAccountKeys.all, "detail"] as const,
  detail: (companyId: string) =>
    [...dealerCompanyAccountKeys.details(), companyId] as const,
  statement: (companyId: string, filters: string) =>
    [...dealerCompanyAccountKeys.all, "statement", companyId, { filters }] as const,
};

// Types
export interface CompanyAccountInfo {
  id: string;
  companyId: string;
  companyName: string;
  companyAddress?: string;
  balance: number;
  totalSales: number;
  totalPayments: number;
  lastSaleDate?: Date;
  lastPaymentDate?: Date;
}

export interface AccountDetail {
  id: string;
  balance: number;
  totalSales: number;
  totalPayments: number;
  lastSaleDate?: Date;
  lastPaymentDate?: Date;
  dealer: {
    id: string;
    name: string;
    contact: string;
    address?: string;
  };
  company: {
    id: string;
    name: string;
    address?: string;
  };
}

export interface AccountTransaction {
  type: "SALE" | "PAYMENT";
  id: string;
  date: Date;
  amount: number;
  reference?: string;
  notes?: string;
  paymentMethod?: string;
  imageUrl?: string;
  balanceAfter?: number;
  subtotalAmount?: number | null;
  discountType?: string | null;
  discountValue?: number | null;
}

export interface AccountStatement {
  account: AccountDetail;
  transactions: AccountTransaction[];
  pagination: {
    page: number;
    limit: number;
    totalSales: number;
    totalPayments: number;
    totalTransactions: number;
    totalPages: number;
  };
}

export interface RecordPaymentInput {
  companyId: string;
  amount: number;
  paymentMethod?: string;
  paymentDate?: Date;
  notes?: string;
  reference?: string;
  receiptImageUrl?: string;
  proofImageUrl?: string;
}

// Get all company accounts for dealer
export const useGetAllCompanyAccounts = () => {
  return useQuery({
    queryKey: dealerCompanyAccountKeys.lists(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        success: boolean;
        data: CompanyAccountInfo[];
      }>("/dealer/companies/accounts");
      return data.data;
    },
  });
};

// Get specific company account
export const useGetCompanyAccount = (companyId: string) => {
  return useQuery({
    queryKey: dealerCompanyAccountKeys.detail(companyId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        success: boolean;
        data: AccountDetail;
      }>(`/dealer/companies/${companyId}/account`);
      return data.data;
    },
    enabled: !!companyId,
  });
};

// Get company account statement
export const useGetCompanyAccountStatement = (
  companyId: string,
  params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }
) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: dealerCompanyAccountKeys.statement(companyId, queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        success: boolean;
        data: AccountStatement;
      }>(`/dealer/companies/${companyId}/statement?${queryString}`);
      return data.data;
    },
    enabled: !!companyId,
  });
};

// Record payment to company
export const useRecordCompanyPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, ...input }: RecordPaymentInput) => {
      const { data } = await axiosInstance.post(
        `/dealer/companies/${companyId}/payments`,
        input
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: dealerCompanyAccountKeys.detail(variables.companyId),
      });
      queryClient.invalidateQueries({
        queryKey: dealerCompanyAccountKeys.lists(),
      });
    },
  });
};
