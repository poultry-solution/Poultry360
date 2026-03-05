"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Plus, Loader2, PlusCircle } from "lucide-react";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DateInput } from "@/common/components/ui/date-input";
import {
  useGetEggProductionByBatch,
  useCreateEggProduction,
  useDeleteEggProduction,
} from "@/fetchers/batches/batchQueries";
import {
  useGetEggTypes,
  useCreateEggType,
} from "@/fetchers/eggTypes/eggTypeQueries";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";

interface EggProductionTabProps {
  batchId: string;
  isBatchClosed: boolean;
}

export function EggProductionTab({ batchId, isBatchClosed }: EggProductionTabProps) {
  const { data, isLoading, error } = useGetEggProductionByBatch(batchId);
  const { data: eggTypesData } = useGetEggTypes({ enabled: true });
  const eggTypes = eggTypesData?.data ?? [];

  const createMutation = useCreateEggProduction(batchId);
  const deleteMutation = useDeleteEggProduction(batchId);
  const createTypeMutation = useCreateEggType();

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [countByType, setCountByType] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeCode, setNewTypeCode] = useState("");
  const [addTypeError, setAddTypeError] = useState("");

  const records = data?.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const counts: Record<string, number> = {};
    let total = 0;
    for (const t of eggTypes) {
      const v = parseInt(countByType[t.id] ?? "0", 10) || 0;
      counts[t.id] = v;
      total += v;
    }
    if (total <= 0) {
      setFormError("Enter at least one count.");
      return;
    }
    try {
      const dateOnly = date.includes("T") ? date.split("T")[0] : date;
      await createMutation.mutateAsync({
        date: `${dateOnly}T00:00:00.000Z`,
        countByType: counts,
      });
      setCountByType({});
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Failed to save.");
    }
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddTypeError("");
    const name = newTypeName.trim();
    const code = (newTypeCode.trim() || name.toUpperCase().replace(/\s+/g, "_")).toUpperCase().replace(/\s+/g, "_");
    if (!name) {
      setAddTypeError("Name is required.");
      return;
    }
    try {
      await createTypeMutation.mutateAsync({ name, code, displayOrder: eggTypes.length });
      setNewTypeName("");
      setNewTypeCode("");
      setIsAddTypeOpen(false);
    } catch (err: any) {
      setAddTypeError(err?.response?.data?.message || "Failed to add type.");
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

  const getCountForRecord = (r: any, eggTypeId: string) => {
    const entry = r.entries?.find((e: any) => e.eggTypeId === eggTypeId);
    return entry?.count ?? 0;
  };

  const getTotalForRecord = (r: any) => {
    return (r.entries ?? []).reduce((sum: number, e: any) => sum + (e.count ?? 0), 0);
  };

  // Totals across all records: per egg type and grand total
  const totalsByType = React.useMemo(() => {
    const byType: Record<string, number> = {};
    for (const t of eggTypes) {
      byType[t.id] = records.reduce(
        (sum: number, r: any) => sum + getCountForRecord(r, t.id),
        0
      );
    }
    return byType;
  }, [records, eggTypes]);

  const grandTotal = React.useMemo(
    () => Object.values(totalsByType).reduce((a, b) => a + b, 0),
    [totalsByType]
  );

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>Egg Production</CardTitle>
          <CardDescription>
            Daily egg count by category. Add your own egg types below. Records increase your egg inventory.
          </CardDescription>
        </div>
        {!isBatchClosed && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddTypeOpen(true)}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add type
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {!isBatchClosed && eggTypes.length > 0 && (
          <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-4">
            <h4 className="font-medium">Add daily production</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-wrap">
              <div>
                <DateInput
                  label="Date"
                  value={date}
                  onChange={(v) => setDate(v.includes("T") ? v.split("T")[0] : v)}
                />
              </div>
              {eggTypes.map((t) => (
                <div key={t.id}>
                  <Label htmlFor={`ep-${t.id}`}>{t.name}</Label>
                  <Input
                    id={`ep-${t.id}`}
                    type="number"
                    min={0}
                    value={countByType[t.id] ?? ""}
                    onChange={(e) =>
                      setCountByType((prev) => ({ ...prev, [t.id]: e.target.value }))
                    }
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
              ))}
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

        {!isBatchClosed && eggTypes.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            <p className="mb-2">No egg types yet. Add at least one type to record production.</p>
            <Button type="button" variant="outline" onClick={() => setIsAddTypeOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add type
            </Button>
          </div>
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
                  {eggTypes.map((t) => (
                    <th key={t.id} className="text-right px-4 py-2">
                      {t.name}
                    </th>
                  ))}
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
                      {eggTypes.map((t) => (
                        <td key={t.id} className="px-4 py-2 text-right">
                          {getCountForRecord(r, t.id)}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right font-medium">
                        {getTotalForRecord(r)}
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
              <tfoot>
                <tr className="bg-muted/60 border-t-2 border-muted-foreground/30 font-semibold">
                  <td className="px-4 py-3 text-left">Total</td>
                  {eggTypes.map((t) => (
                    <td key={t.id} className="px-4 py-3 text-right">
                      {(totalsByType[t.id] ?? 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">{grandTotal.toLocaleString()}</td>
                  {!isBatchClosed && <td className="px-4 py-3" />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>

      <Modal
        isOpen={isAddTypeOpen}
        onClose={() => {
          setIsAddTypeOpen(false);
          setAddTypeError("");
          setNewTypeName("");
          setNewTypeCode("");
        }}
        title="Add egg type"
      >
        <form onSubmit={handleAddType}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-type-name">Name</Label>
                <Input
                  id="new-type-name"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g. Large, XL"
                />
              </div>
              <div>
                <Label htmlFor="new-type-code">Code (optional)</Label>
                <Input
                  id="new-type-code"
                  value={newTypeCode}
                  onChange={(e) => setNewTypeCode(e.target.value)}
                  placeholder="e.g. LARGE, XL (auto from name if empty)"
                />
              </div>
              {addTypeError && <p className="text-sm text-red-600">{addTypeError}</p>}
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddTypeOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTypeMutation.isPending}>
              {createTypeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Add type
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </Card>
  );
}
