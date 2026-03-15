"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Label } from "@/common/components/ui/label";
import { Input } from "@/common/components/ui/input";
import { DateInput } from "@/common/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  useGetCompanyPurchasesAggregated,
  type AggregatedPurchaseRow,
} from "@/fetchers/company/companyPurchaseQueries";
import { useCreateProductionRun } from "@/fetchers/company/companyProductionQueries";
import { toast } from "sonner";

const formatCurrency = (n: number | string) =>
  `रू ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

function bucketKey(row: { rawMaterialId: string; supplierId: string; unitPrice: number }) {
  return `${row.rawMaterialId}|${row.supplierId}|${row.unitPrice}`;
}

type InputLine = { rawMaterialId: string; supplierId: string; unitPrice: number; quantity: number };
type OutputLine = { productName: string; quantity: number; unit: string };

export default function NewProductionPage() {
  const router = useRouter();
  const { data: aggregatedData } = useGetCompanyPurchasesAggregated();
  const createMutation = useCreateProductionRun();

  const buckets: AggregatedPurchaseRow[] = aggregatedData?.data ?? [];
  const bucketsWithStock = buckets.filter((b) => Number(b.remainingQuantity ?? b.totalQuantity ?? 0) > 0);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [inputLines, setInputLines] = useState<InputLine[]>([
    { rawMaterialId: "", supplierId: "", unitPrice: 0, quantity: 0 },
  ]);
  const [outputLines, setOutputLines] = useState<OutputLine[]>([
    { productName: "", quantity: 0, unit: "kg" },
  ]);

  const addInputLine = () => {
    setInputLines((prev) => [...prev, { rawMaterialId: "", supplierId: "", unitPrice: 0, quantity: 0 }]);
  };
  const updateInputLine = (index: number, updates: Partial<InputLine>) => {
    setInputLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };
  const removeInputLine = (index: number) => {
    setInputLines((prev) => prev.filter((_, i) => i !== index));
  };

  const setInputLineBucket = (index: number, key: string) => {
    const row = buckets.find((b) => bucketKey(b) === key);
    if (row) {
      updateInputLine(index, {
        rawMaterialId: row.rawMaterialId,
        supplierId: row.supplierId,
        unitPrice: row.unitPrice,
        quantity: inputLines[index]?.quantity ?? 0,
      });
    }
  };

  const addOutputLine = () => {
    setOutputLines((prev) => [...prev, { productName: "", quantity: 0, unit: "kg" }]);
  };
  const updateOutputLine = (index: number, updates: Partial<OutputLine>) => {
    setOutputLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };
  const removeOutputLine = (index: number) => {
    setOutputLines((prev) => prev.filter((_, i) => i !== index));
  };

  const validInputs = inputLines.filter(
    (l) => l.rawMaterialId && l.supplierId && l.quantity > 0
  );
  const validOutputs = outputLines.filter(
    (l) => l.productName.trim() && l.quantity > 0
  );

  const getAvailableForLine = (line: InputLine) => {
    const row = buckets.find(
      (b) => b.rawMaterialId === line.rawMaterialId && b.supplierId === line.supplierId && b.unitPrice === line.unitPrice
    );
    return Number(row?.remainingQuantity ?? row?.totalQuantity ?? 0);
  };

  const getLineBucketKey = (line: InputLine) => {
    if (!line.rawMaterialId || !line.supplierId) return "";
    return bucketKey(line);
  };

  const handleSubmit = async () => {
    if (validInputs.length === 0) {
      toast.error("Add at least one item (from purchases list) with quantity");
      return;
    }
    if (validOutputs.length === 0) {
      toast.error("Add at least one produced item with name and quantity");
      return;
    }
    for (const inp of validInputs) {
      const available = getAvailableForLine(inp);
      if (available < inp.quantity) {
        const row = buckets.find(
          (b) => b.rawMaterialId === inp.rawMaterialId && b.supplierId === inp.supplierId
        );
        toast.error(
          `Insufficient quantity for ${row?.rawMaterial?.name ?? "item"} (${row?.supplier?.name ?? ""}). Available: ${available}`
        );
        return;
      }
    }
    try {
      await createMutation.mutateAsync({
        date: date || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        inputs: validInputs.map((l) => ({
          rawMaterialId: l.rawMaterialId,
          supplierId: l.supplierId,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
        })),
        outputs: validOutputs.map((l) => ({
          productName: l.productName.trim(),
          quantity: l.quantity,
          unit: l.unit.trim() || "kg",
        })),
      });
      toast.success("Production run recorded. Inventory updated.");
      router.push("/company/dashboard/production");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message ?? "Failed to record production");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/company/dashboard/production">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add production run</CardTitle>
          <CardDescription>
            Use raw materials (stock will decrease) and log what you produced.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <DateInput
                label="Date"
                value={date || ""}
                onChange={(v) =>
                  setDate(v && v.includes("T") ? v.split("T")[0] : v || "")
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Reference (optional)</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. RUN-001"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              className="mt-1"
            />
          </div>

          {/* Inputs: same list as Purchases page (item + supplier + rate), remaining qty per bucket */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Items used (from purchases inventory)</h3>
              <Button type="button" variant="outline" size="sm" onClick={addInputLine}>
                <Plus className="h-4 w-4 mr-1" />
                Add input
              </Button>
            </div>
            {bucketsWithStock.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No inventory yet. Record purchases first, then use them here.
              </p>
            )}
            <div className="border rounded-md divide-y">
              {inputLines.map((line, index) => (
                <div
                  key={index}
                  className="p-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
                >
                  <div className="sm:col-span-5">
                    <Label className="text-xs">Item (supplier · rate)</Label>
                    <Select
                      value={getLineBucketKey(line)}
                      onValueChange={(v) => setInputLineBucket(index, v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select from purchases list" />
                      </SelectTrigger>
                      <SelectContent>
                        {bucketsWithStock.map((b) => (
                          <SelectItem key={bucketKey(b)} value={bucketKey(b)}>
                            {b.rawMaterial.name} — {b.supplier.name} — {formatCurrency(b.unitPrice)}/{b.rawMaterial.unit} — Available:{" "}
                            {Number(b.remainingQuantity ?? b.totalQuantity).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-3">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={line.quantity || ""}
                      onChange={(e) =>
                        updateInputLine(index, { quantity: Number(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-3 text-sm text-muted-foreground flex items-center h-9">
                    {line.rawMaterialId && line.supplierId && (
                      <span>Available: {getAvailableForLine(line)}</span>
                    )}
                  </div>
                  <div className="sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInputLine(index)}
                      disabled={inputLines.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Outputs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Produced items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addOutputLine}>
                <Plus className="h-4 w-4 mr-1" />
                Add line
              </Button>
            </div>
            <div className="border rounded-md divide-y">
              {outputLines.map((line, index) => (
                <div
                  key={index}
                  className="p-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
                >
                  <div className="sm:col-span-4">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={line.productName}
                      onChange={(e) =>
                        updateOutputLine(index, { productName: e.target.value })
                      }
                      placeholder="e.g. B1, Broiler Feed"
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={line.quantity || ""}
                      onChange={(e) =>
                        updateOutputLine(index, {
                          quantity: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Label className="text-xs">Unit</Label>
                    <Input
                      value={line.unit}
                      onChange={(e) => updateOutputLine(index, { unit: e.target.value })}
                      placeholder="kg"
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOutputLine(index)}
                      disabled={outputLines.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={
                createMutation.isPending ||
                validInputs.length === 0 ||
                validOutputs.length === 0
              }
            >
              {createMutation.isPending ? "Saving..." : "Record production"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/company/dashboard/production">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
