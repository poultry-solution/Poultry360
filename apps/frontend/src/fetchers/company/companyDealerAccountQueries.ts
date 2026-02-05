import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import type { BalanceLimitCheckResult } from "@poultry360/shared-types";

// Query keys
export const companyDealerAccountKeys = {
  all: ["company-dealer-account"] as const,
  lists: () => [...companyDealerAccountKeys.all, "list"] as const,
  details: () => [...companyDealerAccountKeys.all, "detail"] as const,
  detail: (dealerId: string) => [...companyDealerAccountKeys.details(), dealerId] as const,
  statement: (dealerId: string, filters: string) =>
    [...companyDealerAccountKeys.all, "statement", dealerId, { filters }] as const,
};

// Types
export interface DealerAccountInfo {
  id: string;
  dealerId: string;
  dealerName: string;
  dealerContact: string;
  dealerAddress?: string;
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
  balanceLimit?: number | null;
  balanceLimitSetAt?: Date | null;
  balanceLimitSetBy?: string | null;
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
}

export interface SaleRecord {
  id: string;
  invoiceNumber: string | null;
  date: Date;
  amount: number;
  notes: string | null;
  invoiceImageUrl: string | null;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  notes: string | null;
  reference: string | null;
  receiptImageUrl: string | null;
  proofImageUrl: string | null;
  balanceAfter: number;
}

export interface AccountStatement {
  account: AccountDetail;
  sales: SaleRecord[];
  payments: PaymentRecord[];
  transactions: AccountTransaction[]; // Combined for backward compatibility
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
  dealerId: string;
  amount: number;
  paymentMethod?: string;
  paymentDate?: Date;
  notes?: string;
  reference?: string;
  receiptImageUrl?: string;
  proofImageUrl?: string;
}

// Get all dealer accounts for company
export const useGetAllDealerAccounts = () => {
  return useQuery({
    queryKey: companyDealerAccountKeys.lists(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        success: boolean;
        data: DealerAccountInfo[];
      }>("/company/dealers/accounts");
      return data.data;
    },
  });
};

// Get specific dealer account
export const useGetDealerAccount = (dealerId: string) => {
  return useQuery({
    queryKey: companyDealerAccountKeys.detail(dealerId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        success: boolean;
        data: AccountDetail;
      }>(`/company/dealers/${dealerId}/account`);
      return data.data;
    },
    enabled: !!dealerId,
  });
};

// Get dealer account statement
export const useGetDealerAccountStatement = (
  dealerId: string,
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
    queryKey: companyDealerAccountKeys.statement(dealerId, queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        success: boolean;
        data: AccountStatement;
      }>(`/company/dealers/${dealerId}/statement?${queryString}`);
      return data.data;
    },
    enabled: !!dealerId,
  });
};

// Record payment from dealer
export const useRecordDealerPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealerId, ...input }: RecordPaymentInput) => {
      const { data } = await axiosInstance.post(
        `/company/dealers/${dealerId}/payments`,
        input
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: companyDealerAccountKeys.detail(variables.dealerId),
      });
      queryClient.invalidateQueries({
        queryKey: companyDealerAccountKeys.lists(),
      });
    },
  });
};

// Set dealer balance limit
export const useSetDealerBalanceLimit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      dealerId: string;
      balanceLimit: number | null;
    }) => {
      const { data } = await axiosInstance.put(
        `/company/dealers/${params.dealerId}/account/balance-limit`,
        { balanceLimit: params.balanceLimit }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: companyDealerAccountKeys.detail(variables.dealerId),
      });
      queryClient.invalidateQueries({ queryKey: companyDealerAccountKeys.all });
      queryClient.invalidateQueries({ queryKey: ["companyDealers"] });
    },
  });
};

// Check dealer balance limit
export const useCheckDealerBalanceLimit = () => {
  return useMutation({
    mutationFn: async (params: {
      dealerId: string;
      saleAmount: number;
    }) => {
      const { data } = await axiosInstance.post<{ success: boolean; data: BalanceLimitCheckResult }>(
        `/company/dealers/${params.dealerId}/account/check-balance-limit`,
        { saleAmount: params.saleAmount }
      );
      return data.data;
    },
  });
};
