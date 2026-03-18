import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// Query keys
export const manualCompanyKeys = {
    all: ["dealer-manual-companies"] as const,
    lists: () => [...manualCompanyKeys.all, "list"] as const,
    list: (archived: boolean) => [...manualCompanyKeys.lists(), { archived }] as const,
    statement: (id: string, includeVoided?: boolean) =>
        [...manualCompanyKeys.all, "statement", id, { includeVoided: !!includeVoided }] as const,
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
    archivedAt?: string | null;
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

export interface ManualCompanyAdjustmentTxn {
    type: "OPENING_BALANCE" | "ADJUSTMENT";
    id: string;
    date: string;
    amount: number;
    notes?: string | null;
    balanceAfter?: number;
}

export interface ManualCompanyStatementResponse {
    company: {
        id: string;
        name: string;
        phone?: string | null;
        address?: string | null;
        balance: number;
        totalPurchases: number;
        totalPayments: number;
    };
    openingBalance: { amount: number; date: string | null; notes: string | null };
    transactions: Array<any>;
    voidedTransactions?: Array<{
        kind: "PURCHASE" | "PAYMENT";
        id: string;
        date: string;
        amount: number;
        voidedAt: string;
        voidedReason?: string | null;
        itemsCount?: number;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ==================== QUERIES ====================

export const useGetManualCompanies = (params?: { archived?: boolean }) => {
    const archived = params?.archived ?? false;
    return useQuery({
        queryKey: manualCompanyKeys.list(archived),
        queryFn: async () => {
            const { data } = await axiosInstance.get<{
                success: boolean;
                data: ManualCompany[];
            }>("/dealer/manual-companies", { params: { archived } });
            return data.data;
        },
    });
};

export const useGetManualCompanyStatement = (id: string, params?: { includeVoided?: boolean }) => {
    const includeVoided = params?.includeVoided ?? false;
    return useQuery({
        queryKey: manualCompanyKeys.statement(id, includeVoided),
        queryFn: async () => {
            const { data } = await axiosInstance.get(`/dealer/manual-companies/${id}/statement`, {
                params: includeVoided ? { includeVoided: true } : undefined,
            });
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

export const useArchiveManualCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await axiosInstance.post(`/dealer/manual-companies/${id}/archive`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: manualCompanyKeys.lists() });
        },
    });
};

export const useUnarchiveManualCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await axiosInstance.post(`/dealer/manual-companies/${id}/unarchive`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: manualCompanyKeys.lists() });
        },
    });
};

export const useVoidManualPurchase = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { companyId: string; purchaseId: string; reason?: string }) => {
            const { data } = await axiosInstance.delete(
                `/dealer/manual-companies/${input.companyId}/purchases/${input.purchaseId}`,
                { data: { reason: input.reason } }
            );
            return data;
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: manualCompanyKeys.statement(vars.companyId) });
            queryClient.invalidateQueries({ queryKey: manualCompanyKeys.lists() });
            queryClient.invalidateQueries({ queryKey: ["dealer-products"] });
            queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
        },
    });
};

export const useVoidManualPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { companyId: string; paymentId: string; reason?: string }) => {
            const { data } = await axiosInstance.delete(
                `/dealer/manual-companies/${input.companyId}/payments/${input.paymentId}`,
                { data: { reason: input.reason } }
            );
            return data;
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: manualCompanyKeys.statement(vars.companyId) });
            queryClient.invalidateQueries({ queryKey: manualCompanyKeys.lists() });
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

export const useSetManualCompanyOpeningBalance = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ companyId, openingBalance, notes, date }: { companyId: string; openingBalance: number; notes?: string; date?: string }) => {
            const { data } = await axiosInstance.post(
                `/dealer/manual-companies/${companyId}/opening-balance`,
                { openingBalance, notes, date }
            );
            return data;
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: manualCompanyKeys.lists() });
            queryClient.invalidateQueries({ queryKey: manualCompanyKeys.statement(vars.companyId) });
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
