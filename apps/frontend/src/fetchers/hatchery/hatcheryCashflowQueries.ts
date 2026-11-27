import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const hatcheryCashflowKeys = {
  all: ["hatchery-cashflow"] as const,
  accounts: (includeArchived: boolean = false) =>
    [...hatcheryCashflowKeys.all, "accounts", { includeArchived }] as const,
  accountOptions: () => [...hatcheryCashflowKeys.all, "account-options"] as const,
  movements: (filters: {
    from?: string;
    to?: string;
    accountId?: string;
  }) => [...hatcheryCashflowKeys.all, "movements", filters] as const,
  report: (range: { from: string; to: string }) =>
    [...hatcheryCashflowKeys.all, "report", range] as const,
};

export type AccountType = "CASH" | "BANK";

export interface CashAccount {
  id: string;
  userId: string;
  type: AccountType;
  name: string;
  openingBalance: number;
  openingBsDate: string;
  archivedAt: string | null;
  balance: number;
  /** True once any movement references the account. Locks opening-balance edit UI for BANK rows only — CASH can be re-set any time. */
  hasMovements: boolean;
  /** ISO timestamp of the first time the hatchery confirmed their opening balance; null until they do. Drives the first-run banner for CASH. */
  openingBalanceSetAt: string | null;
}

export type CashCategory =
  | "CASH_IN"
  | "CASH_OUT"
  | "SALE_RECEIPT"
  | "EXPENSE"
  | "PAYMENT_TO_DEALER"
  | "OWNER_INVEST"
  | "OWNER_DRAW"
  | "LOAN_RECEIVED"
  | "LOAN_REPAYMENT"
  | "TRANSFER"
  | "OPENING_ADJUSTMENT";

export type CashSourceType =
  | "MANUAL"
  | "SALE_PAYMENT"
  | "CUSTOMER_RECEIPT"
  | "EXPENSE"
  | "SUPPLIER_PAYMENT"
  | "STAFF_PAYMENT"
  | "TRANSFER"
  | "OPENING_ADJUSTMENT"
  | "DEALER_SALE_PAYMENT"
  | "DEALER_LEDGER_RECEIPT"
  | "DEALER_LEDGER_PAYMENT"
  | "DEALER_SUPPLIER_PAYMENT"
  | "BROILER_SETTLEMENT_PROCEEDS"
  | "BROILER_SETTLEMENT_PAYOUT"
  | "DEALER_BROILER_PURCHASE"
  | "COMPANY_DEALER_PAYMENT"
  | "COMPANY_SUPPLIER_PAYMENT"
  | "HATCHERY_PARTY_PAYMENT"
  | "HATCHERY_SUPPLIER_PAYMENT"
  | "HATCHERY_BATCH_EXPENSE";

export interface CashMovement {
  id: string;
  userId: string;
  accountId: string;
  bsDate: string;
  direction: "IN" | "OUT";
  amount: number;
  category: CashCategory;
  sourceType: CashSourceType;
  sourceId: string | null;
  transferId: string | null;
  partyName: string;
  notes: string | null;
  createdAt: string;
  countedInBalance?: boolean;
}

export interface CashflowReport {
  range: { fromBsDate: string; toBsDate: string };
  totals: {
    openingBalance: number;
    closingBalance: number;
    inflow: number;
    outflow: number;
    netChange: number;
  };
  byCategory: {
    inflow: Record<CashCategory, number>;
    outflow: Record<CashCategory, number>;
  };
  transfers: { in: number; out: number };
  balances: CashAccount[];
}

// ─── Reads ────────────────────────────────────────────────────────────────────

/** Just what the Cash / Bank picker needs. Unlike CashAccount it has no balances. */
export type CashAccountOption = Pick<CashAccount, "id" | "name" | "type" | "archivedAt">;

/**
 * Names-only account list for payment forms. Any staff member who can record
 * payments can load it, even without the Cash & Bank permission.
 */
export function useGetCashflowAccountOptions() {
  return useQuery<CashAccountOption[]>({
    queryKey: hatcheryCashflowKeys.accountOptions(),
    queryFn: async () => {
      const res = await axiosInstance.get("/hatchery/cashflow/account-options");
      return res.data.data.accounts as CashAccountOption[];
    },
    staleTime: 15_000,
  });
}

export function useGetCashflowAccounts(includeArchived: boolean = false) {
  return useQuery<CashAccount[]>({
    queryKey: hatcheryCashflowKeys.accounts(includeArchived),
    queryFn: async () => {
      const res = await axiosInstance.get("/hatchery/cashflow/accounts", {
        params: includeArchived ? { includeArchived: "true" } : undefined,
      });
      return res.data.data.accounts as CashAccount[];
    },
    staleTime: 15_000,
  });
}

export function useGetCashflowMovements(filters: {
  from?: string;
  to?: string;
  accountId?: string;
  enabled?: boolean;
}) {
  const { enabled = true, ...q } = filters;
  return useQuery<CashMovement[]>({
    queryKey: hatcheryCashflowKeys.movements(q),
    queryFn: async () => {
      const res = await axiosInstance.get("/hatchery/cashflow/movements", {
        params: {
          ...(q.from ? { from: q.from } : {}),
          ...(q.to ? { to: q.to } : {}),
          ...(q.accountId ? { accountId: q.accountId } : {}),
        },
      });
      return res.data.data.movements as CashMovement[];
    },
    enabled,
    staleTime: 10_000,
  });
}

export function useGetCashflowReport(range: { from: string; to: string }) {
  return useQuery<CashflowReport>({
    queryKey: hatcheryCashflowKeys.report(range),
    queryFn: async () => {
      const res = await axiosInstance.get("/hatchery/cashflow/report", {
        params: { from: range.from, to: range.to },
      });
      return res.data.data as CashflowReport;
    },
    enabled: Boolean(range.from && range.to),
    staleTime: 15_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: hatcheryCashflowKeys.all });
}

export interface CreateBankAccountInput {
  name: string;
  openingBalance: number;
  openingBsDate: string;
}

export function useCreateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBankAccountInput) => {
      const res = await axiosInstance.post("/hatchery/cashflow/accounts", input);
      return res.data.data as CashAccount;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export type PatchAccountPayload =
  | { name: string }
  | { openingBalance: number }
  | { archived: boolean };

export function usePatchAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; payload: PatchAccountPayload }) => {
      const res = await axiosInstance.patch(
        `/hatchery/cashflow/accounts/${encodeURIComponent(vars.id)}`,
        vars.payload,
      );
      return res.data.data as CashAccount;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      await axiosInstance.delete(
        `/hatchery/cashflow/accounts/${encodeURIComponent(id)}`,
        { data: { password } },
      );
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export interface PostManualMovementInput {
  accountId: string;
  category: CashCategory;
  amount: number;
  bsDate: string;
  partyName: string;
  notes?: string;
}

export function usePostManualMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PostManualMovementInput) => {
      const res = await axiosInstance.post(
        "/hatchery/cashflow/movements",
        input,
      );
      return res.data.data as CashMovement;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export interface PostTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  bsDate: string;
  note?: string;
}

export function usePostTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PostTransferInput) => {
      const res = await axiosInstance.post(
        "/hatchery/cashflow/transfers",
        input,
      );
      return res.data.data as {
        transferId: string;
        legs: CashMovement[];
      };
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteCashflowMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      await axiosInstance.delete(
        `/hatchery/cashflow/movements/${encodeURIComponent(id)}`,
        { data: { password } },
      );
    },
    onSuccess: () => invalidateAll(qc),
  });
}
