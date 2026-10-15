"use client";

import { CalendarDays, X } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { DateInput } from "@/common/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  getBSYearMonthFromAD,
  getFirstDayOfBSMonthAD,
  getNepalTodayAd,
  toNepalDayAd,
} from "@/common/lib/nepali-date";
import type { FarmerAnalyticsOverview, AnalyticsRangeInfo } from "@/fetchers/analytics/farmerAnalyticsQueries";
import { useI18n } from "@/i18n/useI18n";
import { bsDay, bsDayShort } from "./shared";

export interface AnalyticsFilterState {
  farmId: string;
  batchType: string;
  batchId: string;
  /** Empty = all time. */
  startDate: string;
  endDate: string;
  custom: boolean;
}

export const ALL_TIME_FILTERS: AnalyticsFilterState = {
  farmId: "all",
  batchType: "all",
  batchId: "all",
  startDate: "",
  endDate: "",
  custom: false,
};

interface Props {
  value: AnalyticsFilterState;
  onChange: (next: AnalyticsFilterState) => void;
  options?: FarmerAnalyticsOverview["filters"];
  range?: AnalyticsRangeInfo;
}

export function AnalyticsFilters({ value, onChange, options, range }: Props) {
  const { t } = useI18n();
  const set = (patch: Partial<AnalyticsFilterState>) => onChange({ ...value, ...patch });
  const toDay = (raw: string) => (raw ? toNepalDayAd(raw) : "");

  const rangeText = !range
    ? ""
    : range.allTime
      ? t("farmer.analytics.filters.allTimeSince", { date: bsDay(range.startDay) })
      : `${bsDayShort(range.startDay)} – ${bsDay(range.endDay)}`;

  const badDates = value.custom && value.startDate && value.endDate && value.startDate > value.endDate;

  return (
    <div className="space-y-2 rounded-lg border bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border p-0.5">
          <Button
            type="button"
            size="sm"
            variant={value.custom ? "ghost" : "default"}
            className="h-7 px-3"
            onClick={() => set({ custom: false, startDate: "", endDate: "" })}
          >
            {t("farmer.analytics.filters.allTime")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={value.custom ? "default" : "ghost"}
            className="h-7 px-3"
            onClick={() => {
              if (value.custom) return;
              // Start with this Nepali month up to today, so the boxes match the numbers.
              const today = getNepalTodayAd();
              const { year, month } = getBSYearMonthFromAD(today);
              set({ custom: true, startDate: getFirstDayOfBSMonthAD(year, month), endDate: today });
            }}
          >
            <CalendarDays className="mr-1 h-3.5 w-3.5" />
            {t("farmer.analytics.filters.customDates")}
          </Button>
        </div>

        <Select value={value.farmId} onValueChange={(farmId) => set({ farmId, batchId: "all" })}>
          <SelectTrigger className="h-9 w-[calc(50%-4px)] sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("farmer.analytics.filters.allFarms")}</SelectItem>
            {options?.farms.map((farm) => (
              <SelectItem key={farm.id} value={farm.id}>
                {farm.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.batchType} onValueChange={(batchType) => set({ batchType, batchId: "all" })}>
          <SelectTrigger className="h-9 w-[calc(50%-4px)] sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("farmer.analytics.filters.allTypes")}</SelectItem>
            <SelectItem value="BROILER">{t("farmer.analytics.broiler")}</SelectItem>
            <SelectItem value="LAYERS">{t("farmer.analytics.layers")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={value.batchId} onValueChange={(batchId) => set({ batchId })}>
          <SelectTrigger className="h-9 w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("farmer.analytics.filters.allBatches")}</SelectItem>
            {options?.batches.map((batch) => (
              <SelectItem key={batch.id} value={batch.id}>
                {batch.batchNumber}
                <span className="ml-1 text-xs text-muted-foreground">
                  · {batch.status === "ACTIVE" ? t("farmer.analytics.running") : t("farmer.analytics.closed")}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.custom && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-[calc(50%-4px)] sm:w-48">
            <DateInput label={t("farmer.analytics.filters.from")} value={value.startDate} onChange={(raw) => set({ startDate: toDay(raw) })} />
          </div>
          <div className="w-[calc(50%-4px)] sm:w-48">
            <DateInput label={t("farmer.analytics.filters.to")} value={value.endDate} onChange={(raw) => set({ endDate: toDay(raw) })} />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => set({ custom: false, startDate: "", endDate: "" })}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            {t("farmer.analytics.filters.clear")}
          </Button>
        </div>
      )}

      {badDates ? (
        <p className="text-xs text-red-600">{t("farmer.analytics.filters.badDates")}</p>
      ) : (
        rangeText && <p className="text-xs text-muted-foreground">{rangeText}</p>
      )}
    </div>
  );
}

/** Filters → API params (custom dates only when both are picked and in order). */
export function toParams(value: AnalyticsFilterState) {
  const datesOk = value.custom && value.startDate && value.endDate && value.startDate <= value.endDate;
  return {
    farmId: value.farmId,
    batchType: value.batchType === "all" ? undefined : (value.batchType as "BROILER" | "LAYERS"),
    batchId: value.batchId,
    startDate: datesOk ? value.startDate : undefined,
    endDate: datesOk ? value.endDate : undefined,
  };
}
