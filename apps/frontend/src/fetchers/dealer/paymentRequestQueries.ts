import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const dealerPaymentRequestKeys = {
  all: ["dealer-payment-requests"] as const,
  lists: () => [...dealerPaymentRequestKeys.all, "list"] as const,
  list: (filters: string) =>
    [...dealerPaymentRequestKeys.lists(), { filters }] as const,
  details: () => [...dealerPaymentRequestKeys.all, "detail"] as const,
  detail: (id: string) => [...dealerPaymentRequestKeys.details(), id] as const,
};

export interface PaymentRequest {
  id: string;
  requestNumber: string;
  amount: number;
  direction: "COMPANY_TO_DEALER" | "DEALER_TO_COMPANY";
  status:
    | "PENDING"
    | "ACCEPTED"
    | "PAYMENT_SUBMITTED"
    | "VERIFIED"
    | "REJECTED"
    | "CANCELLED";
  description?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentReceiptUrl?: string;
  paymentDate?: Date;
  companySaleId?: string;
  companyId: string;
  dealerId: string;
  requestedById: string;
  acceptedById?: string;
  submittedById?: string;
  reviewedById?: string;
  acceptedAt?: Date;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewNotes?: string;
  company?: {
    id: string;
    name: string;
  };
  dealer?: {
    id: string;
    name: string;
    contact: string;
  };
  companySale?: {
    id: string;
    invoiceNumber?: string;
    totalAmount: number;
    dueAmount?: number;
  };
  requestedBy?: {
    id: string;
    name: string;
    phone: string;
  };
  acceptedBy?: {
    id: string;
    name: string;
    phone: string;
  };
  submittedBy?: {
    id: string;
    name: string;
    phone: string;
  };
  reviewedBy?: {
    id: string;
    name: string;
    phone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRequestsResponse {
  success: boolean;
  data: PaymentRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Get dealer payment requests
export const useGetDealerPaymentRequests = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  direction?: string;
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: dealerPaymentRequestKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<PaymentRequestsResponse>(
        `/payment-requests/dealer?${queryString}`
      );
      return data;
    },
  });
};

// Accept payment request
export const useAcceptDealerPaymentRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post(
        `/payment-requests/dealer/${id}/accept`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dealerPaymentRequestKeys.lists(),
      });
    },
  });
};

// Submit payment proof
export const useSubmitDealerPaymentProof = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      paymentMethod: string;
      paymentReference?: string;
      paymentReceiptUrl?: string;
      paymentDate?: string;
    }) => {
      const { data } = await axiosInstance.post(
        `/payment-requests/dealer/${input.id}/submit-proof`,
        {
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference,
          paymentReceiptUrl: input.paymentReceiptUrl,
          paymentDate: input.paymentDate,
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dealerPaymentRequestKeys.lists(),
      });
    },
  });
};

// Create dealer payment request
export const useCreateDealerPaymentRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      companyId: string;
      amount: number;
      companySaleId?: string;
      description?: string;
      paymentMethod: string;
      paymentReference?: string;
      paymentReceiptUrl?: string;
      paymentDate?: string;
    }) => {
      const { data } = await axiosInstance.post(
        "/payment-requests/dealer",
        input
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dealerPaymentRequestKeys.lists(),
      });
      queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-sales"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-company-account"] });
    },
  });
};

// Cancel payment request
export const useCancelDealerPaymentRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post(
        `/payment-requests/dealer/${id}/cancel`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dealerPaymentRequestKeys.lists(),
      });
    },
  });
};

