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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          onClick={onFarmsClick}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Farms</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{farms.length}</div>
            <p className="text-xs text-muted-foreground">
              Total farm locations
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={onBatchesClick}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Batches
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBatches.length}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Lifetime Profit
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `₹${Number(lifetimeProfit).toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">All-time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `₹${Number(monthlyRevenue).toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthlyRevenueGrowth > 0 ? "+" : ""}
              {monthlyRevenueGrowth.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Money Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          onClick={onMoneyToReceiveClick}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Money to Receive
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `₹${Number(moneyToReceive).toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">From credit sales</p>
          </CardContent>
        </Card>

        <Card
          onClick={onMoneyToPayClick}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Money to Give</CardTitle>
            <CreditCard className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `₹${Number(moneyToGive).toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              To suppliers & dealers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `₹${Number(totalExpenses).toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
