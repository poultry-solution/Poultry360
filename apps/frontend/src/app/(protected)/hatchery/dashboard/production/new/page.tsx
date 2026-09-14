"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { DateInput } from "@/common/components/ui/date-input";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { useGetHatcheryInventory, type HatcheryInventoryItem } from "@/fetchers/hatchery/hatcheryInventoryQueries";
import { useGetHatcheryProducts, type HatcheryManufacturedProduct } from "@/fetchers/hatchery/hatcheryProductQueries";
import { useCreateHatcheryProduction } from "@/fetchers/hatchery/hatcheryProductionQueries";

type InputLine = { inventoryItemId: string; quantity: number; label: string; unit: string; stock: number; unitCost: number };
type OutputLine = { productId: string; quantity: number; costAllocationPercent: number; label: string; unit: string };

const emptyInput = (): InputLine => ({ inventoryItemId: "", quantity: 0, label: "", unit: "", stock: 0, unitCost: 0 });
const emptyOutput = (): OutputLine => ({ productId: "", quantity: 0, costAllocationPercent: 100, label: "", unit: "" });
const money = (value: number) => `Rs. ${value.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function NewHatcheryProductionPage() {
  const router = useRouter();
  const createProduction = useCreateHatcheryProduction();
  const [materialSearch, setMaterialSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const { data: inventoryRes, isLoading: inventoryLoading } = useGetHatcheryInventory({ itemType: "RAW_MATERIAL", search: materialSearch || undefined, limit: 30 });
  const { data: productsRes, isLoading: productsLoading } = useGetHatcheryProducts({ search: productSearch || undefined, limit: 30 });

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [inputs, setInputs] = useState<InputLine[]>([emptyInput()]);
  const [outputs, setOutputs] = useState<OutputLine[]>([emptyOutput()]);

  const materialOptions = ((inventoryRes?.data ?? []) as HatcheryInventoryItem[]).map((item) => ({
    value: item.id,
    label: item.name,
    subtitle: `${item.supplier?.name ?? "Supplier"} · ${Number(item.currentStock)} ${item.unit} available · ${money(Number(item.effectiveUnitCost ?? item.unitPrice))}/${item.unit}`,
    data: item,
  }));
  const productOptions = ((productsRes?.data ?? []) as HatcheryManufacturedProduct[]).map((product) => ({
    value: product.id,
    label: product.name,
    subtitle: `${product.unit} · ${Number(product.currentStock)} currently in stock`,
    data: product,
  }));

  const totalInputCost = useMemo(() => inputs.reduce((sum, line) => sum + line.quantity * line.unitCost, 0), [inputs]);
  const allocationTotal = outputs.reduce((sum, line) => sum + Number(line.costAllocationPercent || 0), 0);
  const updateInput = (index: number, patch: Partial<InputLine>) => setInputs((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  const updateOutput = (index: number, patch: Partial<OutputLine>) => setOutputs((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row));

  const submit = async () => {
    const validInputs = inputs.filter((line) => line.inventoryItemId && line.quantity > 0);
    const validOutputs = outputs.filter((line) => line.productId && line.quantity > 0 && line.costAllocationPercent > 0);
    if (!validInputs.length || !validOutputs.length) return toast.error("Add at least one valid raw material and product");
    if (Math.abs(allocationTotal - 100) > 0.0001) return toast.error("Output cost allocations must total 100%");
    const requiredByLot = new Map<string, number>();
    for (const line of validInputs) requiredByLot.set(line.inventoryItemId, (requiredByLot.get(line.inventoryItemId) ?? 0) + line.quantity);
    for (const [id, required] of requiredByLot) {
      const line = validInputs.find((input) => input.inventoryItemId === id)!;
      if (required > line.stock) return toast.error(`Insufficient stock for ${line.label}. Available: ${line.stock}`);
    }
    try {
      await createProduction.mutateAsync({
        date, referenceNumber: referenceNumber.trim() || undefined, notes: notes.trim() || undefined,
        inputs: validInputs.map(({ inventoryItemId, quantity }) => ({ inventoryItemId, quantity })),
        outputs: validOutputs.map(({ productId, quantity, costAllocationPercent }) => ({ productId, quantity, costAllocationPercent })),
      });
      toast.success("Production recorded and inventory updated");
      router.push("/hatchery/dashboard/production");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to record production");
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/hatchery/dashboard/production">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Add Production Run</CardTitle>
          <CardDescription>
            Consume purchased raw-material lots and add produced items to Self
            Made inventory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <DateInput label="Date" value={date} onChange={setDate} />
            <div>
              <Label className="mb-2 block">Reference (optional)</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. RUN-001"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
                  className="grid grid-cols-1 gap-3 rounded-lg border p-3 lg:grid-cols-12 lg:items-start"
                >
                  <div className="min-w-0 space-y-2 lg:col-span-5">
                    <Label className="block text-xs">Raw material lot</Label>
                    <SearchableSelect<HatcheryInventoryItem>
                      value={line.inventoryItemId}
                      displayValue={line.label}
                      options={materialOptions}
                      isLoading={inventoryLoading}
                      onSearch={setMaterialSearch}
                      placeholder="Search purchased raw materials"
                      searchPlaceholder="Name, supplier, or rate..."
                      onValueChange={(id, option) =>
                        option?.data
                          ? updateInput(index, {
                              inventoryItemId: id,
                              label: option.data.name,
                              unit: option.data.unit,
                              stock: Number(option.data.currentStock),
                              unitCost: Number(
                                option.data.effectiveUnitCost ??
                                  option.data.unitPrice,
                              ),
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
                      onChange={(e) =>
                        updateInput(index, {
                          quantity: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2 lg:col-span-3">
                    <Label className="block text-xs">Available stock</Label>
                    <div className="flex h-10 items-center rounded-md bg-muted px-3 text-sm text-muted-foreground">
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
                          rows.filter((_, rowIndex) => rowIndex !== index),
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
                  setOutputs((rows) => [
                    ...rows,
                    { ...emptyOutput(), costAllocationPercent: 0 },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Product
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Products must first be created under Inventory → Self Made.
            </p>

            <div className="space-y-3">
              {outputs.map((line, index) => {
                const allocated =
                  (totalInputCost *
                    Number(line.costAllocationPercent || 0)) /
                  100;

                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-3 rounded-lg border p-3 lg:grid-cols-12 lg:items-start"
                  >
                    <div className="min-w-0 space-y-2 lg:col-span-4">
                      <Label className="block text-xs">
                        Self Made product
                      </Label>
                      <SearchableSelect<HatcheryManufacturedProduct>
                        value={line.productId}
                        displayValue={line.label}
                        options={productOptions}
                        isLoading={productsLoading}
                        onSearch={setProductSearch}
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
                        onChange={(e) =>
                          updateOutput(index, {
                            quantity: Number(e.target.value) || 0,
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
                        onChange={(e) =>
                          updateOutput(index, {
                            costAllocationPercent:
                              Number(e.target.value) || 0,
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
                            {money(allocated / line.quantity)}/{line.unit || "unit"}
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
                            rows.filter((_, rowIndex) => rowIndex !== index),
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
            <Button onClick={submit} disabled={createProduction.isPending}>
              {createProduction.isPending
                ? "Recording..."
                : "Record Production"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/hatchery/dashboard/production">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
