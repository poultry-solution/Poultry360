"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/common/components/ui/card";
import {
  Egg,
  Layers,
  FlaskConical,
  Bird,
  CalendarDays,
  DollarSign,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "@/common/store/store";
import { convertADtoBS } from "@/common/lib/nepali-date";
import { useHatcheryBatches, useHatcheryEggInventory } from "@/fetchers/hatchery/hatcheryBatchQueries";
import { useHatcheryTodaySummary } from "@/fetchers/hatchery/hatcheryAnalyticsQueries";
import { useIncubationBatches, useProducedChickStock } from "@/fetchers/hatchery/hatcheryIncubationQueries";
import { useHatcheryParties } from "@/fetchers/hatchery/hatcheryPartyQueries";
import { useGetHatcheryInventoryStatistics } from "@/fetchers/hatchery/hatcheryInventoryQueries";

function fmtNpr(amount: number) {
  return `NPR ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  valueClassName,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${valueClassName ?? "text-foreground"}`}>{value}</p>
            {subtitle ? <p className="text-xs text-muted-foreground mt-1">{subtitle}</p> : null}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function HatcheryHomeContent() {
  const { user } = useAuthStore();
  const { data: todaySummary, isLoading: isTodaySummaryLoading } = useHatcheryTodaySummary();

  // Label comes from the SAME AD day the server counted, parsed as UTC midnight
  // exactly like stored record dates. Converting `new Date()` directly would
  // double-apply the Nepal offset and roll to the next BS day in the evening.
  const today = useMemo(
    () => (todaySummary?.date ? convertADtoBS(new Date(todaySummary.date)) : "—"),
    [todaySummary?.date]
  );

  const { data: activeParentBatchData, isLoading: isActiveParentBatchLoading } = useHatcheryBatches({
    type: "PARENT_FLOCK",
    status: "ACTIVE",
    limit: 200,
  });
  const { data: incubationData, isLoading: isIncubationLoading } = useIncubationBatches({ limit: 200 });
  const { data: eggInventoryRes, isLoading: isEggStockLoading } = useHatcheryEggInventory();
  const { data: producedChickRes, isLoading: isProducedChickLoading } = useProducedChickStock();
  const { data: partiesData, isLoading: isPartiesLoading } = useHatcheryParties();
  const { data: statsRes, isLoading: isInventoryStatsLoading } = useGetHatcheryInventoryStatistics();

  const activeParentBatches = activeParentBatchData?.total ?? 0;
  const activeIncubations = (incubationData?.batches ?? []).filter(
    (b) => b.stage === "SETTER" || b.stage === "CANDLING" || b.stage === "HATCHER"
  ).length;
  const totalEggStock = Number(eggInventoryRes?.summary?.totalStock ?? 0);
  const totalProducedChicks = Number(producedChickRes?.summary?.totalStock ?? 0);
  const outstandingPartiesBalance = (partiesData?.parties ?? []).reduce(
    (sum, p) => sum + Number(p.balance ?? 0),
    0
  );
  const lowStockItems = Number(statsRes?.data?.lowStockCount ?? 0);
  const isLoadingCards =
    isTodaySummaryLoading ||
    isActiveParentBatchLoading ||
    isIncubationLoading ||
    isEggStockLoading ||
    isProducedChickLoading ||
    isPartiesLoading ||
    isInventoryStatsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {user?.name ?? "User"}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoadingCards ? (
          Array.from({ length: 8 }).map((_, idx) => (
            <Card key={`kpi-skeleton-${idx}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 w-full">
                    <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                    <div className="h-7 w-20 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-40 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="h-5 w-5 rounded bg-muted animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <KpiCard title="Active Parent Batches" value={activeParentBatches} subtitle="Parent flock batches currently active" icon={Layers} />
            <KpiCard title="Active Incubations" value={activeIncubations} subtitle="Setter/Candling/Hatcher stages" icon={FlaskConical} />
            <KpiCard title="Total Egg Stock" value={totalEggStock.toLocaleString()} subtitle="Across all egg types and batches" icon={Egg} />
            <KpiCard title="Total Produced Chicks" value={totalProducedChicks.toLocaleString()} subtitle="Available stock across incubations" icon={Bird} />
            <KpiCard
              title="Today Egg Production"
              value={(todaySummary?.eggProduction ?? 0).toLocaleString()}
              subtitle={`Production records on ${today}`}
              icon={CalendarDays}
            />
            <KpiCard
              title="Today Chick Sales Revenue"
              value={fmtNpr(todaySummary?.chickSalesRevenue ?? 0)}
              subtitle={`Chick sales on ${today}`}
              icon={DollarSign}
              valueClassName="text-green-700"
            />
            <KpiCard
              title="Outstanding Parties Balance"
              value={fmtNpr(outstandingPartiesBalance)}
              subtitle="Total receivable from hatchery parties"
              icon={Users}
              valueClassName={outstandingPartiesBalance > 0 ? "text-red-600" : "text-green-700"}
            />
            <KpiCard
              title="Low Inventory Items"
              value={lowStockItems}
              subtitle="Items at or below minimum stock"
              icon={AlertTriangle}
              valueClassName={lowStockItems > 0 ? "text-red-600" : "text-green-700"}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function HatcheryHomePage() {
  const user = useAuthStore((state) => state.user);
  if (user?.isStaff && !user.permissions?.includes("HATCHERY_MANAGE_OPERATIONS")) {
    return <Card className="mx-auto mt-10 max-w-lg"><CardContent className="py-10 text-center"><h1 className="text-lg font-semibold">No Hatchery operations access</h1><p className="mt-2 text-sm text-muted-foreground">Your owner can grant Hatchery operations, analytics, or payroll access from Staff access.</p></CardContent></Card>;
  }
  return <HatcheryHomeContent />;
}
