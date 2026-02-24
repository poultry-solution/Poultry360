import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// Query keys
export const manualCompanyKeys = {
    all: ["dealer-manual-companies"] as const,
    lists: () => [...manualCompanyKeys.all, "list"] as const,
    statement: (id: string) =>
        [...manualCompanyKeys.all, "statement", id] as const,
};

// Types
export interface ManualCompany {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    balance: number;
    totalPurchases: number;
    totalPayments: number;
    _count?: { purchases: number; payments: number };
    createdAt: string;
}

export interface PurchaseItem {
    productName: string;
    type: string;
    unit: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
}

export interface RecordPurchaseInput {
    companyId: string;
    items: PurchaseItem[];
    notes?: string;
    reference?: string;
    date?: string;
}

export interface RecordManualPaymentInput {
    companyId: string;
    amount: number;
    paymentMethod?: string;
    paymentDate?: string;
    notes?: string;
    reference?: string;
}

// ==================== QUERIES ====================

export const useGetManualCompanies = () => {
    return useQuery({
        queryKey: manualCompanyKeys.lists(),
        queryFn: async () => {
            const { data } = await axiosInstance.get<{
                success: boolean;
                data: ManualCompany[];
            }>("/dealer/manual-companies");
            return data.data;
        },
    });
};

export const useGetManualCompanyStatement = (id: string) => {
    return useQuery({
        queryKey: manualCompanyKeys.statement(id),
        queryFn: async () => {
            const { data } = await axiosInstance.get(
                `/dealer/manual-companies/${id}/statement`
            );
            return data.data;
        },
        enabled: !!id,
    });
};

// ==================== MUTATIONS ====================

export const useCreateManualCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: {
            name: string;
            phone?: string;
            address?: string;
        }) => {
            const { data } = await axiosInstance.post(
                "/dealer/manual-companies",
                input
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: manualCompanyKeys.lists(),
            });
        },
    });
};

export const useUpdateManualCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            ...input
        }: {
            id: string;
            name?: string;
            phone?: string;
            address?: string;
        }) => {
            const { data } = await axiosInstance.put(
                `/dealer/manual-companies/${id}`,
                input
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: manualCompanyKeys.lists(),
            });
        },
    });
};

export const useDeleteManualCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await axiosInstance.delete(
                `/dealer/manual-companies/${id}`
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: manualCompanyKeys.lists(),
            });
        },
    });
};

export const useRecordManualPurchase = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ companyId, ...input }: RecordPurchaseInput) => {
            const { data } = await axiosInstance.post(
                `/dealer/manual-companies/${companyId}/purchases`,
                input
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: manualCompanyKeys.lists(),
            });
            // Also invalidate inventory data since products were added
            queryClient.invalidateQueries({ queryKey: ["dealer-products"] });
            queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
        },
    });
};

export const useRecordManualCompanyPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ companyId, ...input }: RecordManualPaymentInput) => {
            const { data } = await axiosInstance.post(
                `/dealer/manual-companies/${companyId}/payments`,
                input
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: manualCompanyKeys.lists(),
            });
        },
    });
};

// ==================== PROFIT SUMMARY ====================

export const useGetDealerProfitSummary = () => {
    return useQuery({
        queryKey: ["dealer-profit-summary"] as const,
        queryFn: async () => {
            const { data } = await axiosInstance.get<{
                success: boolean;
                data: { totalPurchases: number; totalSales: number; profit: number };
            }>("/dealer/manual-companies/profit/summary");
            return data.data;
        },
    });
};
