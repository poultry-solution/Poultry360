import { useQuery, useMutation, useQueryClient } from "@tantml:react-query";
import axiosInstance from "@/common/lib/axios";

// Query keys
export const consignmentKeys = {
  all: ["consignments"] as const,
  lists: () => [...consignmentKeys.all, "list"] as const,
  list: (filters: string) => [...consignmentKeys.lists(), { filters }] as const,
  details: () => [...consignmentKeys.all, "detail"] as const,
  detail: (id: string) => [...consignmentKeys.details(), id] as const,
};

// Types
export interface ConsignmentRequest {
  id: string;
  requestNumber: string;
  direction: string;
  status: string;
  totalAmount: number;
  notes?: string;
  fromCompanyId?: string;
  fromDealerId?: string;
  toDealerId?: string;
  toFarmerId?: string;
  items: ConsignmentItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsignmentItem {
  id: string;
  quantity: number;
  acceptedQuantity?: number;
  unitPrice: number;
  totalAmount: number;
  isAccepted: boolean;
  rejectionReason?: string;
  companyProductId?: string;
  dealerProductId?: string;
  companyProduct?: any;
  dealerProduct?: any;
}

export interface CreateConsignmentRequestInput {
  items: Array<{
    companyProductId: string;
    quantity: number;
    unitPrice: number;
  }>;
  notes?: string;
}

export interface ProposeConsignmentInput {
  dealerId: string;
  items: Array<{
    companyProductId: string;
    quantity: number;
    unitPrice: number;
  }>;
  notes?: string;
}

export interface AcceptConsignmentInput {
  items: Array<{
    itemId: string;
    acceptedQuantity: number;
    isAccepted: boolean;
    rejectionReason?: string;
  }>;
}

// Get consignments
export const useGetConsignments = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  direction?: string;
  type?: "incoming" | "outgoing";
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: consignmentKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/consignments/dealer?${queryString}`);
      return data;
    },
  });
};

// Get consignment by ID
export const useGetConsignmentById = (id: string) => {
  return useQuery({
    queryKey: consignmentKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/consignments/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

// Create consignment request (Dealer to Company)
export const useCreateConsignmentRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateConsignmentRequestInput) => {
      const { data } = await axiosInstance.post("/consignments/dealer/request", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consignmentKeys.lists() });
    },
  });
};

// Propose consignment (Company to Dealer)
export const useProposeConsignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProposeConsignmentInput) => {
      const { data } = await axiosInstance.post("/consignments/company/propose", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consignmentKeys.lists() });
    },
  });
};

// Accept consignment
export const useAcceptConsignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: AcceptConsignmentInput & { id: string }) => {
      const { data } = await axiosInstance.put(
        `/consignments/dealer/${id}/accept`,
        input
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: consignmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: consignmentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["dealer-products"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] });
    },
  });
};

// Reject consignment
export const useRejectConsignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await axiosInstance.put(
        `/consignments/dealer/${id}/reject`,
        { reason }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: consignmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: consignmentKeys.detail(variables.id) });
    },
  });
};

// Approve consignment request (Company)
export const useApproveConsignmentRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.put(`/consignments/company/${id}/approve`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: consignmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: consignmentKeys.detail(id) });
    },
  });
};

// Dispatch consignment (Company)
export const useDispatchConsignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.put(`/consignments/company/${id}/dispatch`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: consignmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: consignmentKeys.detail(id) });
    },
  });
};

