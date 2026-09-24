import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const adminFinanceKeys = {
  all: ["admin-finances"] as const,
  overview: () => [...adminFinanceKeys.all, "overview"] as const,
};

export interface AdminFinanceEntry {
  id: string;
  type: "INCOME" | "EXPENSE";
  date: string;
  createdAt: string;
  description: string;
  reference: string | null;
  income: number;
  expense: number;
  balance: number;
}

export interface AdminFinanceOverview {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  entries: AdminFinanceEntry[];
}

interface AdminFinanceOverviewResponse {
  success: boolean;
  data: AdminFinanceOverview;
}

export function useGetAdminFinanceOverview() {
  return useQuery<AdminFinanceOverviewResponse>({
    queryKey: adminFinanceKeys.overview(),
    queryFn: async () => (await axiosInstance.get<AdminFinanceOverviewResponse>("/admin/finances")).data,
    staleTime: 3000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateAdminExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { description: string; amount: number; spentAt: string }) =>
      (await axiosInstance.post("/admin/finances/expenses", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminFinanceKeys.all });
    },
  });
}
