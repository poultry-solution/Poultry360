import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance, { publicApi } from "@/common/lib/axios";

// ==================== TYPES ====================

export type ShareLinkDays = 1 | 7 | 30;

export interface BatchShareLink {
  id: string;
  token: string;
  expiresAt: string;
  revokedAt: string | null;
  showLocation: boolean;
  showNotes: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
}

export interface CreateShareLinkBody {
  expiresInDays: ShareLinkDays;
  showLocation: boolean;
  showNotes: boolean;
}

/** Dates are Nepal calendar days in AD ("YYYY-MM-DD"). No money anywhere. */
export interface BatchShareReport {
  generatedAt: string;
  expiresAt: string;
  batch: {
    name: string;
    type: "BROILER" | "LAYERS";
    status: "ACTIVE" | "COMPLETED";
    startDate: string;
    endDate: string | null;
    day: number;
    farmName: string;
    location: string | null;
  };
  birds: { started: number; died: number; sold: number; leftAtClose: number; alive: number };
  deaths: {
    total: number;
    percent: number;
    daily: Array<{ date: string; day: number; count: number }>;
    reasons: Array<{ reason: string | null; count: number }>;
    recent: Array<{ date: string; day: number; count: number; reason: string | null }>;
  };
  weight: {
    latest: { date: string; day: number; avgWeightKg: number; sampleCount: number } | null;
    points: Array<{ date: string; day: number; avgWeightKg: number; sampleCount: number }>;
  };
  feed: {
    totalKg: number;
    perBirdKg: number | null;
    recent: Array<{ date: string; day: number; kg: number }>;
    types: Array<{ name: string; kg: number }>;
  };
  fcr: {
    value: number | null;
    status: "FRESH" | "STALE" | "WEIGHT_REQUIRED" | "FINAL" | "NOT_CALCULABLE";
    weightDate: string | null;
  } | null;
  medicines: Array<{
    date: string;
    day: number;
    items: Array<{ name: string; quantity: number | null; unit: string | null }>;
  }>;
  eggs: {
    totalEggs: number;
    latest: { date: string; day: number; eggs: number | null; layingPercent: number | null } | null;
    daily: Array<{ date: string; day: number; eggs: number | null; layingPercent: number | null }>;
  } | null;
  notes: Array<{ date: string; description: string }> | null;
}

// ==================== KEYS ====================

export const batchShareKeys = {
  links: (batchId: string) => ["batch-share-links", batchId] as const,
  report: (token: string) => ["batch-share-report", token] as const,
};

/** Full public address of a share link. */
export const shareLinkUrl = (token: string) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/share/batch/${token}`;

// ==================== OWNER SIDE ====================

export const useGetBatchShareLinks = (batchId: string, enabled = true) =>
  useQuery({
    queryKey: batchShareKeys.links(batchId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/batches/${batchId}/share-links`);
      return data.data as BatchShareLink[];
    },
    enabled: enabled && !!batchId,
  });

export const useCreateBatchShareLink = (batchId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateShareLinkBody) => {
      const { data } = await axiosInstance.post(`/batches/${batchId}/share-links`, body);
      return data.data as BatchShareLink;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: batchShareKeys.links(batchId) }),
  });
};

export const useRevokeBatchShareLink = (batchId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (linkId: string) => {
      await axiosInstance.delete(`/batches/${batchId}/share-links/${linkId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: batchShareKeys.links(batchId) }),
  });
};

// ==================== PUBLIC ====================

export const useGetBatchShareReport = (token: string) =>
  useQuery({
    queryKey: batchShareKeys.report(token),
    queryFn: async () => {
      const { data } = await publicApi.get(`/public/batch-share/${encodeURIComponent(token)}`);
      return data.data as BatchShareReport;
    },
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
  });
