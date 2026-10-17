"use client";

import { nepalBatchAge } from "@/common/lib/nepali-date";
import { Building2, Layers } from "lucide-react";
import { useAuth } from "@/common/store/store";
import { useState } from "react";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import Link from "next/link";
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { useGetUserFarms } from "@/fetchers/farms/farmQueries";
import {
  useDashboardStats,
  useGetMoneyToReceiveDetails,
} from "@/fetchers/dashboard/dashboardQueries";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { BatchProfitChart } from "@/components/dashboard/BatchProfitChart";
import { MoneyDetailsModal } from "@/components/dashboard/modals/MoneyDetailsModal";
import { ReminderCard } from "@/components/dashboard/ReminderCard";
import { QuickActionBtnsFarmer } from "@/components/dashboard/QuickActionBtns-Farmer";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent } from "@/common/components/ui/card";

const ACTIVE_BATCH_LIST_LIMIT = 100;

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const canManageOperations = !user?.isStaff || user.permissions?.includes("FARMER_MANAGE_OPERATIONS");
  const canViewFinancialSummaries = !user?.isStaff || user.permissions?.includes("FARMER_VIEW_FINANCIAL_SUMMARIES");

  // Fetch real data from APIs
  // Ask the server for ACTIVE batches only (the default list is just the latest 10 of any status).
  const { data: batchesResponse } = useGetAllBatches(
    { status: "ACTIVE", limit: ACTIVE_BATCH_LIST_LIMIT },
    { enabled: canManageOperations }
  );
  const { data: farmsResponse } = useGetUserFarms("all", undefined, { enabled: canManageOperations });

  const activeBatches = (batchesResponse?.data || []).filter(
    (batch: any) => batch.status === "ACTIVE"
  );
  // True count from the server, even if there are more than the list shows.
  const activeBatchCount = batchesResponse?.pagination?.total ?? activeBatches.length;
  const farms = farmsResponse?.data || [];

  const [isFarmsOpen, setIsFarmsOpen] = useState(false);
  const [isBatchesOpen, setIsBatchesOpen] = useState(false);
  const [isMoneyToReceiveOpen, setIsMoneyToReceiveOpen] = useState(false);

  // Dashboard statistics
  const {
    lifetimeProfit,
    monthlyRevenue,
    monthlyRevenueGrowth,
    moneyToReceive,
    moneyToGive,
    totalExpenses,
    customersOwingCount,
    monthLabel,
    isLoading: statsLoading,
  } = useDashboardStats({ enabled: canManageOperations && canViewFinancialSummaries });

  // Money details queries
  const { data: moneyToReceiveData, isLoading: moneyToReceiveLoading } =
    useGetMoneyToReceiveDetails(
      1,
      10,
      {
        enabled: canManageOperations && canViewFinancialSummaries && window.location.pathname === "/farmer/dashboard/home",
      }
    );

  if (!canManageOperations) {
    return <Card className="mx-auto mt-10 max-w-lg"><CardContent className="py-10 text-center"><h1 className="text-lg font-semibold">No farm operations access</h1><p className="mt-2 text-sm text-muted-foreground">Your owner can grant farm operations, analytics, financial, or payroll access from Staff access.</p></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome + Quick actions: stacked on mobile, welcome left / buttons right on desktop */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-bold tracking-tight">
          {t("farmer.dashboard.welcome", { name: user?.name || "" })}
        </h1>
        <QuickActionBtnsFarmer />
      </div>

      {/* Modals */}
      <Modal
        isOpen={isFarmsOpen}
        onClose={() => setIsFarmsOpen(false)}
        title={t("farmer.dashboard.allFarmsTitle")}
      >
        <ModalContent>
          <div className="space-y-3">
            {farms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("farmer.dashboard.noFarmsFound")}</p>
              </div>
            ) : (
              farms.map((farm) => (
                <Link
                  key={farm.id}
                  href={`/farmer/dashboard/farms/${farm.id}`}
                  className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60 hover:bg-muted cursor-pointer"
                >
                  <div>
                    <div className="font-medium">{farm.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("farmer.dashboard.farmCapacity", { count: farm.capacity.toLocaleString() })}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {t("farmer.dashboard.farmBatches", { count: farm._count?.batches || 0 })}
                  </div>
                </Link>
              ))
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsFarmsOpen(false)}
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          >
            {t("farmer.dashboard.close")}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={isBatchesOpen}
        onClose={() => setIsBatchesOpen(false)}
        title={t("farmer.dashboard.allBatchesTitle")}
      >
        <ModalContent>
          <div className="space-y-3">
            {activeBatchCount > activeBatches.length ? (
              <p className="text-xs text-gray-500">
                Showing {activeBatches.length} of {activeBatchCount} active batches. See all on the Batches page.
              </p>
            ) : null}
            {activeBatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("farmer.dashboard.noBatchesFound")}</p>
              </div>
            ) : (
              activeBatches.map((batch) => (
                <Link
                  key={batch.id}
                  href={`/farmer/dashboard/batches/${batch.id}`}
                  className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60 hover:bg-muted cursor-pointer"
                >
                  <div>
                    <div className="font-medium">{batch.batchNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("farmer.dashboard.batchInfo", {
                        farm: batch.farm.name,
                        count: batch.initialChicks.toLocaleString(),
                        days: nepalBatchAge(batch.startDate),
                      })}
                    </div>
                  </div>
                  <div
                    className={
                      batch.status === "ACTIVE"
                        ? "text-green-600 text-sm font-medium"
                        : "text-muted-foreground text-sm font-medium"
                    }
                  >
                    {batch.status}
                  </div>
                </Link>
              ))
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsBatchesOpen(false)}
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          >
            {t("farmer.dashboard.close")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Stats Cards */}
      {canViewFinancialSummaries && <StatsCards
        farms={farms}
        activeBatches={activeBatches}
        activeBatchCount={activeBatchCount}
        lifetimeProfit={lifetimeProfit}
        monthlyRevenue={monthlyRevenue}
        monthlyRevenueGrowth={monthlyRevenueGrowth}
        moneyToReceive={moneyToReceive}
        moneyToGive={moneyToGive}
        totalExpenses={totalExpenses}
        customersOwingCount={customersOwingCount}
        monthLabel={monthLabel}
        statsLoading={statsLoading}
        onFarmsClick={() => setIsFarmsOpen(true)}
        onBatchesClick={() => setIsBatchesOpen(true)}
        onMoneyToReceiveClick={() => setIsMoneyToReceiveOpen(true)}
        onMoneyToPayClick={undefined}
      />}

      {canManageOperations && canViewFinancialSummaries ? <BatchProfitChart farms={farms} /> : null}

      {/* Reminders (same grid so size/placement unchanged) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-w-0">
          <ReminderCard />
        </div>
      </div>

      {/* Money to Receive Details Modal */}
      {canViewFinancialSummaries && <MoneyDetailsModal
        isOpen={isMoneyToReceiveOpen}
        onClose={() => setIsMoneyToReceiveOpen(false)}
        title={t("farmer.dashboard.moneyToReceive")}
        icon="💰"
        isLoading={moneyToReceiveLoading}
        data={moneyToReceiveData?.data}
        type="receive"
      />}

    </div>
  );
}
