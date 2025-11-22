import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== QUERY KEYS ====================
export const accountKeys = {
  all: ["account"] as const,
  transactions: (filters: Record<string, any>) =>
    [...accountKeys.all, "transactions", filters] as const,
};

// ==================== TYPES ====================
export interface AccountTransaction {
  id: string;
  type: string;
  amount: number;
  quantity: number | null;
  freeQuantity: number | null;
  itemName: string | null;
  date: string | Date;
  description: string | null;
  reference: string | null;
  entityType: string;
  entityName: string;
  entityId: string | null;
  paymentToPurchaseId: string | null;
  source: "EntityTransaction" | "Sale";
  debit: number;
  credit: number;
  runningBalance: number;
  isCredit?: boolean;
  paidAmount?: number;
}

export interface AccountTransactionsResponse {
  success: boolean;
  data: AccountTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AccountTransactionsFilters {
  page?: number;
  limit?: number;
  entityType?: string;
  transactionType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// ==================== QUERY HOOKS ====================

// Get all account transactions
export const useGetAllAccountTransactions = (
  filters: AccountTransactionsFilters = {},
  options?: { enabled?: boolean }
) => {
  return useQuery<AccountTransactionsResponse>({
    queryKey: accountKeys.transactions(filters),
    queryFn: async () => {
      const response = await axiosInstance.get("/account/transactions", {
        params: filters,
      });
      return response.data;
    },
    enabled: options?.enabled !== false,
  });
};

