import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const companyRawMaterialKeys = {
  all: ["company-raw-materials"] as const,
  lists: () => [...companyRawMaterialKeys.all, "list"] as const,
  list: () => [...companyRawMaterialKeys.lists()] as const,
  details: () => [...companyRawMaterialKeys.all, "detail"] as const,
  detail: (id: string) => [...companyRawMaterialKeys.details(), id] as const,
};

export interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: string | number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export function useGetCompanyRawMaterials() {
  return useQuery({
    queryKey: companyRawMaterialKeys.list(),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/company/raw-materials");
      return data;
    },
  });
}

export function useCreateRawMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; unit: string }) => {
      const { data } = await axiosInstance.post("/company/raw-materials", body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyRawMaterialKeys.lists() });
    },
  });
}

export function useUpdateRawMaterial(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name?: string; unit?: string }) => {
      const { data } = await axiosInstance.put(`/company/raw-materials/${id}`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyRawMaterialKeys.detail(id) });
      qc.invalidateQueries({ queryKey: companyRawMaterialKeys.lists() });
    },
  });
}

export function useDeleteRawMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/company/raw-materials/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyRawMaterialKeys.lists() });
    },
  });
}
