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
  // Clean up filters to remove empty values
  const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      (acc as any)[key] = value;
    }
    return acc;
  }, {} as AccountTransactionsFilters);

  console.log("Query params being sent:", cleanFilters); // Debug log

  return useQuery<AccountTransactionsResponse>({
    queryKey: accountKeys.transactions(cleanFilters),
    queryFn: async () => {
      const response = await axiosInstance.get("/account/transactions", {
        params: cleanFilters,
      });
      console.log("Query response:", response.data); // Debug log
      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 0, // Don't cache - always fetch fresh data
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: false,
  });
};

