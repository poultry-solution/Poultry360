import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import type { Consignment, ConsignmentsResponse, AuditLog } from "../company/consignmentQueries";

export type { Consignment, ConsignmentsResponse, AuditLog };

export const dealerConsignmentKeys = {
  all: ["dealer-consignments"] as const,
  lists: () => [...dealerConsignmentKeys.all, "list"] as const,
  list: (filters: string) =>
    [...dealerConsignmentKeys.lists(), { filters }] as const,
  details: () => [...dealerConsignmentKeys.all, "detail"] as const,
  detail: (id: string) => [...dealerConsignmentKeys.details(), id] as const,
  auditLogs: (id: string) => [...dealerConsignmentKeys.all, "audit", id] as const,
};

// Get dealer consignments
export const useGetDealerConsignments = (params?: {
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
    queryKey: dealerConsignmentKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ConsignmentsResponse>(
        `/consignments/dealer?${queryString}`
      );
      return data;
    },
  });
};

// Get single consignment details
export const useGetDealerConsignmentDetails = (id: string) => {
  return useQuery({
    queryKey: dealerConsignmentKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/consignments/dealer/${id}`);
      return data.data as Consignment;
    },
    enabled: !!id,
  });
};

// Get audit logs
export const useGetDealerConsignmentAuditLogs = (id: string) => {
  return useQuery({
    queryKey: dealerConsignmentKeys.auditLogs(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/consignments/${id}/audit-logs`);
      return data.data as AuditLog[];
    },
    enabled: !!id,
  });
};

// Request consignment from company
export const useRequestConsignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      companyId: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
      }>;
      notes?: string;
    }) => {
      const { data } = await axiosInstance.post("/consignments/dealer", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dealerConsignmentKeys.lists(),
      });
    },
  });
};

// Accept consignment from company
export const useAcceptConsignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      items: Array<{
        itemId: string;
        acceptedQuantity: number;
      }>;
      notes?: string;
    }) => {
      const { data } = await axiosInstance.post(
        `/consignments/dealer/${input.id}/accept`,
        { items: input.items, notes: input.notes }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dealerConsignmentKeys.lists(),
      });
    },
  });
};

// Confirm receipt (CRITICAL - triggers S3)
export const useConfirmReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      grnRef?: string;
      notes?: string;
    }) => {
      const { data } = await axiosInstance.post(
        `/consignments/dealer/${input.id}/confirm-receipt`,
        { grnRef: input.grnRef, notes: input.notes }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dealerConsignmentKeys.lists(),
      });
      queryClient.invalidateQueries({ queryKey: ["dealer-products"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-sales"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["company-products"] });
    },
  });
};

// Reject consignment
export const useRejectDealerConsignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; reason?: string }) => {
      const { data } = await axiosInstance.post(
        `/consignments/dealer/${input.id}/reject`,
        { reason: input.reason }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dealerConsignmentKeys.lists(),
      });
    },
  });
};

// Cancel consignment
export const useCancelDealerConsignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; reason?: string }) => {
      const { data } = await axiosInstance.post(
        `/consignments/dealer/${input.id}/cancel`,
        { reason: input.reason }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dealerConsignmentKeys.lists(),
      });
    },
  });
};
