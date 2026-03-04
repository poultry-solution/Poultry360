"use client";

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
  useGetMoneyToPayDetails,
} from "@/fetchers/dashboard/dashboardQueries";
import { TodayExpenses } from "@/components/today-expenses";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { MoneyDetailsModal } from "@/components/dashboard/modals/MoneyDetailsModal";
import { BatchPerformanceTable } from "@/components/dashboard/BatchPerformanceTable";
import { ReminderCard } from "@/components/dashboard/ReminderCard";
import { useI18n } from "@/i18n/useI18n";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();

  // Fetch real data from APIs
  const { data: batchesResponse } = useGetAllBatches();
  const { data: farmsResponse } = useGetUserFarms("all");

  // Only keep ACTIVE batches globally so completed ones are never selectable
  const activeBatches = (batchesResponse?.data || []).filter(
    (batch: any) => batch.status === "ACTIVE"
  );
  const farms = farmsResponse?.data || [];

  const [isFarmsOpen, setIsFarmsOpen] = useState(false);
  const [isBatchesOpen, setIsBatchesOpen] = useState(false);
  const [isMoneyToReceiveOpen, setIsMoneyToReceiveOpen] = useState(false);
  const [isMoneyToPayOpen, setIsMoneyToPayOpen] = useState(false);

  // Dashboard statistics
  const {
    lifetimeProfit,
    monthlyRevenue,
    monthlyRevenueGrowth,
    moneyToReceive,
    moneyToGive,
    totalExpenses,
    recentActivity,
    isLoading: statsLoading,
    error: statsError,
  } = useDashboardStats();

  // Money details queries
  const { data: moneyToReceiveData, isLoading: moneyToReceiveLoading } =
    useGetMoneyToReceiveDetails(
      // if path is /farmer/dashboard/home, then enable
      1,
      10,
      {
        enabled: window.location.pathname === "/farmer/dashboard/home",
      }
    );
  const { data: moneyToPayData, isLoading: moneyToPayLoading } =
    useGetMoneyToPayDetails(1, 10, {
      enabled: window.location.pathname === "/farmer/dashboard/home",
    });

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          {t("farmer.dashboard.welcome", { name: user?.name || "" })}
        </h1>
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
                        days: Math.floor(
                          (new Date().getTime() - new Date(batch.startDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        ),
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
      <StatsCards
        farms={farms}
        activeBatches={activeBatches}
        lifetimeProfit={lifetimeProfit}
        monthlyRevenue={monthlyRevenue}
        monthlyRevenueGrowth={monthlyRevenueGrowth}
        moneyToReceive={moneyToReceive}
        moneyToGive={moneyToGive}
        totalExpenses={totalExpenses}
        statsLoading={statsLoading}
        onFarmsClick={() => setIsFarmsOpen(true)}
        onBatchesClick={() => setIsBatchesOpen(true)}
        onMoneyToReceiveClick={() => setIsMoneyToReceiveOpen(true)}
        onMoneyToPayClick={() => setIsMoneyToPayOpen(true)}
      />

      {/* Batch Performance Overview + Reminders (50/50) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-w-0">
          <BatchPerformanceTable />
        </div>
        <div className="min-w-0">
          <ReminderCard />
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivity
        recentActivity={recentActivity}
        statsLoading={statsLoading}
        statsError={statsError}
      />

      {/* Money to Receive Details Modal */}
      <MoneyDetailsModal
        isOpen={isMoneyToReceiveOpen}
        onClose={() => setIsMoneyToReceiveOpen(false)}
        title={t("farmer.dashboard.moneyToReceive")}
        icon="💰"
        isLoading={moneyToReceiveLoading}
        data={moneyToReceiveData?.data}
        type="receive"
      />

      {/* Money to Pay Details Modal */}
      <MoneyDetailsModal
        isOpen={isMoneyToPayOpen}
        onClose={() => setIsMoneyToPayOpen(false)}
        title={t("farmer.dashboard.moneyToPay")}
        icon="💳"
        isLoading={moneyToPayLoading}
        data={moneyToPayData?.data}
        type="pay"
      />

      <TodayExpenses />
    </div>
  );
}
