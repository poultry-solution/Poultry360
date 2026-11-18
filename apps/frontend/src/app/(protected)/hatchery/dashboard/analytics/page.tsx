"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Loader2, Repeat, ShieldAlert } from "lucide-react";
import { CustomRangePickers, RangeModeSwitch, useNepaliDateRange } from "@/components/common/NepaliRangeFilter";
import { getNepalTodayAd, nepalBatchAge, toNepalDayAd } from "@/common/lib/nepali-date";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs";
import {
  useGetHatcheryAnalyticsBatches,
  useGetHatcheryAnalyticsIncubations,
  useGetHatcheryAnalyticsProduction,
  useGetHatcheryAnalyticsSales,
  useGetHatcheryAnalyticsOverview,
} from "@/fetchers/hatchery/hatcheryAnalyticsQueries";
import { useFirstHatcheryBatchStartDate, useHatcheryBatches } from "@/fetchers/hatchery/hatcheryBatchQueries";
import {
  ANALYTICS_TABS,
  DAILY_TREND_MAX_DAYS,
  type AnalyticsTab,
  type IncubationStageFilter,
  type SaleTypeFilter,
} from "./_components/types";
import { OverviewTab } from "./_components/OverviewTab";
import { BatchesTab } from "./_components/BatchesTab";
import { IncubationsTab } from "./_components/IncubationsTab";
import { ProductionTab } from "./_components/ProductionTab";
import { SalesTab } from "./_components/SalesTab";
import {
  BatchAnalyticsLoadingState,
  IncubationAnalyticsLoadingState,
  OverviewLoadingState,
  ProductionAnalyticsLoadingState,
  SalesAnalyticsLoadingState,
} from "./_components/LoadingStates";
import { useAuthStore } from "@/common/store/store";
import { BusinessDownloadDialog } from "@/components/downloads/BusinessDownloadDialog";

function QueryErrorCard({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <p className="max-w-md text-sm text-slate-500">{description}</p>
        </div>
        <Button onClick={onRetry}>Try again</Button>
      </CardContent>
    </Card>
  );
}

function HatcheryAnalyticsContent() {
  const range = useNepaliDateRange();
  const firstBatchStart = useFirstHatcheryBatchStartDate();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const [batchPage, setBatchPage] = useState(1);
  const [incubationPage, setIncubationPage] = useState(1);
  const [productionPage, setProductionPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const [incubationStage, setIncubationStage] = useState<IncubationStageFilter>("all");
  const [incubationParentBatchId, setIncubationParentBatchId] = useState("all");
  const [saleType, setSaleType] = useState<SaleTypeFilter>("ALL");

  // All time = from the first batch's start day to today (Nepal days). With
  // no batches yet there is nothing to show, so the last 30 days is enough.
  const rangeBounds = useMemo(() => {
    if (range.appliedRange) return range.appliedRange;
    if (firstBatchStart.isLoading) return null;
    const today = getNepalTodayAd();
    let startDate = firstBatchStart.data ? toNepalDayAd(firstBatchStart.data) : "";
    if (!startDate) {
      const d = new Date(`${today}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 29);
      startDate = d.toISOString().slice(0, 10);
    }
    return { startDate: startDate < today ? startDate : today, endDate: today };
  }, [range.appliedRange, firstBatchStart.isLoading, firstBatchStart.data]);

  const isAllTime = !range.appliedRange;
  const byMonth = rangeBounds ? nepalBatchAge(rangeBounds.startDate, rangeBounds.endDate) > DAILY_TREND_MAX_DAYS : false;
  const ready = rangeBounds !== null;

  const { data: parentBatchList } = useHatcheryBatches({
    type: "PARENT_FLOCK",
    limit: 100,
  });

  const overviewParams = useMemo(
    () => ({
      startDate: rangeBounds?.startDate,
      endDate: rangeBounds?.endDate,
    }),
    [rangeBounds?.endDate, rangeBounds?.startDate]
  );

  const overviewQuery = useGetHatcheryAnalyticsOverview(overviewParams, ready);
  const batchesQuery = useGetHatcheryAnalyticsBatches(
    {
      ...overviewParams,
      page: batchPage,
      limit: 10,
    },
    ready && activeTab === "batches"
  );
  const incubationsQuery = useGetHatcheryAnalyticsIncubations(
    {
      ...overviewParams,
      stage: incubationStage === "all" ? undefined : incubationStage,
      parentBatchId: incubationParentBatchId === "all" ? undefined : incubationParentBatchId,
      page: incubationPage,
      limit: 10,
    },
    ready && activeTab === "incubations"
  );
  const productionQuery = useGetHatcheryAnalyticsProduction(
    {
      ...overviewParams,
      page: productionPage,
      limit: 10,
    },
    ready && activeTab === "production"
  );
  const salesQuery = useGetHatcheryAnalyticsSales(
    {
      ...overviewParams,
      saleType,
      page: salesPage,
      limit: 10,
    },
    ready && activeTab === "sales"
  );

  useEffect(() => {
    setBatchPage(1);
    setIncubationPage(1);
    setProductionPage(1);
    setSalesPage(1);
  }, [rangeBounds?.startDate, rangeBounds?.endDate]);

  useEffect(() => {
    setIncubationPage(1);
  }, [incubationStage, incubationParentBatchId]);

  useEffect(() => {
    setSalesPage(1);
  }, [saleType]);

  useEffect(() => {
    const incubationTotalPages = incubationsQuery.data?.totalPages ?? 1;
    if (incubationPage > incubationTotalPages) {
      setIncubationPage(Math.max(1, incubationTotalPages));
    }
  }, [incubationPage, incubationsQuery.data?.totalPages]);

  useEffect(() => {
    const productionTotalPages = productionQuery.data?.totalPages ?? 1;
    if (productionPage > productionTotalPages) {
      setProductionPage(Math.max(1, productionTotalPages));
    }
  }, [productionPage, productionQuery.data?.totalPages]);

  useEffect(() => {
    const salesTotalPages = salesQuery.data?.totalPages ?? 1;
    if (salesPage > salesTotalPages) {
      setSalesPage(Math.max(1, salesTotalPages));
    }
  }, [salesPage, salesQuery.data?.totalPages]);

  const parentBatchOptions = useMemo(
    () => (parentBatchList?.batches ?? []).filter((batch) => batch.type === "PARENT_FLOCK").map((batch) => ({ id: batch.id, code: batch.code })),
    [parentBatchList?.batches]
  );
  const downloadAnalytics = async () => {
    const overview = overviewQuery.data?.overview;
    const trends = overviewQuery.data?.trends.daily || [];
    return {
      sections: [
        {
          title: "Summary",
          columns: [{ label: "Item", value: (row: any) => row.label }, { label: "Value", value: (row: any) => row.value }],
          rows: [
            { label: "Income", value: Number(overview?.totalRevenue || 0).toFixed(2) },
            { label: "Cost", value: Number(overview?.totalExpenses || 0).toFixed(2) },
            { label: "Profit", value: Number(overview?.netProfit || 0).toFixed(2) },
            { label: "Active batches", value: overview?.activeBatches || 0 },
            { label: "Running incubations", value: overview?.activeIncubations || 0 },
            { label: "Eggs in stock", value: overview?.totalEggStock || 0 },
            { label: "Chicks in stock", value: overview?.totalProducedChicks || 0 },
          ],
        },
        {
          title: "Day by day",
          columns: [{ label: "Date", value: (row: any) => row.date }, { label: "Income", value: (row: any) => Number(row.revenue || 0).toFixed(2) }, { label: "Cost", value: (row: any) => Number(row.expenses || 0).toFixed(2) }, { label: "Profit", value: (row: any) => Number(row.profit || 0).toFixed(2) }],
          rows: trends,
        },
      ],
      summary: [{ label: "Dates", value: range.rangeLabel }],
    };
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <BarChart3 className="h-6 w-6 text-green-600" />
            Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500">Money, eggs, hatches and sales for your hatchery.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BusinessDownloadDialog title="analytics" fileName="hatchery-analytics" getData={downloadAnalytics} hasDateFilter={false} buttonLabel="Download" />
          <Button variant="outline" onClick={() => overviewQuery.refetch()} disabled={overviewQuery.isFetching}>
            {overviewQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Repeat className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-700">
            Showing: <span className="font-semibold text-gray-900">{range.rangeLabel}</span>
            {isAllTime && rangeBounds && firstBatchStart.data ? (
              <span className="text-gray-500"> · since your first batch</span>
            ) : null}
          </p>
          <RangeModeSwitch state={range} />
        </div>
        {range.isCustomRange ? <CustomRangePickers state={range} /> : null}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AnalyticsTab)}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg bg-gray-100 p-1">
          {ANALYTICS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-md px-3 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4 space-y-6">
          <TabsContent value="overview" className="mt-0">
            {!ready || overviewQuery.isLoading ? (
              <OverviewLoadingState />
            ) : overviewQuery.isError ? (
              <QueryErrorCard
                title="Could not load analytics"
                description="Check your connection and try again."
                onRetry={() => overviewQuery.refetch()}
              />
            ) : overviewQuery.data ? (
              <OverviewTab data={overviewQuery.data} byMonth={byMonth} showComparison={!isAllTime} />
            ) : null}
          </TabsContent>

          <TabsContent value="batches" className="mt-0">
            {!ready || batchesQuery.isLoading ? (
              <BatchAnalyticsLoadingState />
            ) : batchesQuery.isError ? (
              <QueryErrorCard
                title="Could not load batch numbers"
                description="Check your connection and try again."
                onRetry={() => batchesQuery.refetch()}
              />
            ) : batchesQuery.data ? (
              <BatchesTab
                data={batchesQuery.data}
                loading={batchesQuery.isFetching}
                page={batchPage}
                onPageChange={setBatchPage}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="incubations" className="mt-0">
            {!ready || incubationsQuery.isLoading ? (
              <IncubationAnalyticsLoadingState />
            ) : incubationsQuery.isError ? (
              <QueryErrorCard
                title="Could not load incubation numbers"
                description="Check your connection and try again."
                onRetry={() => incubationsQuery.refetch()}
              />
            ) : incubationsQuery.data ? (
              <IncubationsTab
                data={incubationsQuery.data}
                loading={incubationsQuery.isFetching}
                page={incubationPage}
                onPageChange={setIncubationPage}
                parentBatchOptions={parentBatchOptions}
                incubationStage={incubationStage}
                onIncubationStageChange={setIncubationStage}
                incubationParentBatchId={incubationParentBatchId}
                onIncubationParentBatchIdChange={setIncubationParentBatchId}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="production" className="mt-0">
            {!ready || productionQuery.isLoading ? (
              <ProductionAnalyticsLoadingState />
            ) : productionQuery.isError ? (
              <QueryErrorCard
                title="Could not load production numbers"
                description="Check your connection and try again."
                onRetry={() => productionQuery.refetch()}
              />
            ) : productionQuery.data ? (
              <ProductionTab
                data={productionQuery.data}
                loading={productionQuery.isFetching}
                page={productionPage}
                onPageChange={setProductionPage}
                byMonth={byMonth}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="sales" className="mt-0">
            {!ready || salesQuery.isLoading ? (
              <SalesAnalyticsLoadingState />
            ) : salesQuery.isError ? (
              <QueryErrorCard
                title="Could not load sales numbers"
                description="Check your connection and try again."
                onRetry={() => salesQuery.refetch()}
              />
            ) : salesQuery.data ? (
              <SalesTab
                data={salesQuery.data}
                loading={salesQuery.isFetching}
                page={salesPage}
                onPageChange={setSalesPage}
                saleType={saleType}
                onSaleTypeChange={setSaleType}
                byMonth={byMonth}
              />
            ) : null}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default function HatcheryAnalyticsPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const canViewAnalytics =
    !user?.isStaff || user.permissions?.includes("HATCHERY_VIEW_ANALYTICS");

  // The API retains its own permission check. This guard prevents a staff
  // member who opens the URL directly from mounting any analytics queries.
  // Analytics is intentionally hidden, so return them to their normal home
  // instead of presenting an access error.
  useEffect(() => {
    if (!canViewAnalytics) router.replace("/hatchery/dashboard/home");
  }, [canViewAnalytics, router]);

  if (!canViewAnalytics) {
    return null;
  }

  return <HatcheryAnalyticsContent />;
}
