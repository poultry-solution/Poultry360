import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { DateDisplay } from "@/common/components/ui/date-display";
import WeightGrowthChart from "@/components/charts/WeightGrowthChart";

interface GrowthTabProps {
  isBatchClosed: boolean;
  weightsLoading: boolean;
  weightsError: any;
  weights: any[];
  growthChartData: any;
  setIsWeightModalOpen: (open: boolean) => void;
}

export function GrowthTab({
  isBatchClosed,
  weightsLoading,
  weightsError,
  weights,
  growthChartData,
  setIsWeightModalOpen,
}: GrowthTabProps) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Growth (Weights)</CardTitle>
          <CardDescription>
            Track average bird weight over time
          </CardDescription>
        </div>
        {!isBatchClosed && (
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={() => setIsWeightModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Record Weight
          </Button>
        )}
        {isBatchClosed && (
          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
            Batch Closed - No New Entries
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div className="mb-6">
          <WeightGrowthChart data={growthChartData} />
        </div>
        {weightsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading weights...</span>
          </div>
        ) : weightsError ? (
          <div className="text-center py-8">
            <p className="text-red-600">Failed to load weights.</p>
          </div>
        ) : weights.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No weight records yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {(() => {
              const weightsAsc = [...weights].sort(
                (a: any, b: any) =>
                  new Date(a.date).getTime() - new Date(b.date).getTime()
              );
              return (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-y">
                      <th className="text-left px-4 py-2">Date</th>
                      <th className="text-right px-4 py-2">
                        Avg Weight (kg)
                      </th>
                      <th className="text-right px-4 py-2">Sample Size</th>
                      <th className="text-left px-4 py-2">Source</th>
                      <th className="text-left px-4 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {weightsAsc.map((w: any) => (
                      <tr key={w.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2">
                          <DateDisplay date={w.date} format="short" />
                        </td>
                        <td className="px-4 py-2 text-right">
                          {Number(w.avgWeight).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {w.sampleCount}
                        </td>
                        <td className="px-4 py-2">
                          <Badge
                            variant="secondary"
                            className={
                              w.source === "SALE"
                                ? "bg-green-100 text-green-800"
                                : w.source === "MANUAL"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }
                          >
                            {w.source}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">{w.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
