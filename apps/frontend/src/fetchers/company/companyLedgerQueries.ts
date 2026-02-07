import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const companyLedgerKeys = {
  all: ["company-ledger"] as const,
  entries: () => [...companyLedgerKeys.all, "entries"] as const,
  entriesList: (filters: string) =>
    [...companyLedgerKeys.entries(), { filters }] as const,
  parties: () => [...companyLedgerKeys.all, "parties"] as const,
  partiesList: (search?: string) =>
    [...companyLedgerKeys.parties(), { search }] as const,
  summary: () => [...companyLedgerKeys.all, "summary"] as const,
};

export interface CompanyLedgerEntry {
  id: string;
  type: string;
  amount: number;
  runningBalance: number;
  date: Date;
  description?: string;
  companySaleId?: string;
  partyId?: string;
  partyType?: string;
  companySale?: {
    id: string;
    invoiceNumber?: string;
    dealer?: {
      id: string;
      name: string;
      contact: string;
    };
  };
}

export interface CompanyLedgerParty {
  id: string;
  name: string;
  contact: string;
  address?: string;
  balance: number;
  lastTransactionDate?: Date;
  totalSales: number;
}

export interface CompanyLedgerSummary {
  totalSales: number;
  totalRevenue: number;
  totalDue: number;
  totalReceived: number;
  pendingRequests: number;
  activeConsignments: number;
}

export interface CompanyLedgerEntriesResponse {
  success: boolean;
  data: CompanyLedgerEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CompanyLedgerPartiesResponse {
  success: boolean;
  data: CompanyLedgerParty[];
}

export interface CompanyLedgerSummaryResponse {
  success: boolean;
  data: CompanyLedgerSummary;
}

// Get ledger entries
export const useGetCompanyLedgerEntries = (params?: {
  page?: number;
  limit?: number;
  type?: string;
  partyId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: companyLedgerKeys.entriesList(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<CompanyLedgerEntriesResponse>(
        `/company/ledger?${queryString}`
      );
      return data;
    },
  });
};

// Get ledger parties
export const useGetCompanyLedgerParties = (search?: string) => {
  return useQuery({
    queryKey: companyLedgerKeys.partiesList(search),
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const { data } = await axiosInstance.get<CompanyLedgerPartiesResponse>(
        `/company/ledger/parties${params}`
      );
      return data;
    },
  });
};

// Get ledger summary
export const useGetCompanyLedgerSummary = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: [...companyLedgerKeys.summary(), queryString],
    queryFn: async () => {
      const { data } = await axiosInstance.get<CompanyLedgerSummaryResponse>(
        `/company/ledger/summary?${queryString}`
      );
      return data;
    },
  });
};

// Add payment
export const useAddCompanyPaym = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      dealerId: string;
      saleId?: string;
      amount: number;
      paymentMethod?: string;
      date?: string;
      notes?: string;
    }) => {
      const { data } = await axiosInstance.post(
        "/company/ledger/payments",
        input
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyLedgerKeys.all });
      queryClient.invalidateQueries({ queryKey: ["company-sales"] });
    },
  });
};

