"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { DateInput } from "@/common/components/ui/date-input";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { getTodayLocalDate } from "@/common/lib/utils";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import type { CreateMaterialProductionInput } from "@/fetchers/production/materialProductionTypes";

export interface ProductionMaterialOption {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  unitCost: number;
  subtitle?: string;
}

export interface ProductionProductOption {
  id: string;
  name: string;
  unit: string;
  currentStock?: number;
  subtitle?: string;
}

interface InputLine {
  inventoryItemId: string;
  quantity: number;
  label: string;
  unit: string;
  stock: number;
  unitCost: number;
}

interface OutputLine {
  productId: string;
  quantity: number;
  costAllocationPercent: number;
  label: string;
  unit: string;
}

interface MaterialProductionFormProps {
  backHref: string;
  inventoryHref: string;
  materials: ProductionMaterialOption[];
  products: ProductionProductOption[];
  isLoadingMaterials?: boolean;
  isLoadingProducts?: boolean;
  isSubmitting?: boolean;
  onMaterialSearch?: (query: string) => void;
  onProductSearch?: (query: string) => void;
  onSubmit: (input: CreateMaterialProductionInput) => Promise<void>;
}

const emptyInput = (): InputLine => ({
  inventoryItemId: "",
  quantity: 0,
  label: "",
  unit: "",
  stock: 0,
  unitCost: 0,
});
const emptyOutput = (): OutputLine => ({
  productId: "",
  quantity: 0,
  costAllocationPercent: 100,
  label: "",
  unit: "",
});

const distributeCostAllocationEvenly = (
  rows: OutputLine[]
): OutputLine[] => {
  if (rows.length === 0) return rows;

  // Allocate in basis points so the displayed values always total exactly 100%.
  const totalBasisPoints = 10_000;
  const baseShare = Math.floor(totalBasisPoints / rows.length);
  const remainder = totalBasisPoints - baseShare * rows.length;

  return rows.map((row, index) => ({
    ...row,
    costAllocationPercent:
      (baseShare + (index < remainder ? 1 : 0)) / 100,
  }));
};

const money = (value: number) =>
  `Rs. ${value.toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function MaterialProductionForm({
  backHref,
  inventoryHref,
  materials,
  products,
  isLoadingMaterials = false,
  isLoadingProducts = false,
  isSubmitting = false,
  onMaterialSearch,
  onProductSearch,
  onSubmit,
}: MaterialProductionFormProps) {
  const [date, setDate] = useState(getTodayLocalDate);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [inputs, setInputs] = useState<InputLine[]>([emptyInput()]);
  const [outputs, setOutputs] = useState<OutputLine[]>([emptyOutput()]);

  const materialOptions = materials.map((item) => ({
    value: item.id,
    label: item.name,
    subtitle:
      item.subtitle ??
      `${item.currentStock} ${item.unit} available · ${money(item.unitCost)}/${item.unit}`,
    data: item,
  }));
  const productOptions = products.map((product) => ({
    value: product.id,
    label: product.name,
    subtitle:
      product.subtitle ??
      `${product.unit}${product.currentStock === undefined ? "" : ` · ${product.currentStock} currently in stock`}`,
    data: product,
  }));

  const totalInputCost = useMemo(
    () =>
      inputs.reduce(
        (sum, line) => sum + line.quantity * line.unitCost,
        0
      ),
    [inputs]
  );
  const allocationTotal = outputs.reduce(
    (sum, line) => sum + Number(line.costAllocationPercent || 0),
    0
  );
  const updateInput = (index: number, patch: Partial<InputLine>) =>
    setInputs((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    );
  const updateOutput = (index: number, patch: Partial<OutputLine>) =>
    setOutputs((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    );

  const submit = async () => {
    const validInputs = inputs.filter(
      (line) => line.inventoryItemId && line.quantity > 0
    );
    const validOutputs = outputs.filter(
      (line) =>
        line.productId && line.quantity > 0 && line.costAllocationPercent > 0
    );
    if (!validInputs.length || !validOutputs.length) {
      toast.error("Add at least one valid raw material and product");
      return;
    }
    if (Math.abs(allocationTotal - 100) > 0.0001) {
      toast.error("Output cost allocations must total 100%");
      return;
    }

    const requiredByLot = new Map<string, number>();
    for (const line of validInputs) {
      requiredByLot.set(
        line.inventoryItemId,
        (requiredByLot.get(line.inventoryItemId) ?? 0) + line.quantity
      );
    }
    for (const [id, required] of requiredByLot) {
      const line = validInputs.find((input) => input.inventoryItemId === id)!;
      if (required > line.stock) {
        toast.error(
          `Insufficient stock for ${line.label}. Available: ${line.stock}`
        );
        return;
      }
    }

    await onSubmit({
      date,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      inputs: validInputs.map(({ inventoryItemId, quantity }) => ({
        inventoryItemId,
        quantity,
      })),
      outputs: validOutputs.map(
        ({ productId, quantity, costAllocationPercent }) => ({
          productId,
          quantity,
          costAllocationPercent,
        })
      ),
    });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={backHref}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Add Production Run</CardTitle>
          <CardDescription>
            Consume raw-material lots and add the produced items to inventory as
            Self Feed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid items-end gap-4 md:grid-cols-2">
            <DateInput label="Date" value={date} onChange={setDate} />
            <div className="space-y-2">
              <Label htmlFor="production-reference">Reference (optional)</Label>
              <Input
                id="production-reference"
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="e.g. RUN-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="production-notes">Notes (optional)</Label>
            <Input
              id="production-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notes about this production run"
            />
          </div>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Raw Materials Used</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInputs((rows) => [...rows, emptyInput()])}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Material
              </Button>
            </div>

            <div className="space-y-3">
              {inputs.map((line, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 items-start gap-3 rounded-lg border p-3 lg:grid-cols-12"
                >
                  <div className="min-w-0 space-y-2 lg:col-span-5">
                    <Label className="block text-xs">Raw material lot</Label>
                    <SearchableSelect<ProductionMaterialOption>
                      value={line.inventoryItemId}
                      displayValue={line.label}
                      options={materialOptions}
                      isLoading={isLoadingMaterials}
                      onSearch={onMaterialSearch}
                      placeholder="Search raw materials"
                      searchPlaceholder="Name, supplier, or rate..."
                      onValueChange={(id, option) =>
                        option?.data
                          ? updateInput(index, {
                              inventoryItemId: id,
                              label: option.data.name,
                              unit: option.data.unit,
                              stock: option.data.currentStock,
                              unitCost: option.data.unitCost,
                            })
                          : updateInput(index, emptyInput())
                      }
                    />
                  </div>

                  <div className="space-y-2 lg:col-span-3">
                    <Label className="block text-xs">
                      Quantity {line.unit && `(${line.unit})`}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={line.quantity || ""}
                      onChange={(event) =>
                        updateInput(index, {
                          quantity: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2 lg:col-span-3">
                    <Label className="block text-xs">Available stock</Label>
                    <div className="flex min-h-10 items-center rounded-md bg-muted px-3 text-sm text-muted-foreground">
                      {line.inventoryItemId
                        ? `${line.stock.toLocaleString("en-IN")} ${line.unit}`
                        : "Select a material"}
                    </div>
                  </div>

                  <div className="flex justify-end lg:col-span-1 lg:pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove raw material ${index + 1}`}
                      disabled={inputs.length === 1}
                      onClick={() =>
                        setInputs((rows) =>
                          rows.filter((_, rowIndex) => rowIndex !== index)
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Products Made</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setOutputs((rows) =>
                    distributeCostAllocationEvenly([...rows, emptyOutput()])
                  )
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Product
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Products must first be created under{" "}
              <Link href={inventoryHref} className="font-medium text-primary hover:underline">
                Inventory → Self Feed
              </Link>
              . Cost allocation is divided equally when products are added or
              removed, and can still be adjusted manually.
            </p>

            <div className="space-y-3">
              {outputs.map((line, index) => {
                const allocated =
                  (totalInputCost * Number(line.costAllocationPercent || 0)) /
                  100;
                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 items-start gap-3 rounded-lg border p-3 lg:grid-cols-12"
                  >
                    <div className="min-w-0 space-y-2 lg:col-span-4">
                      <Label className="block text-xs">Self Feed product</Label>
                      <SearchableSelect<ProductionProductOption>
                        value={line.productId}
                        displayValue={line.label}
                        options={productOptions}
                        isLoading={isLoadingProducts}
                        onSearch={onProductSearch}
                        placeholder="Search products"
                        onValueChange={(id, option) =>
                          option?.data
                            ? updateOutput(index, {
                                productId: id,
                                label: option.data.name,
                                unit: option.data.unit,
                              })
                            : updateOutput(index, {
                                productId: "",
                                label: "",
                                unit: "",
                              })
                        }
                      />
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                      <Label className="block text-xs">
                        Quantity {line.unit && `(${line.unit})`}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={line.quantity || ""}
                        onChange={(event) =>
                          updateOutput(index, {
                            quantity: Number(event.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                      <Label className="block text-xs">Cost allocation %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        placeholder="0"
                        value={line.costAllocationPercent || ""}
                        onChange={(event) =>
                          updateOutput(index, {
                            costAllocationPercent:
                              Number(event.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2 lg:col-span-3">
                      <Label className="block text-xs">Allocated cost</Label>
                      <div className="flex min-h-10 flex-col justify-center rounded-md bg-muted px-3 text-sm text-muted-foreground">
                        <span>{money(allocated)}</span>
                        {line.quantity > 0 && (
                          <span className="text-xs">
                            {money(allocated / line.quantity)}/
                            {line.unit || "unit"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end lg:col-span-1 lg:pt-5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove product ${index + 1}`}
                        disabled={outputs.length === 1}
                        onClick={() =>
                          setOutputs((rows) =>
                            distributeCostAllocationEvenly(
                              rows.filter(
                                (_, rowIndex) => rowIndex !== index
                              )
                            )
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid gap-2 rounded-lg bg-muted p-3 text-sm sm:grid-cols-2 sm:gap-6">
            <div className="flex justify-between gap-4">
              <span>Total input cost</span>
              <strong>{money(totalInputCost)}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>Allocated</span>
              <strong
                className={
                  Math.abs(allocationTotal - 100) < 0.0001
                    ? "text-emerald-600"
                    : "text-red-600"
                }
              >
                {allocationTotal}%
              </strong>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" onClick={submit} disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Record Production"}
            </Button>
            <Button variant="outline" asChild>
              <Link href={backHref}>Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
