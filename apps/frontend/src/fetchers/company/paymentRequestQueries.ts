import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const companyPaymentRequestKeys = {
  all: ["company-payment-requests"] as const,
  lists: () => [...companyPaymentRequestKeys.all, "list"] as const,
  list: (filters: string) =>
    [...companyPaymentRequestKeys.lists(), { filters }] as const,
  details: () => [...companyPaymentRequestKeys.all, "detail"] as const,
  detail: (id: string) => [...companyPaymentRequestKeys.details(), id] as const,
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

// Get company payment requests
export const useGetCompanyPaymentRequests = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  direction?: string;
  dealerId?: string;
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: companyPaymentRequestKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<PaymentRequestsResponse>(
        `/payment-requests/company?${queryString}`
      );
      return data;
    },
  });
};

// Create company payment request
export const useCreateCompanyPaymentRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      dealerId: string;
      amount: number;
      companySaleId?: string;
      description?: string;
    }) => {
      const { data } = await axiosInstance.post(
        "/payment-requests/company",
        input
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: companyPaymentRequestKeys.lists(),
      });
    },
  });
};

// Verify payment request
export const useVerifyCompanyPaymentRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      isApproved: boolean;
      reviewNotes?: string;
    }) => {
      const { data } = await axiosInstance.post(
        `/payment-requests/company/${input.id}/verify`,
        {
          isApproved: input.isApproved,
          reviewNotes: input.reviewNotes,
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: companyPaymentRequestKeys.lists(),
      });
      queryClient.invalidateQueries({ queryKey: ["company-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["company-sales"] });
    },
  });
};

// Cancel payment request
export const useCancelCompanyPaymentRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post(
        `/payment-requests/company/${id}/cancel`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: companyPaymentRequestKeys.lists(),
      });
    },
  });
};

// Accept payment request (company accepts dealer's request)
export const useAcceptCompanyPaymentRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post(
        `/payment-requests/company/${id}/accept`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: companyPaymentRequestKeys.lists(),
      });
    },
  });
};

