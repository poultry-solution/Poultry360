import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// Query keys
export const manualCompanyKeys = {
    all: ["dealer-manual-companies"] as const,
    lists: () => [...manualCompanyKeys.all, "list"] as const,
    list: (archived: boolean) => [...manualCompanyKeys.lists(), { archived }] as const,
    /** Prefix of every statement query for one supplier; refresh this after any change. */
    statementBase: (id: string) => [...manualCompanyKeys.all, "statement", id] as const,
    statement: (id: string, includeVoided?: boolean) =>
        [...manualCompanyKeys.statementBase(id), { includeVoided: !!includeVoided }] as const,
    statementTab: (id: string, params: { type: StatementTab; page: number; limit: number }) =>
        [...manualCompanyKeys.statementBase(id), "tab", params] as const,
};

// Types
export interface ManualCompany {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    balance: number;
    openingBalance?: number;
    totalPurchases: number;
    totalPayments: number;
    totalSettlementSales: number;
    _count?: { purchases: number; payments: number; settlementSales: number };
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
    minStock?: number | null;
    expiryDate?: string | null;
}

export interface RecordPurchaseInput {
    companyId: string;
    items: PurchaseItem[];
    notes?: string;
    reference?: string;
    date?: string;
    tradeDiscountAmount?: number;
    billImageUrl?: string;
}

export interface RecordManualPaymentInput {
    companyId: string;
    amount: number;
    direction?: "RECEIVED" | "MADE";
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
        totalSettlementSales: number;
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

export type StatementTab = "purchases" | "payments" | "settlements" | "adjustments" | "voided";

export interface StatementTabResponse {
    company: {
        id: string;
        name: string;
        phone?: string | null;
        address?: string | null;
        balance: number;
        totalPurchases: number;
        totalPayments: number;
        totalSettlementSales: number;
    };
    openingBalance: { amount: number; date: string | null; notes: string | null };
    type: StatementTab;
    rows: any[];
    counts: Record<StatementTab, number>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** One tab of a supplier's account, paged on the server (10 per page). */
export const useGetManualCompanyStatementTab = (
    id: string,
    { type, page, limit = 10 }: { type: StatementTab; page: number; limit?: number }
) => {
    return useQuery({
        queryKey: manualCompanyKeys.statementTab(id, { type, page, limit }),
        queryFn: async () => {
            const { data } = await axiosInstance.get<{ success: boolean; data: StatementTabResponse }>(
                `/dealer/manual-companies/${id}/statement`,
                { params: { type, page, limit } }
            );
            return data.data;
        },
        enabled: !!id,
        placeholderData: keepPreviousData,
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
            queryClient.invalidateQueries({ queryKey: manualCompanyKeys.statementBase(vars.companyId) });
            queryClient.invalidateQueries({ queryKey: manualCompanyKeys.lists() });
            queryClient.invalidateQueries({ queryKey: ["dealer-products"] });
            queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
            queryClient.invalidateQueries({ queryKey: ["dealer-profit-summary"] });
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
            queryClient.invalidateQueries({ queryKey: manualCompanyKeys.statementBase(vars.companyId) });
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
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({
                queryKey: manualCompanyKeys.lists(),
            });
            queryClient.invalidateQueries({ queryKey: manualCompanyKeys.statementBase(vars.companyId) });
            // Also invalidate inventory data since products were added
            queryClient.invalidateQueries({ queryKey: ["dealer-products"] });
            queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
            queryClient.invalidateQueries({ queryKey: ["dealer-profit-summary"] });
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
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({
                queryKey: manualCompanyKeys.lists(),
            });
            queryClient.invalidateQueries({ queryKey: manualCompanyKeys.statementBase(vars.companyId) });
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
            queryClient.invalidateQueries({ queryKey: manualCompanyKeys.statementBase(vars.companyId) });
        },
    });
};

// ==================== PROFIT SUMMARY ====================

export interface DealerProfitSummary {
    /** Purchases after trade discount, without voided bills. */
    totalPurchases: number;
    totalSales: number;
    normalSales: number;
    /** Cost of the items sold (saved on each sale). */
    costOfGoodsSold: number;
    broilerMargin: number;
    /** normalSales − costOfGoodsSold + broilerMargin */
    profit: number;
    /** Old sale lines with no saved cost (product deleted). */
    itemsMissingCost: number;
}

/** Leave params empty for all time. Dates are AD YYYY-MM-DD, read as Nepal days. */
export const useGetDealerProfitSummary = (
    params?: { startDate?: string; endDate?: string },
    options?: { enabled?: boolean }
) => {
    const startDate = params?.startDate || undefined;
    const endDate = params?.endDate || undefined;
    return useQuery({
        queryKey: ["dealer-profit-summary", { startDate, endDate }] as const,
        queryFn: async () => {
            const { data } = await axiosInstance.get<{ success: boolean; data: DealerProfitSummary }>(
                "/dealer/manual-companies/profit/summary",
                { params: { startDate, endDate } }
            );
            return data.data;
        },
        enabled: options?.enabled ?? true,
    });
};
