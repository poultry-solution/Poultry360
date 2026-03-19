import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const companyPurchaseKeys = {
  all: ["company-purchases"] as const,
  lists: () => [...companyPurchaseKeys.all, "list"] as const,
  list: (filters: string) => [...companyPurchaseKeys.lists(), { filters }] as const,
  aggregated: () => [...companyPurchaseKeys.all, "aggregated"] as const,
  details: () => [...companyPurchaseKeys.all, "detail"] as const,
  detail: (id: string) => [...companyPurchaseKeys.details(), id] as const,
};

export interface AggregatedPurchaseRow {
  rawMaterialId: string;
  rawMaterial: { id: string; name: string; unit: string };
  supplierId: string;
  supplier: { id: string; name: string };
  unitPrice: number;
  totalQuantity: number;
  totalAmount: number;
  totalUsed?: number;
  remainingQuantity: number;
  remainingAmount: number;
}

export interface CompanyPurchaseItem {
  id: string;
  rawMaterialId: string;
  quantity: string | number;
  unitPrice: string | number;
  totalAmount: string | number;
  rawMaterial?: { id: string; name: string; unit: string };
}

export interface CompanyPurchase {
  id: string;
  date: string;
  referenceNumber?: string | null;
  notes?: string | null;
  totalAmount: string | number;
  companyId: string;
  supplierId: string;
  supplier?: { id: string; name: string };
  items: CompanyPurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyPurchaseInput {
  supplierId: string;
  date?: string;
  referenceNumber?: string;
  notes?: string;
  items: Array<{
    rawMaterialId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export function useGetCompanyPurchases(params?: { page?: number; limit?: number; supplierId?: string }) {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: companyPurchaseKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/company/purchases?${queryString}`);
      return data;
    },
  });
}

export function useGetCompanyPurchasesAggregated() {
  return useQuery({
    queryKey: companyPurchaseKeys.aggregated(),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/company/purchases/aggregated");
      return data;
    },
  });
}

export function useGetCompanyPurchaseById(id: string) {
  return useQuery({
    queryKey: companyPurchaseKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/company/purchases/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCompanyPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCompanyPurchaseInput) => {
      const { data } = await axiosInstance.post("/company/purchases", input);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: companyPurchaseKeys.lists() });
      qc.invalidateQueries({ queryKey: companyPurchaseKeys.aggregated() });
      qc.invalidateQueries({ queryKey: ["company-suppliers"] });
      if (variables.supplierId) {
        qc.invalidateQueries({
          queryKey: ["company-suppliers", "detail", variables.supplierId, "ledger"],
        });
      }
      qc.invalidateQueries({ queryKey: ["company-raw-materials"] });
    },
  });
}
