"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Building2,
  Layers,
  TrendingUp,
  DollarSign,
  CreditCard,
  Receipt,
} from "lucide-react";

interface StatsCardsProps {
  farms: any[];
  activeBatches: any[];
  lifetimeProfit: number;
  monthlyRevenue: number;
  monthlyRevenueGrowth: number;
  moneyToReceive: number;
  moneyToGive: number;
  totalExpenses: number;
  statsLoading: boolean;
  onFarmsClick: () => void;
  onBatchesClick: () => void;
  onMoneyToReceiveClick: () => void;
  onMoneyToPayClick: () => void;
}

export function StatsCards({
  farms,
  activeBatches,
  lifetimeProfit,
  monthlyRevenue,
  monthlyRevenueGrowth,
  moneyToReceive,
  moneyToGive,
  totalExpenses,
  statsLoading,
  onFarmsClick,
  onBatchesClick,
  onMoneyToReceiveClick,
  onMoneyToPayClick,
}: StatsCardsProps) {
  return (
    <>
      {/* Main Stats Cards */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Card
          onClick={onFarmsClick}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[11px] md:text-sm font-medium">Farms</CardTitle>
            <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{farms.length}</div>
            <p className="text-[9px] md:text-xs text-muted-foreground">
              Total locations
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={onBatchesClick}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[11px] md:text-sm font-medium">
              Batches
            </CardTitle>
            <Layers className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{activeBatches.length}</div>
            <p className="text-[9px] md:text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[11px] md:text-sm font-medium">
              Profit
            </CardTitle>
            <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">
              {statsLoading ? (
                <div className="h-5 md:h-8 w-14 md:w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `रू${Number(lifetimeProfit).toLocaleString()}`
              )}
            </div>
            <p className="text-[9px] md:text-xs text-muted-foreground">All-time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[11px] md:text-sm font-medium">
              Revenue
            </CardTitle>
            <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">
              {statsLoading ? (
                <div className="h-5 md:h-8 w-14 md:w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `रू${Number(monthlyRevenue).toLocaleString()}`
              )}
            </div>
            <p className="text-[9px] md:text-xs text-muted-foreground">
              <span className="hidden sm:inline">{monthlyRevenueGrowth > 0 ? "+" : ""}{monthlyRevenueGrowth.toFixed(1)}% </span>This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Money Stats Cards */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
        <Card
          onClick={onMoneyToReceiveClick}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[11px] md:text-sm font-medium">
              To Receive
            </CardTitle>
            <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-green-600">
              {statsLoading ? (
                <div className="h-5 md:h-8 w-14 md:w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `रू${Number(moneyToReceive).toLocaleString()}`
              )}
            </div>
            <p className="text-[9px] md:text-xs text-muted-foreground">Credit sales</p>
          </CardContent>
        </Card>

        <Card
          onClick={onMoneyToPayClick}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[11px] md:text-sm font-medium">To Pay</CardTitle>
            <CreditCard className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-600" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-red-600">
              {statsLoading ? (
                <div className="h-5 md:h-8 w-14 md:w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `रू${Number(moneyToGive).toLocaleString()}`
              )}
            </div>
            <p className="text-[9px] md:text-xs text-muted-foreground">
              Suppliers
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[11px] md:text-sm font-medium">
              Expenses
            </CardTitle>
            <Receipt className="h-3.5 w-3.5 md:h-4 md:w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-orange-600">
              {statsLoading ? (
                <div className="h-5 md:h-8 w-14 md:w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `रू${Number(totalExpenses).toLocaleString()}`
              )}
            </div>
            <p className="text-[9px] md:text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
