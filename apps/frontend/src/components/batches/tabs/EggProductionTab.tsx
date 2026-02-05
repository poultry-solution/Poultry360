"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { DateDisplay } from "@/common/components/ui/date-display";
import {
  useGetEggProductionByBatch,
  useCreateEggProduction,
  useDeleteEggProduction,
} from "@/fetchers/batches/batchQueries";

interface EggProductionTabProps {
  batchId: string;
  isBatchClosed: boolean;
}

export function EggProductionTab({ batchId, isBatchClosed }: EggProductionTabProps) {
  const { data, isLoading, error } = useGetEggProductionByBatch(batchId);
  const createMutation = useCreateEggProduction(batchId);
  const deleteMutation = useDeleteEggProduction(batchId);

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [largeCount, setLargeCount] = useState("");
  const [mediumCount, setMediumCount] = useState("");
  const [smallCount, setSmallCount] = useState("");
  const [formError, setFormError] = useState("");

  const records = data?.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const large = parseInt(largeCount, 10) || 0;
    const medium = parseInt(mediumCount, 10) || 0;
    const small = parseInt(smallCount, 10) || 0;
    if (large + medium + small <= 0) {
      setFormError("Enter at least one count (Large, Medium, or Small).");
      return;
    }
    try {
      await createMutation.mutateAsync({
        date: `${date}T00:00:00.000Z`,
        largeCount: large,
        mediumCount: medium,
        smallCount: small,
      });
      setLargeCount("");
      setMediumCount("");
      setSmallCount("");
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Failed to save.");
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm("Remove this production record? Egg inventory will be reduced.")) return;
    try {
      await deleteMutation.mutateAsync(recordId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Egg Production</CardTitle>
          <CardDescription>
            Daily egg count by category (Large / Medium / Small). Records increase your egg inventory.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isBatchClosed && (
          <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-4">
            <h4 className="font-medium">Add daily production</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="ep-date">Date</Label>
                <Input
                  id="ep-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="ep-large">Large</Label>
                <Input
                  id="ep-large"
                  type="number"
                  min={0}
                  value={largeCount}
                  onChange={(e) => setLargeCount(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="ep-medium">Medium</Label>
                <Input
                  id="ep-medium"
                  type="number"
                  min={0}
                  value={mediumCount}
                  onChange={(e) => setMediumCount(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="ep-small">Small</Label>
                <Input
                  id="ep-small"
                  type="number"
                  min={0}
                  value={smallCount}
                  onChange={(e) => setSmallCount(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add record
            </Button>
          </form>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">Failed to load egg production records.</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No egg production records yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-y">
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-right px-4 py-2">Large</th>
                  <th className="text-right px-4 py-2">Medium</th>
                  <th className="text-right px-4 py-2">Small</th>
                  <th className="text-right px-4 py-2">Total</th>
                  {!isBatchClosed && <th className="text-right px-4 py-2">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...records]
                  .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <DateDisplay date={r.date} format="short" />
                      </td>
                      <td className="px-4 py-2 text-right">{r.largeCount}</td>
                      <td className="px-4 py-2 text-right">{r.mediumCount}</td>
                      <td className="px-4 py-2 text-right">{r.smallCount}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        {r.largeCount + r.mediumCount + r.smallCount}
                      </td>
                      {!isBatchClosed && (
                        <td className="px-4 py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(r.id)}
                            disabled={deleteMutation.isPending}
                          >
                            Remove
                          </Button>
                        </td>
                      )}
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
