import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const companyConsignmentKeys = {
  all: ["company-consignments"] as const,
  lists: () => [...companyConsignmentKeys.all, "list"] as const,
  list: (filters: string) =>
    [...companyConsignmentKeys.lists(), { filters }] as const,
  details: () => [...companyConsignmentKeys.all, "detail"] as const,
  detail: (id: string) => [...companyConsignmentKeys.details(), id] as const,
  auditLogs: (id: string) => [...companyConsignmentKeys.all, "audit", id] as const,
};

export interface ConsignmentItem {
  id: string;
  quantity: number;
  acceptedQuantity?: number;
  receivedQuantity?: number;
  unitPrice: number;
  totalAmount: number;
  isAccepted: boolean;
  rejectionReason?: string;
  companyProduct?: {
    id: string;
    name: string;
    type?: string;
    unit?: string;
  };
  dealerProduct?: {
    id: string;
    name: string;
  };
}

export interface Consignment {
  id: string;
  requestNumber: string;
  direction: "COMPANY_TO_DEALER" | "DEALER_TO_COMPANY" | "DEALER_TO_FARMER";
  status: string;
  totalAmount: number;
  subtotalAmount?: number | null;
  discountType?: string | null;
  discountValue?: number | null;
  notes?: string;
  requestedQuantity?: number;
  approvedQuantity?: number;
  dispatchedQuantity?: number;
  receivedQuantity?: number;
  dispatchRef?: string;
  trackingInfo?: string;
  grnRef?: string;
  dispatchedAt?: Date;
  receivedAt?: Date;
  fromCompanyId?: string;
  fromDealerId?: string;
  toDealerId?: string;
  toFarmerId?: string;
  companySaleId?: string;
  items: ConsignmentItem[];
  fromCompany?: {
    id: string;
    name: string;
  };
  fromDealer?: {
    id: string;
    name: string;
  };
  toDealer?: {
    id: string;
    name: string;
    contact: string;
  };
  toFarmer?: {
    id: string;
    name: string;
  };
  companySale?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    account?: {
      id: string;
      balance: number;
    };
  };
  dispatchedBy?: {
    id: string;
    name: string;
    phone: string;
  };
  receivedBy?: {
    id: string;
    name: string;
    phone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsignmentsResponse {
  success: boolean;
  data: Consignment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLog {
  id: string;
  action: string;
  statusFrom?: string;
  statusTo: string;
  actor: {
    id: string;
    name: string;
    phone: string;
  };
  quantityChange?: number;
  documentRef?: string;
  notes?: string;
  createdAt: Date;
}

// Get company consignments
export const useGetCompanyConsignments = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  direction?: string;
  search?: string;
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: companyConsignmentKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ConsignmentsResponse>(
        `/consignments/company?${queryString}`
      );
      return data;
    },
  });
};

// Get single consignment details
export const useGetConsignmentDetails = (id: string) => {
  return useQuery({
    queryKey: companyConsignmentKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/consignments/company/${id}`);
      return data.data as Consignment;
    },
    enabled: !!id,
  });
};

// Get audit logs
export const useGetConsignmentAuditLogs = (id: string) => {
  return useQuery({
    queryKey: companyConsignmentKeys.auditLogs(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/consignments/${id}/audit-logs`);
      return data.data as AuditLog[];
    },
    enabled: !!id,
  });
};

// Create consignment
export const useCreateCompanyConsignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      dealerId: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
      }>;
      notes?: string;
      overrideBalanceLimit?: boolean;
      discount?: { type: "PERCENT" | "FLAT"; value: number };
    }) => {
      const { data } = await axiosInstance.post("/consignments/company", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: companyConsignmentKeys.lists(),
      });
      queryClient.invalidateQueries({ queryKey: ["company-products"] });
    },
  });
};

// Approve consignment (from dealer)
export const useApproveConsignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      items: Array<{
        itemId: string;
        acceptedQuantity: number;
      }>;
      notes?: string;
      discount?: { type: "PERCENT" | "FLAT"; value: number };
    }) => {
      const body: { items: typeof input.items; notes?: string; discount?: { type: "PERCENT" | "FLAT"; value: number } } = {
        items: input.items,
        notes: input.notes,
      };
      if (input.discount && input.discount.value > 0) {
        body.discount = input.discount;
      }
      const { data } = await axiosInstance.post(
        `/consignments/company/${input.id}/approve`,
        body
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: companyConsignmentKeys.lists(),
      });
    },
  });
};

// Dispatch consignment
export const useDispatchConsignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      dispatchRef?: string;
      trackingInfo?: string;
      notes?: string;
    }) => {
      const { data } = await axiosInstance.post(
        `/consignments/company/${input.id}/dispatch`,
        {
          dispatchRef: input.dispatchRef,
          trackingInfo: input.trackingInfo,
          notes: input.notes,
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: companyConsignmentKeys.lists(),
      });
      queryClient.invalidateQueries({ queryKey: ["company-products"] });
    },
  });
};

// Reject consignment
export const useRejectConsignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; reason?: string }) => {
      const { data } = await axiosInstance.post(
        `/consignments/company/${input.id}/reject`,
        { reason: input.reason }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: companyConsignmentKeys.lists(),
      });
    },
  });
};

// Cancel consignment
export const useCancelCompanyConsignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; reason?: string }) => {
      const { data } = await axiosInstance.post(
        `/consignments/company/${input.id}/cancel`,
        { reason: input.reason }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: companyConsignmentKeys.lists(),
      });
    },
  });
};

