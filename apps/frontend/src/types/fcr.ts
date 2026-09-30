export type FcrDisplayStatus =
  | "FRESH"
  | "STALE"
  | "WEIGHT_REQUIRED"
  | "FINAL"
  | "NOT_CALCULABLE";

export interface FcrHistoryRow {
  id: string;
  calculationDate: string;
  fcr: number;
  basis: "LIVE" | "FINAL" | "FINAL_PENDING_CLOSE";
  displayStatus: "FRESH" | "STALE" | "FINAL";
  feedKg: number;
  initialBiomassKg: number;
  initialChickWeightKg: number;
  soldBirds: number;
  soldLiveWeightKg: number;
  naturalDeaths: number;
  closureDeaths: number;
  remainingBirds: number;
  remainingAverageWeightKg: number | null;
  remainingWeightSampleCount: number | null;
  remainingLiveWeightKg: number;
  producedLiveWeightKg: number;
  weightGainKg: number;
  isFinal: boolean;
}

export interface FcrHistoryResponse {
  success: boolean;
  data: FcrHistoryRow[];
}

export interface CloseBatchFcrInput {
  endDate?: string;
  finalNotes?: string;
  confirmRemainingAsDead?: boolean;
}
