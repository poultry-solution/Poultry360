import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== TYPES ====================

export interface FarmerVerificationRequest {
  id: string;
  farmerId: string;
  dealerId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectedCount: number;
  lastRejectedAt?: string;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
  dealer?: {
    id: string;
    name: string;
    contact: string;
    address?: string;
    owner?: {
      name: string;
      phone: string;
    };
  };
}

export interface ConnectedDealer {
  id: string;
  name: string;
  contact: string;
  address?: string;
  connectedAt: string;
  connectedVia: "VERIFICATION" | "MANUAL";
  dealerFarmerId: string;
  balance?: number;
  owner?: {
    name: string;
    phone: string;
  };
}

interface CreateVerificationRequestInput {
  dealerId: string;
}

interface VerificationRequestsResponse {
  success: boolean;
  data: FarmerVerificationRequest[];
}

interface VerificationRequestResponse {
  success: boolean;
  data: FarmerVerificationRequest;
  message?: string;
}

interface ConnectedDealersResponse {
  success: boolean;
  data: ConnectedDealer[];
}

// Full dealer details for farmer (single route: dealer + account + sales + payments)
export interface FarmerDealerDetailsDealer {
  id: string;
  name: string;
  contact: string;
  address?: string;
  owner?: { id: string; name: string; phone: string };
  _count?: { products: number; sales: number };
}

export interface FarmerDealerDetailsAccount {
  id: string;
  balance: number;
  totalSales: number;
  totalPayments: number;
  lastSaleDate?: string;
  lastPaymentDate?: string;
  balanceLimit?: number | null;
  openingBalance?: ConnectedOpeningBalanceSnapshot | null;
  openingBalanceHistory?: ConnectedOpeningBalanceSnapshot[];
}

export interface ConnectedOpeningBalanceSnapshot {
  id: string;
  amount: number;
  status: "PENDING_ACK" | "ACKNOWLEDGED" | "DISPUTED";
  notes?: string | null;
  createdAt: string;
  createdByRole: "DEALER" | "FARMER";
  respondedAt?: string | null;
  farmerResponseNote?: string | null;
}

export interface FarmerDealerDetailsSale {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  subtotalAmount?: number | null;
  discountType?: string | null;
  discountValue?: number | null;
  notes?: string;
}

export interface FarmerDealerDetailsPayment {
  id: string;
  amount: number;
  paymentMethod?: string;
  paymentDate: string;
  notes?: string;
  reference?: string;
  balanceAfter?: number;
}

export interface FarmerDealerDetailsTransaction {
  type: "SALE" | "PAYMENT";
  id: string;
  date: string;
  amount: number;
  reference?: string;
  notes?: string;
  paymentMethod?: string;
  balanceAfter?: number;
}

export interface FarmerDealerDetailsData {
  dealer: FarmerDealerDetailsDealer;
  connection?: { id: string };
  account: FarmerDealerDetailsAccount;
  sales: FarmerDealerDetailsSale[];
  payments: FarmerDealerDetailsPayment[];
  transactions: FarmerDealerDetailsTransaction[];
  statementPagination?: {
    page: number;
    limit: number;
    totalSales: number;
    totalPayments: number;
    totalTransactions: number;
    totalPages: number;
  };
}

export interface FarmerDealerDetailsResponse {
  success: boolean;
  data: FarmerDealerDetailsData;
}

// ==================== QUERY KEYS ====================

export const farmerVerificationKeys = {
  all: ["farmer-verification"] as const,
  requests: () => [...farmerVerificationKeys.all, "requests"] as const,
  dealers: () => [...farmerVerificationKeys.all, "dealers"] as const,
  archivedDealers: () => [...farmerVerificationKeys.all, "archived-dealers"] as const,
  dealer: (id: string) => [...farmerVerificationKeys.all, "dealer", id] as const,
};

// ==================== QUERIES ====================

// Get farmer's verification requests
export const useGetFarmerVerificationRequests = (options?: { enabled?: boolean }) => {
  return useQuery<VerificationRequestsResponse>({
    queryKey: farmerVerificationKeys.requests(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<VerificationRequestsResponse>(
        "/verification/farmers/verification-requests"
      );
      return data;
    },
    enabled: options?.enabled !== false,
  });
};

// Get farmer's connected dealers
export const useGetFarmerDealers = () => {
  return useQuery<ConnectedDealersResponse>({
    queryKey: farmerVerificationKeys.dealers(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ConnectedDealersResponse>(
        "/verification/farmers/dealers"
      );
      return data;
    },
  });
};

// Get full dealer details for farmer (dealer + account + sales + payments in one call)
export const useGetDealerDetailsForFarmer = (dealerId: string, enabled = true) => {
  return useQuery<FarmerDealerDetailsResponse>({
    queryKey: farmerVerificationKeys.dealer(dealerId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<FarmerDealerDetailsResponse>(
        `/verification/farmers/dealers/${dealerId}`
      );
      return data;
    },
    enabled: enabled && !!dealerId,
  });
};

// Get archived dealers
export const useGetArchivedFarmerDealers = () => {
  return useQuery<ConnectedDealersResponse>({
    queryKey: farmerVerificationKeys.archivedDealers(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ConnectedDealersResponse>(
        "/verification/farmers/dealers/archived"
      );
      return data;
    },
  });
};

// ==================== MUTATIONS ====================

// Create verification request
export const useCreateFarmerVerificationRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVerificationRequestInput) => {
      const { data } = await axiosInstance.post<VerificationRequestResponse>(
        "/verification/farmers/verification-requests",
        input
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.requests() });
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.dealers() });
    },
  });
};

// Acknowledge verification request (mark message as seen)
export const useAcknowledgeFarmerVerificationRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post<VerificationRequestResponse>(
        `/verification/farmers/verification-requests/${id}/acknowledge`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.requests() });
    },
  });
};

// Cancel farmer verification request
export const useCancelFarmerVerificationRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data } = await axiosInstance.delete(
        `/verification/farmers/verification-requests/${requestId}`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.requests() });
    },
  });
};

// Archive farmer-dealer connection
export const useArchiveFarmerDealer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data } = await axiosInstance.post(
        `/verification/farmers/dealers/${connectionId}/archive`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.dealers() });
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.archivedDealers() });
    },
  });
};

// Unarchive farmer-dealer connection
export const useUnarchiveFarmerDealer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data } = await axiosInstance.post(
        `/verification/farmers/dealers/${connectionId}/unarchive`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.dealers() });
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.archivedDealers() });
    },
  });
};

export const useAcknowledgeConnectedOpeningBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { connectionId: string; dealerId: string; note?: string }) => {
      const { data } = await axiosInstance.post(
        `/verification/farmers/dealers/${input.connectionId}/opening-balance/ack`,
        { note: input.note }
      );
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.dealers() });
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.dealer(vars.dealerId) });
    },
  });
};

export const useDisputeConnectedOpeningBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { connectionId: string; dealerId: string; note?: string }) => {
      const { data } = await axiosInstance.post(
        `/verification/farmers/dealers/${input.connectionId}/opening-balance/dispute`,
        { note: input.note }
      );
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.dealers() });
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.dealer(vars.dealerId) });
    },
  });
};
