"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BarChart3, Loader2, Repeat, ShieldAlert } from "lucide-react";
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
import { useHatcheryBatches } from "@/fetchers/hatchery/hatcheryBatchQueries";
import { AnalyticsFilters } from "./_components/AnalyticsFilters";
import {
  ANALYTICS_TABS,
  getRangeBounds,
  QUICK_RANGES,
  type AnalyticsRangePreset,
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
        <Button onClick={onRetry}>Retry</Button>
      </CardContent>
    </Card>
  );
}

export default function HatcheryAnalyticsPage() {
  const [rangePreset, setRangePreset] = useState<AnalyticsRangePreset>("30d");
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const [batchPage, setBatchPage] = useState(1);
  const [incubationPage, setIncubationPage] = useState(1);
  const [productionPage, setProductionPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const [incubationStage, setIncubationStage] = useState<IncubationStageFilter>("all");
  const [incubationParentBatchId, setIncubationParentBatchId] = useState("all");
  const [saleType, setSaleType] = useState<SaleTypeFilter>("ALL");

  const rangeBounds = useMemo(() => getRangeBounds(rangePreset), [rangePreset]);
  const { data: parentBatchList } = useHatcheryBatches({
    type: "PARENT_FLOCK",
    limit: 100,
  });

  const overviewParams = useMemo(
    () => ({
      startDate: rangeBounds.startDate,
      endDate: rangeBounds.endDate,
    }),
    [rangeBounds.endDate, rangeBounds.startDate]
  );

  const overviewQuery = useGetHatcheryAnalyticsOverview(overviewParams);
  const batchesQuery = useGetHatcheryAnalyticsBatches(
    {
      ...overviewParams,
      page: batchPage,
      limit: 10,
    },
    activeTab === "batches"
  );
  const incubationsQuery = useGetHatcheryAnalyticsIncubations(
    {
      ...overviewParams,
      stage: incubationStage === "all" ? undefined : incubationStage,
      parentBatchId: incubationParentBatchId === "all" ? undefined : incubationParentBatchId,
      page: incubationPage,
      limit: 10,
    },
    activeTab === "incubations"
  );
  const productionQuery = useGetHatcheryAnalyticsProduction(
    {
      ...overviewParams,
      page: productionPage,
      limit: 10,
    },
    activeTab === "production"
  );
  const salesQuery = useGetHatcheryAnalyticsSales(
    {
      ...overviewParams,
      saleType,
      page: salesPage,
      limit: 10,
    },
    activeTab === "sales"
  );

  useEffect(() => {
    setBatchPage(1);
    setIncubationPage(1);
    setProductionPage(1);
    setSalesPage(1);
  }, [rangePreset]);

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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
              <p className="text-sm text-slate-500">Hatchery performance, production, sales, and exposure in one workspace.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => overviewQuery.refetch()} disabled={overviewQuery.isFetching}>
            {overviewQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Repeat className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button variant="outline" className="rounded-xl opacity-70" disabled title="Coming next">
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <AnalyticsFilters
        rangePreset={rangePreset}
        onRangePresetChange={setRangePreset}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AnalyticsTab)}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2 md:grid-cols-4 xl:grid-cols-8">
          {ANALYTICS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-xl px-3 py-2 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6 space-y-6">
          <TabsContent value="overview" className="mt-0">
            {overviewQuery.isLoading ? (
              <OverviewLoadingState />
            ) : overviewQuery.isError ? (
              <QueryErrorCard
                title="Failed to load analytics"
                description="The hatchery overview endpoint returned an error. Try refreshing the page."
                onRetry={() => overviewQuery.refetch()}
              />
            ) : overviewQuery.data ? (
              <OverviewTab data={overviewQuery.data} />
            ) : null}
          </TabsContent>

          <TabsContent value="batches" className="mt-0">
            {batchesQuery.isLoading ? (
              <BatchAnalyticsLoadingState />
            ) : batchesQuery.isError ? (
              <QueryErrorCard
                title="Failed to load batch analytics"
                description="The hatchery batch analytics endpoint returned an error. Try refreshing the page."
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
            {incubationsQuery.isLoading ? (
              <IncubationAnalyticsLoadingState />
            ) : incubationsQuery.isError ? (
              <QueryErrorCard
                title="Failed to load incubation analytics"
                description="The hatchery incubation analytics endpoint returned an error. Try refreshing the page."
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
            {productionQuery.isLoading ? (
              <ProductionAnalyticsLoadingState />
            ) : productionQuery.isError ? (
              <QueryErrorCard
                title="Failed to load production analytics"
                description="The hatchery production analytics endpoint returned an error. Try refreshing the page."
                onRetry={() => productionQuery.refetch()}
              />
            ) : productionQuery.data ? (
              <ProductionTab
                data={productionQuery.data}
                loading={productionQuery.isFetching}
                page={productionPage}
                onPageChange={setProductionPage}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="sales" className="mt-0">
            {salesQuery.isLoading ? (
              <SalesAnalyticsLoadingState />
            ) : salesQuery.isError ? (
              <QueryErrorCard
                title="Failed to load sales analytics"
                description="The hatchery sales analytics endpoint returned an error. Try refreshing the page."
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
              />
            ) : null}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
