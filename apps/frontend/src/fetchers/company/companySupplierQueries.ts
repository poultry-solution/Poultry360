import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const companySupplierKeys = {
  all: ["company-suppliers"] as const,
  lists: () => [...companySupplierKeys.all, "list"] as const,
  list: () => [...companySupplierKeys.lists()] as const,
  details: () => [...companySupplierKeys.all, "detail"] as const,
  detail: (id: string) => [...companySupplierKeys.details(), id] as const,
  ledger: (id: string) => [...companySupplierKeys.detail(id), "ledger"] as const,
};

export interface Supplier {
  id: string;
  name: string;
  contact?: string | null;
  address?: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierLedger {
  supplier: Supplier;
  balance: number;
  purchased: number;
  paid: number;
  purchases: CompanyPurchaseWithItems[];
  payments: CompanySupplierPayment[];
}

export interface CompanyPurchaseWithItems {
  id: string;
  date: string;
  referenceNumber?: string | null;
  notes?: string | null;
  totalAmount: string | number;
  supplier: { id: string; name: string };
  items: Array<{
    id: string;
    quantity: string | number;
    unitPrice: string | number;
    totalAmount: string | number;
    rawMaterial: { id: string; name: string; unit: string };
  }>;
}

export interface CompanySupplierPayment {
  id: string;
  amount: string | number;
  paymentMethod: string;
  paymentDate: string;
  notes?: string | null;
  reference?: string | null;
  createdAt: string;
}

export function useGetCompanySuppliers() {
  return useQuery({
    queryKey: companySupplierKeys.list(),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/company/suppliers");
      return data;
    },
  });
}

export function useGetSupplierLedger(supplierId: string) {
  return useQuery({
    queryKey: companySupplierKeys.ledger(supplierId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/company/suppliers/${supplierId}/ledger`);
      return data;
    },
    enabled: !!supplierId,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; contact?: string; address?: string }) => {
      const { data } = await axiosInstance.post("/company/suppliers", body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companySupplierKeys.lists() });
    },
  });
}

export function useUpdateSupplier(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name?: string; contact?: string; address?: string }) => {
      const { data } = await axiosInstance.put(`/company/suppliers/${id}`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companySupplierKeys.detail(id) });
      qc.invalidateQueries({ queryKey: companySupplierKeys.lists() });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/company/suppliers/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companySupplierKeys.lists() });
    },
  });
}

export function useRecordSupplierPayment(supplierId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      amount: number;
      paymentMethod?: string;
      paymentDate?: string;
      notes?: string;
      reference?: string;
    }) => {
      const { data } = await axiosInstance.post(`/company/suppliers/${supplierId}/payments`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companySupplierKeys.ledger(supplierId) });
      qc.invalidateQueries({ queryKey: companySupplierKeys.lists() });
    },
  });
}
