import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance, { publicApi } from "@/common/lib/axios";

// Hatchery batch share links: a read-only report of one parent batch (and its
// incubations) for a vet. No money. Types mirror
// apps/backend/src/services/hatcheryBatchShareService.ts.

// ==================== TYPES ====================

export type HatcheryShareLinkDays = 1 | 7 | 30;

export interface HatcheryShareLink {
  id: string;
  token: string;
  expiresAt: string;
  revokedAt: string | null;
  showNotes: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
}

export interface HatcheryShareNotes {
  legacy: string | null;
  items: Array<{ text: string; date: string; author: "Owner" | "Staff" }>;
}

export interface HatcheryIncubationNumbers {
  eggsSet: number;
  infertile: number;
  earlyDead: number;
  candlingLoss: number;
  fertileEggs: number | null;
  fertilePercent: number | null;
  lateDead: number;
  unhatched: number;
  hatchedA: number;
  hatchedB: number;
  cull: number;
  totalHatched: number;
  hatchOfFertile: number | null;
  hatchOfSet: number | null;
}

export type HatcheryIncubationStage = "SETTER" | "CANDLING" | "HATCHER" | "COMPLETED";

export interface HatcheryShareBatchReport {
  generatedAt: string;
  expiresAt: string;
  batch: {
    code: string;
    name: string | null;
    status: "ACTIVE" | "CLOSED";
    startDate: string;
    endDate: string | null;
    hatcheryName: string | null;
    ageDay: number;
    ageWeek: number;
  };
  birds: {
    started: { female: number; male: number; total: number };
    now: { female: number; male: number; total: number };
    malesPer100Females: number | null;
    deaths: {
      female: number;
      male: number;
      notSplit: number;
      total: number;
      percent: number | null;
      femalePercent: number | null;
      malePercent: number | null;
    };
    sold: { female: number; male: number; total: number; avgWeightKg: number | null };
  };
  deaths: {
    recent: Array<{ date: string; day: number; female: number; male: number; total: number; note: string | null }>;
  };
  eggs: {
    total: number;
    hatchable: number;
    hatchablePercent: number | null;
    layPercent: number | null;
    firstEggDate: string | null;
    byType: Array<{ name: string; isHatchable: boolean; count: number }>;
  };
  feed: {
    byUnit: Array<{ unit: string; female: number; male: number; notSplit: number; total: number }>;
    totalKg: number;
    recent: Array<{ date: string; day: number; item: string; quantity: number; unit: string | null; forWhom: string }>;
  };
  weekly: Array<{
    week: number;
    deaths: number;
    deathsFemale: number;
    deathsMale: number;
    eggs: number;
    layPercent: number | null;
    feedKg: number;
    gramsPerBirdPerDay: number | null;
  }>;
  medicines: Array<{ date: string; day: number; item: string; quantity: number | null; unit: string | null; note: string | null }>;
  hatching: {
    incubations: Array<
      HatcheryIncubationNumbers & {
        id: string;
        code: string;
        name: string | null;
        stage: HatcheryIncubationStage;
        setDate: string;
      }
    >;
    totals: HatcheryIncubationNumbers & { finishedCount: number; runningCount: number; runningEggs: number };
  };
  notes: HatcheryShareNotes | null;
}

export interface HatcheryShareIncubationReport {
  generatedAt: string;
  expiresAt: string;
  batchCode: string;
  incubation: {
    id: string;
    code: string;
    name: string | null;
    stage: HatcheryIncubationStage;
    setDate: string;
    currentDay: number | null;
    totalDays: number;
  };
  timeline: Array<{
    label: string;
    dueDay: number;
    dueDate: string;
    doneDate: string | null;
    status: "done" | "late" | "due";
  }>;
  eggsByType: Array<{ name: string; count: number }>;
  numbers: HatcheryIncubationNumbers & {
    gradeAPercent: number | null;
    gradeBPercent: number | null;
    cullPercent: number | null;
  };
  losses: Array<{ date: string; type: string; count: number; note: string | null }>;
  hatchResults: Array<{
    date: string;
    hatchedA: number;
    hatchedB: number;
    cull: number;
    lateDead: number;
    unhatched: number;
    note: string | null;
  }>;
  chicksLeft: Array<{ grade: string; count: number }>;
  chicksSentOut: Array<{ grade: string; count: number }>;
  notes: HatcheryShareNotes | null;
}

// ==================== KEYS ====================

export const hatcheryShareKeys = {
  links: (batchId: string) => ["hatchery-share-links", batchId] as const,
  report: (token: string) => ["hatchery-share-report", token] as const,
  incubation: (token: string, id: string) => ["hatchery-share-incubation", token, id] as const,
};

/** Full public address of a hatchery share link. */
export const hatcheryShareUrl = (token: string) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/share/hatchery-batch/${token}`;

// ==================== OWNER SIDE ====================

export const useGetHatcheryShareLinks = (batchId: string, enabled = true) =>
  useQuery({
    queryKey: hatcheryShareKeys.links(batchId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/hatchery/batches/${batchId}/share-links`);
      return data.data as HatcheryShareLink[];
    },
    enabled: enabled && !!batchId,
  });

export const useCreateHatcheryShareLink = (batchId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { expiresInDays: HatcheryShareLinkDays; showNotes: boolean }) => {
      const { data } = await axiosInstance.post(`/hatchery/batches/${batchId}/share-links`, body);
      return data.data as HatcheryShareLink;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hatcheryShareKeys.links(batchId) }),
  });
};

export const useRevokeHatcheryShareLink = (batchId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (linkId: string) => {
      await axiosInstance.delete(`/hatchery/batches/${batchId}/share-links/${linkId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hatcheryShareKeys.links(batchId) }),
  });
};

// ==================== PUBLIC ====================

export const useHatcheryShareReport = (token: string) =>
  useQuery({
    queryKey: hatcheryShareKeys.report(token),
    queryFn: async () => {
      const { data } = await publicApi.get(`/public/hatchery-batch-share/${encodeURIComponent(token)}`);
      return data.data as HatcheryShareBatchReport;
    },
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
  });

export const useHatcheryShareIncubation = (token: string, incubationId: string) =>
  useQuery({
    queryKey: hatcheryShareKeys.incubation(token, incubationId),
    queryFn: async () => {
      const { data } = await publicApi.get(
        `/public/hatchery-batch-share/${encodeURIComponent(token)}/incubations/${encodeURIComponent(incubationId)}`,
      );
      return data.data as HatcheryShareIncubationReport;
    },
    enabled: !!token && !!incubationId,
    retry: false,
    refetchOnWindowFocus: false,
  });
