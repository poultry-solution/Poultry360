import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { dealerSaleKeys } from "@/fetchers/dealer/dealerSaleQueries";

// Query keys
export const dealerLedgerKeys = {
  all: ["dealer-ledger"] as const,
  lists: () => [...dealerLedgerKeys.all, "list"] as const,
  list: (filters: string) => [...dealerLedgerKeys.lists(), { filters }] as const,
  balance: () => [...dealerLedgerKeys.all, "balance"] as const,
  summary: () => [...dealerLedgerKeys.all, "summary"] as const,
  party: (partyId: string) => [...dealerLedgerKeys.all, "party", partyId] as const,
};

// Types
export interface DealerLedgerEntry {
  id: string;
  type: string;
  amount: number;
  balance: number;
  date: Date;
  description?: string;
  reference?: string;
  dealerId: string;
  saleId?: string;
  consignmentId?: string;
  partyId?: string;
  partyType?: string;
  sale?: any;
  consignment?: any;
  createdAt: Date;
}

export interface LedgerBalanceResponse {
  success: boolean;
  data: {
    balance: number;
  };
}

export interface LedgerSummaryResponse {
  success: boolean;
  data: {
    currentBalance: number;
    totalSales: number;
    totalPaidAmount: number;
    totalDueAmount: number;
    totalAdvances: number;
    totalPurchases: number;
    totalPaymentsReceived: number;
    totalPaymentsMade: number;
    entriesByType: Array<{
      type: string;
      count: number;
      total: number;
    }>;
    outstandingBalances: number;
  };
}

export interface CreateAdjustmentInput {
  amount: number;
  description: string;
  reference?: string;
  date?: Date;
}

// Get ledger entries
export const useGetLedgerEntries = (params?: {
  page?: number;
  limit?: number;
  type?: string;
  partyId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: dealerLedgerKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/dealer/ledger?${queryString}`);
      return data;
    },
  });
};

// Get current balance
export const useGetCurrentBalance = () => {
  return useQuery({
    queryKey: dealerLedgerKeys.balance(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<LedgerBalanceResponse>(
        "/dealer/ledger/balance"
      );
      return data;
    },
  });
};

// Get ledger summary
export const useGetLedgerSummary = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: dealerLedgerKeys.summary(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<LedgerSummaryResponse>(
        `/dealer/ledger/summary?${queryString}`
      );
      return data;
    },
  });
};

// Get party-specific ledger
export const useGetPartyLedger = (
  partyId: string,
  params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }
) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: dealerLedgerKeys.party(partyId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/dealer/ledger/party/${partyId}?${queryString}`
      );
      return data;
    },
    enabled: !!partyId,
  });
};

// Create adjustment
export const useCreateAdjustment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAdjustmentInput) => {
      const { data } = await axiosInstance.post("/dealer/ledger/adjustment", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerLedgerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerLedgerKeys.balance() });
      queryClient.invalidateQueries({ queryKey: dealerLedgerKeys.summary() });
    },
  });
};

// Get dealer ledger parties (customers/farmers with balances)
export const useGetDealerLedgerParties = (search?: string) => {
  return useQuery({
    queryKey: [...dealerLedgerKeys.all, "parties", search || ""],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/dealer/ledger/parties", {
        params: { search },
      });
      return data;
    },
  });
};

/** Delete an account-level general payment (manual customer only). Requires password in body. */
export const useDeleteDealerManualGeneralPayment = (customerId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ledgerEntryId,
      password,
    }: {
      ledgerEntryId: string;
      password: string;
    }) => {
      const { data } = await axiosInstance.delete(
        `/dealer/ledger/payments/${ledgerEntryId}`,
        { data: { password } }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerLedgerKeys.all });
      queryClient.invalidateQueries({ queryKey: dealerSaleKeys.all });
      queryClient.invalidateQueries({ queryKey: ["dealer-customer", customerId] });
      queryClient.invalidateQueries({ queryKey: dealerLedgerKeys.party(customerId) });
    },
  });
};

// Add dealer payment
export const useAddDealerPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      saleId?: string;      // Optional now - for bill-wise payment
      customerId?: string;  // Optional - for general payment (auto-allocate)
      amount: number;
      paymentMethod?: string;
      date?: string;
      notes?: string;
      receiptImageUrl?: string;
      reference?: string;
    }) => {
      const { data } = await axiosInstance.post("/dealer/ledger/payments", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerLedgerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerLedgerKeys.balance() });
      queryClient.invalidateQueries({ queryKey: dealerLedgerKeys.summary() });
      queryClient.invalidateQueries({ queryKey: [...dealerLedgerKeys.all, "parties"] });
    },
  });
};

// Export ledger
export const useExportLedger = () => {
  return useMutation({
    mutationFn: async (params?: {
      format?: string;
      startDate?: string;
      endDate?: string;
      type?: string;
    }) => {
      const queryString = new URLSearchParams(
        Object.entries(params || {})
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ).toString();

      const response = await axiosInstance.get(
        `/dealer/ledger/export?${queryString}`,
        {
          responseType: params?.format === "csv" ? "blob" : "json",
        }
      );

      if (params?.format === "csv") {
        // Create download link for CSV
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `ledger-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      return response.data;
    },
  });
};

