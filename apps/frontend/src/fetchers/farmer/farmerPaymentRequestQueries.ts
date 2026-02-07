import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== QUERY KEYS ====================

export const farmerPaymentRequestKeys = {
  all: ["farmer-payment-requests"] as const,
  lists: () => [...farmerPaymentRequestKeys.all, "list"] as const,
  list: (filters: string) => [...farmerPaymentRequestKeys.lists(), { filters }] as const,
  statistics: () => [...farmerPaymentRequestKeys.all, "statistics"] as const,
};

// ==================== TYPES ====================

export interface FarmerPaymentRequest {
  id: string;
  requestNumber: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  description?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: Date;
  isLedgerLevel: boolean;
  dealerSaleId?: string;
  dealerId: string;
  farmerId: string;
  customerId: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  dealer?: {
    id: string;
    name: string;
    contact: string;
    address?: string;
  };
  dealerSale?: {
    id: string;
    invoiceNumber?: string;
    totalAmount: number;
    paidAmount?: number;
    dueAmount?: number;
    date: Date;
  };
}

export interface FarmerPaymentRequestsResponse {
  success: boolean;
  data: FarmerPaymentRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FarmerPaymentRequestStatsResponse {
  success: boolean;
  data: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
    pendingAmount: number;
  };
}

// ==================== QUERIES ====================

// Get farmer's payment requests
export const useGetFarmerPaymentRequests = (
  params?: {
    status?: string;
    page?: number;
    limit?: number;
  },
  options?: { enabled?: boolean }
) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: farmerPaymentRequestKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<FarmerPaymentRequestsResponse>(
        `/farmer/payment-requests?${queryString}`
      );
      return data;
    },
    enabled: options?.enabled !== false,
  });
};

// Get payment request statistics
export const useGetFarmerPaymentRequestStats = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: farmerPaymentRequestKeys.statistics(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<FarmerPaymentRequestStatsResponse>(
        "/farmer/payment-requests/statistics"
      );
      return data;
    },
    enabled: options?.enabled !== false,
  });
};

// Get single payment request by ID
export const useGetFarmerPaymentRequestById = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...farmerPaymentRequestKeys.all, "detail", id],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/farmer/payment-requests/${id}`);
      return data;
    },
    enabled: enabled && !!id,
  });
};

// ==================== MUTATIONS ====================

// Create ledger-level or bill-wise payment request
export const useCreateFarmerPaymentRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      dealerId?: string;      // For ledger-level
      dealerSaleId?: string;  // For bill-wise
      amount: number;
      paymentMethod?: string;
      paymentReference?: string;
      paymentDate?: string;
      description?: string;
      receiptImageUrl?: string;
    }) => {
      const { data } = await axiosInstance.post(
        "/farmer/payment-requests",
        input
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: farmerPaymentRequestKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: farmerPaymentRequestKeys.statistics(),
      });
      queryClient.invalidateQueries({ queryKey: ["paymentRequests", "farmer"] });
      queryClient.invalidateQueries({ queryKey: ["account", "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["farmer-verification"] });
    },
  });
};
