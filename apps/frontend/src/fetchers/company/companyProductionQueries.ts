import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { companyProductKeys } from "./companyProductQueries";

export const companyProductionKeys = {
  all: ["company-production"] as const,
  lists: () => [...companyProductionKeys.all, "list"] as const,
  list: (params: string) => [...companyProductionKeys.lists(), { params }] as const,
  details: () => [...companyProductionKeys.all, "detail"] as const,
  detail: (id: string) => [...companyProductionKeys.details(), id] as const,
};

export interface ProductionInputRow {
  id: string;
  quantity: string | number;
  unitPrice: string | number;
  rawMaterialId: string;
  rawMaterial: { id: string; name: string; unit: string };
  supplier?: { id: string; name: string };
}

export interface ProductionOutputRow {
  id: string;
  productName: string;
  quantity: string | number;
  unit: string | null;
  productId?: string | null;
  product?: { id: string; name: string; unit: string; unitSellingPrice?: string | number } | null;
}

export interface ProductionRun {
  id: string;
  date: string;
  referenceNumber?: string | null;
  notes?: string | null;
  companyId: string;
  createdById?: string | null;
  inputs: ProductionInputRow[];
  outputs: ProductionOutputRow[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductionRunInput {
  date?: string;
  referenceNumber?: string;
  notes?: string;
  inputs: Array<{ rawMaterialId: string; supplierId: string; unitPrice: number; quantity: number }>;
  outputs: Array<
    | { productId: string; quantity: number }
    | { productName: string; quantity: number; unit?: string }
  >;
}

export function useGetProductionRuns(params?: { page?: number; limit?: number }) {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: companyProductionKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/company/production?${queryString}`);
      return data;
    },
  });
}

export function useGetProductionRunById(id: string) {
  return useQuery({
    queryKey: companyProductionKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/company/production/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProductionRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProductionRunInput) => {
      const { data } = await axiosInstance.post("/company/production", input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyProductionKeys.lists() });
      qc.invalidateQueries({ queryKey: ["company-raw-materials"] });
      qc.invalidateQueries({ queryKey: ["company-purchases", "aggregated"] });
      qc.invalidateQueries({ queryKey: companyProductKeys.all });
    },
  });
}
