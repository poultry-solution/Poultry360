"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { useGetBatchPerformance } from "@/fetchers/dashboard/dashboardQueries";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { DateDisplay } from "@/common/components/ui/date-display";

export function BatchPerformanceTable() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'COMPLETED' | 'ALL'>('ALL');
  const [sortConfig, setSortConfig] = useState({ field: 'startDate', order: 'desc' as 'asc' | 'desc' });
  
  const { data, isLoading } = useGetBatchPerformance(
    statusFilter === 'ALL' ? undefined : statusFilter,
    sortConfig.field,
    sortConfig.order
  );

  const batches = data?.data || [];

  const handleSort = (field: string) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (field: string) => {
    if (sortConfig.field !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortConfig.order === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  const handleRowClick = (batchId: string) => {
    router.push(`/dashboard/batches/${batchId}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Batch Performance Overview</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ALL')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ACTIVE')}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('COMPLETED')}
            >
              Completed
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading batch data...</div>
        ) : batches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No batches found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('batchNumber')}>
                    <div className="flex items-center gap-2">
                      Batch Name {getSortIcon('batchNumber')}
                    </div>
                  </th>
                  <th className="text-left p-3 font-semibold cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('startDate')}>
                    <div className="flex items-center gap-2">
                      Days {getSortIcon('startDate')}
                    </div>
                  </th>
                  <th className="text-right p-3 font-semibold cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('mortality')}>
                    <div className="flex items-center justify-end gap-2">
                      Mortality {getSortIcon('mortality')}
                    </div>
                  </th>
                  <th className="text-right p-3 font-semibold cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('fcr')}>
                    <div className="flex items-center justify-end gap-2">
                      FCR {getSortIcon('fcr')}
                    </div>
                  </th>
                  <th className="text-right p-3 font-semibold cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('expenses')}>
                    <div className="flex items-center justify-end gap-2">
                      Expenses {getSortIcon('expenses')}
                    </div>
                  </th>
                  <th className="text-right p-3 font-semibold cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('salesAmount')}>
                    <div className="flex items-center justify-end gap-2">
                      Sales {getSortIcon('salesAmount')}
                    </div>
                  </th>
                  <th className="text-right p-3 font-semibold cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('avgWeight')}>
                    <div className="flex items-center justify-end gap-2">
                      Avg Wt (kg) {getSortIcon('avgWeight')}
                    </div>
                  </th>
                  <th className="text-right p-3 font-semibold cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('profitLoss')}>
                    <div className="flex items-center justify-end gap-2">
                      Profit/Loss {getSortIcon('profitLoss')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch: any) => (
                  <tr
                    key={batch.id}
                    onClick={() => handleRowClick(batch.id)}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{batch.batchNumber}</div>
                        <div className="text-xs text-muted-foreground">{batch.farmName}</div>
                      </div>
                    </td>
                    <td className="p-3 text-left">{batch.days}</td>
                    <td className="p-3 text-right">
                      <div>{batch.mortality}</div>
                      <div className="text-xs text-muted-foreground">({batch.mortalityRate}%)</div>
                    </td>
                    <td className="p-3 text-right">{batch.fcr}</td>
                    <td className="p-3 text-right">₹{Number(batch.expenses).toLocaleString()}</td>
                    <td className="p-3 text-right">₹{Number(batch.salesAmount).toLocaleString()}</td>
                    <td className="p-3 text-right">{batch.avgWeight}</td>
                    <td className={`p-3 text-right font-semibold ${
                      batch.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₹{Number(batch.profitLoss).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
