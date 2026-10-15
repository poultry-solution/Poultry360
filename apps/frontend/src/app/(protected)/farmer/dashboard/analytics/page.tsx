"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { useAuthStore } from "@/common/store/store";
import {
  ALL_TIME_FILTERS,
  AnalyticsFilters,
  toParams,
  type AnalyticsFilterState,
} from "@/components/analytics/farmer/AnalyticsFilters";
import { OverviewTab } from "@/components/analytics/farmer/OverviewTab";
import { MoneyTab } from "@/components/analytics/farmer/MoneyTab";
import { BatchesTab } from "@/components/analytics/farmer/BatchesTab";
import { HealthFeedTab } from "@/components/analytics/farmer/HealthFeedTab";
import { EggsTab } from "@/components/analytics/farmer/EggsTab";
import { DownloadReportModal } from "@/components/analytics/farmer/DownloadReportModal";
import {
  useFarmerAnalyticsOverview,
  useFarmerBatchesAnalytics,
  useFarmerEggsAnalytics,
  useFarmerHealthFeedAnalytics,
  useFarmerMoneyAnalytics,
} from "@/fetchers/analytics/farmerAnalyticsQueries";
import { useI18n } from "@/i18n/useI18n";

type Tab = "overview" | "money" | "batches" | "health" | "eggs";

function FarmerAnalyticsContent() {
  const { t } = useI18n();
  // Always opens on "All time"; custom dates are optional.
  const [filters, setFilters] = useState<AnalyticsFilterState>(ALL_TIME_FILTERS);
  const [tab, setTab] = useState<Tab>("overview");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const params = useMemo(() => toParams(filters), [filters]);

  const overview = useFarmerAnalyticsOverview(params);
  const money = useFarmerMoneyAnalytics(params, tab === "money");
  const batches = useFarmerBatchesAnalytics(params, tab === "batches");
  const health = useFarmerHealthFeedAnalytics(params, tab === "health");
  const eggs = useFarmerEggsAnalytics(params, tab === "eggs");

  const options = overview.data?.filters;
  const hasLayers = overview.data?.hasLayers ?? false;

  // Drop a batch choice only when fresh options no longer include it (e.g. farm changed).
  useEffect(() => {
    if (!options || overview.isPlaceholderData || filters.batchId === "all") return;
    if (!options.batches.some((batch) => batch.id === filters.batchId)) {
      setFilters((current) => ({ ...current, batchId: "all" }));
    }
  }, [options, overview.isPlaceholderData, filters.batchId]);

  useEffect(() => {
    if (tab === "eggs" && overview.data && !hasLayers) setTab("overview");
  }, [tab, hasLayers, overview.data]);

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "overview", label: t("farmer.analytics.tabs.overview") },
    { key: "money", label: t("farmer.analytics.tabs.money") },
    { key: "batches", label: t("farmer.analytics.tabs.batches") },
    { key: "health", label: t("farmer.analytics.tabs.health") },
    ...(hasLayers ? [{ key: "eggs" as Tab, label: t("farmer.analytics.tabs.eggs") }] : []),
  ];

  const failed = overview.isError && !overview.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("farmer.analytics.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("farmer.analytics.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => setDownloadOpen(true)}>
          <Download className="mr-1.5 h-4 w-4" />
          {t("farmer.analytics.download.button")}
        </Button>
      </div>

      <AnalyticsFilters value={filters} onChange={setFilters} options={options} range={overview.data?.range} />

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {tabs.map((item) => (
          <Button
            key={item.key}
            variant={tab === item.key ? "default" : "outline"}
            className="h-8 shrink-0 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {failed ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t("farmer.analytics.loadFailed")}</CardContent>
        </Card>
      ) : (
        <div className={overview.isFetching && overview.isPlaceholderData ? "opacity-60 transition-opacity" : ""}>
          {tab === "overview" && <OverviewTab data={overview.data} loading={overview.isLoading} />}
          {tab === "money" && <MoneyTab data={money.data} loading={money.isLoading} />}
          {tab === "batches" && <BatchesTab data={batches.data} loading={batches.isLoading} />}
          {tab === "health" && <HealthFeedTab data={health.data} loading={health.isLoading} />}
          {tab === "eggs" && <EggsTab data={eggs.data} loading={eggs.isLoading} />}
        </div>
      )}

      <DownloadReportModal
        isOpen={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        params={params}
        showEggs={hasLayers}
      />
    </div>
  );
}

export default function FarmerAnalyticsPage() {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  if (user?.isStaff && !user.permissions?.includes("FARMER_VIEW_ANALYTICS")) {
    return (
      <Card className="mx-auto mt-10 max-w-lg">
        <CardContent className="py-10 text-center">
          <h1 className="text-lg font-semibold">{t("farmer.analytics.noAccessTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("farmer.analytics.noAccessBody")}</p>
        </CardContent>
      </Card>
    );
  }
  return <FarmerAnalyticsContent />;
}
