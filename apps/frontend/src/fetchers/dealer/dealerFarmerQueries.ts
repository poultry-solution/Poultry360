import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== TYPES ====================

export interface DealerFarmerRequest {
  id: string;
  farmerId: string;
  dealerId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectedCount: number;
  lastRejectedAt?: string;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
  farmer?: {
    id: string;
    name: string;
    phone: string;
    status: string;
  };
}

export interface ConnectedFarmer {
  id: string;
  name: string;
  phone: string;
  status: string;
  connectedAt: string;
  connectedVia: "VERIFICATION" | "MANUAL";
  dealerFarmerId: string;
}

interface FarmerRequestsResponse {
  success: boolean;
  data: DealerFarmerRequest[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface FarmerRequestResponse {
  success: boolean;
  data: DealerFarmerRequest;
  message?: string;
}

interface ConnectedFarmersResponse {
  success: boolean;
  data: ConnectedFarmer[];
}

interface GetFarmerRequestsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

// ==================== ACCOUNT TYPES ====================

export interface FarmerAccountInfo {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerPhone?: string;
  farmerCompanyName?: string;
  farmerLocation?: unknown;
  balance: number;
  totalSales: number;
  totalPayments: number;
  lastSaleDate?: string;
  lastPaymentDate?: string;
}

export interface FarmerAccountDetail {
  id: string;
  balance: number;
  totalSales: number;
  totalPayments: number;
  lastSaleDate?: string;
  lastPaymentDate?: string;
  balanceLimit?: number | null;
  balanceLimitSetAt?: string | null;
  balanceLimitSetBy?: string | null;
  dealer: {
    id: string;
    name: string;
    contact: string;
    address?: string;
  };
  farmer: {
    id: string;
    name: string;
    phone: string;
    companyName?: string;
    CompanyFarmLocation?: unknown;
  };
}

export interface FarmerAccountTransaction {
  type: "SALE" | "PAYMENT";
  id: string;
  date: string;
  amount: number;
  reference?: string;
  notes?: string;
  paymentMethod?: string;
  imageUrl?: string;
  balanceAfter?: number;
}

export interface FarmerAccountStatement {
  account: FarmerAccountDetail;
  transactions: FarmerAccountTransaction[];
  pagination: {
    page: number;
    limit: number;
    totalSales: number;
    totalPayments: number;
    totalTransactions: number;
    totalPages: number;
  };
}

export interface RecordFarmerPaymentInput {
  farmerId: string;
  amount: number;
  paymentMethod?: string;
  paymentDate?: string;
  notes?: string;
  reference?: string;
  receiptImageUrl?: string;
  proofImageUrl?: string;
}

export interface SetFarmerBalanceLimitInput {
  farmerId: string;
  balanceLimit: number | null;
}

export interface CheckFarmerBalanceLimitInput {
  farmerId: string;
  saleAmount: number;
}

export interface CheckFarmerBalanceLimitResult {
  allowed: boolean;
  currentBalance: number;
  newBalance: number;
  limit: number | null;
  exceedsBy?: number;
}

// ==================== QUERY KEYS ====================

const dealerFarmerAccountKey = ["dealer-farmer-accounts"] as const;

export const dealerFarmerKeys = {
  all: ["dealer-farmers"] as const,
  requests: (params?: GetFarmerRequestsParams) =>
    [...dealerFarmerKeys.all, "requests", params] as const,
  farmers: () => [...dealerFarmerKeys.all, "farmers"] as const,
  archivedFarmers: () => [...dealerFarmerKeys.all, "archived-farmers"] as const,
  farmer: (id: string) => [...dealerFarmerKeys.all, "farmer", id] as const,
  // Account keys
  accounts: () => [...dealerFarmerAccountKey, "list"] as const,
  account: (farmerId: string) => [...dealerFarmerAccountKey, "detail", farmerId] as const,
  statement: (farmerId: string, filters: string) =>
    [...dealerFarmerAccountKey, "statement", farmerId, { filters }] as const,
};

// ==================== QUERIES ====================

// Get dealer's farmer verification requests (with filters)
export const useGetDealerFarmerRequests = (params?: GetFarmerRequestsParams) => {
  return useQuery<FarmerRequestsResponse>({
    queryKey: dealerFarmerKeys.requests(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.search) queryParams.append("search", params.search);
      if (params?.status) queryParams.append("status", params.status);

      const { data } = await axiosInstance.get<FarmerRequestsResponse>(
        `/verification/dealers/farmer-requests?${queryParams.toString()}`
      );
      return data;
    },
  });
};

// Get dealer's connected farmers
export const useGetConnectedFarmers = () => {
  return useQuery<ConnectedFarmersResponse>({
    queryKey: dealerFarmerKeys.farmers(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ConnectedFarmersResponse>(
        "/verification/dealers/farmers"
      );
      return data;
    },
  });
};

// Get archived farmers
export const useGetArchivedDealerFarmers = () => {
  return useQuery<ConnectedFarmersResponse>({
    queryKey: dealerFarmerKeys.archivedFarmers(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ConnectedFarmersResponse>(
        "/verification/dealers/farmers/archived"
      );
      return data;
    },
  });
};

// ==================== MUTATIONS ====================

// Approve farmer verification request
export const useApproveFarmerRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post<FarmerRequestResponse>(
        `/verification/dealers/farmer-requests/${id}/approve`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerFarmerKeys.all });
    },
  });
};

// Reject farmer verification request
export const useRejectFarmerRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post<FarmerRequestResponse>(
        `/verification/dealers/farmer-requests/${id}/reject`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerFarmerKeys.all });
    },
  });
};

// Archive dealer-farmer connection
export const useArchiveDealerFarmer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data } = await axiosInstance.post(
        `/verification/dealers/farmers/${connectionId}/archive`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerFarmerKeys.farmers() });
      queryClient.invalidateQueries({ queryKey: dealerFarmerKeys.archivedFarmers() });
    },
  });
};

// Unarchive dealer-farmer connection
export const useUnarchiveDealerFarmer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data } = await axiosInstance.post(
        `/verification/dealers/farmers/${connectionId}/unarchive`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerFarmerKeys.farmers() });
      queryClient.invalidateQueries({ queryKey: dealerFarmerKeys.archivedFarmers() });
    },
  });
};

// ==================== FARMER ACCOUNT QUERIES ====================

const farmerAccountsBase = "/dealer/farmer-accounts";

// Get all farmer accounts for the dealer
export const useGetAllFarmerAccounts = () => {
  return useQuery({
    queryKey: dealerFarmerKeys.accounts(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        success: boolean;
        data: FarmerAccountInfo[];
      }>(farmerAccountsBase);
      return data.data;
    },
  });
};

// Get a specific farmer account
export const useGetFarmerAccount = (farmerId: string) => {
  return useQuery({
    queryKey: dealerFarmerKeys.account(farmerId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        success: boolean;
        data: FarmerAccountDetail;
      }>(`${farmerAccountsBase}/${farmerId}`);
      return data.data;
    },
    enabled: !!farmerId,
  });
};

// Get farmer account statement
export const useGetFarmerAccountStatement = (
  farmerId: string,
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
    queryKey: dealerFarmerKeys.statement(farmerId, queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        success: boolean;
        data: FarmerAccountStatement;
      }>(`${farmerAccountsBase}/${farmerId}/statement?${queryString}`);
      return data.data;
    },
    enabled: !!farmerId,
  });
};

// Record payment to farmer account
export const useRecordFarmerPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ farmerId, ...input }: RecordFarmerPaymentInput) => {
      const { data } = await axiosInstance.post(
        `${farmerAccountsBase}/${farmerId}/payments`,
        input
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: dealerFarmerKeys.account(variables.farmerId),
      });
      queryClient.invalidateQueries({
        queryKey: dealerFarmerKeys.accounts(),
      });
      queryClient.invalidateQueries({
        queryKey: [...dealerFarmerAccountKey, "statement", variables.farmerId],
      });
      queryClient.invalidateQueries({
        queryKey: dealerFarmerKeys.all,
      });
    },
  });
};

// Set balance limit for a farmer account
export const useSetFarmerBalanceLimit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      farmerId,
      balanceLimit,
    }: SetFarmerBalanceLimitInput) => {
      const { data } = await axiosInstance.put<{
        success: boolean;
        data: {
          id: string;
          balance: number;
          balanceLimit: number | null;
          balanceLimitSetAt: string | null;
          balanceLimitSetBy: string | null;
        };
        message: string;
      }>(`${farmerAccountsBase}/${farmerId}/balance-limit`, {
        balanceLimit,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: dealerFarmerKeys.account(variables.farmerId),
      });
      queryClient.invalidateQueries({
        queryKey: dealerFarmerKeys.accounts(),
      });
      queryClient.invalidateQueries({
        queryKey: [...dealerFarmerAccountKey, "statement", variables.farmerId],
      });
    },
  });
};

// Check balance limit before a sale (e.g. would new balance exceed limit?)
export const useCheckFarmerBalanceLimit = () => {
  return useMutation({
    mutationFn: async ({
      farmerId,
      saleAmount,
    }: CheckFarmerBalanceLimitInput) => {
      const { data } = await axiosInstance.post<{
        success: boolean;
        data: CheckFarmerBalanceLimitResult;
      }>(`${farmerAccountsBase}/${farmerId}/check-balance-limit`, {
        saleAmount,
      });
      return data.data;
    },
  });
};
