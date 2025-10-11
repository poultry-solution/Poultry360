import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";

interface MortalityTabProps {
  isBatchClosed: boolean;
  mortalityLoading: boolean;
  mortalityError: any;
  batchMortalities: any[];
  mortalityStats: any;
  mortalityColumns: any[];
  openNewMortality: () => void;
}

export function MortalityTab({
  isBatchClosed,
  mortalityLoading,
  mortalityError,
  batchMortalities,
  mortalityStats,
  mortalityColumns,
  openNewMortality,
}: MortalityTabProps) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Mortality Records</CardTitle>
          <CardDescription>
            Track natural deaths and disease-related losses
          </CardDescription>
        </div>
        {!isBatchClosed && (
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={openNewMortality}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Mortality
          </Button>
        )}
        {isBatchClosed && (
          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
            Batch Closed - No New Entries
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {mortalityLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading mortality records...</span>
          </div>
        ) : mortalityError ? (
          <div className="text-center py-8">
            <p className="text-red-600">
              Failed to load mortality records. Please try again.
            </p>
          </div>
        ) : (
          <>
            {mortalityStats && (
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-600">
                      Natural Deaths
                    </div>
                    <div className="text-lg font-semibold text-red-600">
                      {mortalityStats.totalMortality || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      (Excluding sales)
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">
                      Current Birds
                    </div>
                    <div className="text-lg font-semibold text-green-600">
                      {mortalityStats.currentBirds || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      (After all losses)
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">
                      Mortality Rate
                    </div>
                    <div
                      className={`text-lg font-semibold ${Number(mortalityStats.mortalityRate) > 10 ? "text-red-600" : Number(mortalityStats.mortalityRate) > 5 ? "text-orange-600" : "text-green-600"}`}
                    >
                      {mortalityStats.mortalityRate}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      (Natural only)
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">
                      Total Records
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {batchMortalities.length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      (Disease/Natural)
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DataTable
              data={batchMortalities}
              columns={mortalityColumns}
              showFooter={mortalityStats ? true : false}
              footerContent={
                mortalityStats ? (
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">
                      Total Natural Deaths
                    </span>
                    <span className="font-bold text-lg text-red-600">
                      {mortalityStats.totalMortality || 0} birds
                    </span>
                  </div>
                ) : undefined
              }
              emptyMessage="No mortality records yet"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
