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
import { useCalendar } from "@/common/hooks/useCalendar";
import { toNepalDayAd } from "@/common/lib/nepali-date";
import {
  formatQuantity,
  formatRatePerUnit,
  formatRupeesExact,
  getTodayLocalDate,
} from "@/common/lib/utils";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import type { CreateMaterialProductionInput } from "@/fetchers/production/materialProductionTypes";
import { useI18n } from "@/i18n/useI18n";

export interface ProductionMaterialOption {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  unitCost: number;
  /** First day this lot was bought (AD ISO). Used to tell lots apart and to block too-early runs. */
  firstPurchaseDate?: string | null;
  supplierName?: string | null;
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
  firstPurchaseDate: string | null;
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
  /** Where raw materials are bought (Supplier Ledger). */
  purchaseHref?: string;
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
  firstPurchaseDate: null,
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

const money = formatRupeesExact;

export function MaterialProductionForm({
  backHref,
  inventoryHref,
  purchaseHref,
  materials,
  products,
  isLoadingMaterials = false,
  isLoadingProducts = false,
  isSubmitting = false,
  onMaterialSearch,
  onProductSearch,
  onSubmit,
}: MaterialProductionFormProps) {
  const { t } = useI18n();
  const { toDisplayDate } = useCalendar();
  const [date, setDate] = useState(getTodayLocalDate);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [inputs, setInputs] = useState<InputLine[]>([emptyInput()]);
  const [outputs, setOutputs] = useState<OutputLine[]>([emptyOutput()]);
  const [materialSearch, setMaterialSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const showDate = (value: string) => toDisplayDate(new Date(value));

  const materialOptions = materials.map((item) => ({
    value: item.id,
    label: item.name,
    subtitle:
      item.subtitle ??
      [
        item.firstPurchaseDate
          ? t("production.form.boughtOn", { date: showDate(item.firstPurchaseDate) })
          : null,
        item.supplierName || null,
        formatRatePerUnit(item.unitCost, item.unit),
        t("production.form.left", {
          qty: formatQuantity(item.currentStock),
          unit: item.unit,
        }),
      ]
        .filter(Boolean)
        .join(" · "),
    data: item,
  }));
  const productOptions = products.map((product) => ({
    value: product.id,
    label: product.name,
    subtitle:
      product.subtitle ??
      `${product.unit}${product.currentStock === undefined ? "" : ` · ${t("production.form.inStock", { qty: formatQuantity(product.currentStock) })}`}`,
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
  const allocationOk = Math.abs(allocationTotal - 100) < 0.0001;
  const multipleProducts = outputs.length > 1;

  // Quantity asked per lot (the same lot can be picked on two rows).
  const requiredByLot = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of inputs) {
      if (!line.inventoryItemId) continue;
      map.set(line.inventoryItemId, (map.get(line.inventoryItemId) ?? 0) + line.quantity);
    }
    return map;
  }, [inputs]);

  const runDay = date ? toNepalDayAd(date) : null;
  const boughtTooLate = (line: InputLine) =>
    !!(runDay && line.firstPurchaseDate && toNepalDayAd(line.firstPurchaseDate) > runDay);
  const tooMuch = (line: InputLine) =>
    !!line.inventoryItemId && (requiredByLot.get(line.inventoryItemId) ?? 0) > line.stock;

  const noMaterials = !isLoadingMaterials && !materialSearch && materials.length === 0;
  const noProducts = !isLoadingProducts && !productSearch && products.length === 0;

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
      toast.error(t("production.form.errorNeedRows"));
      return;
    }
    if (!allocationOk) {
      toast.error(t("production.form.errorShareTotal", { total: allocationTotal }));
      return;
    }
    const lateLine = validInputs.find(boughtTooLate);
    if (lateLine) {
      toast.error(
        t("production.form.errorBoughtLater", {
          name: lateLine.label,
          date: showDate(lateLine.firstPurchaseDate!),
        })
      );
      return;
    }
    const shortLine = validInputs.find(tooMuch);
    if (shortLine) {
      toast.error(
        t("production.form.errorNotEnough", {
          name: shortLine.label,
          qty: formatQuantity(shortLine.stock),
          unit: shortLine.unit,
        })
      );
      return;
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
          {t("production.form.back")}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{t("production.form.title")}</CardTitle>
          <CardDescription>{t("production.form.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid items-end gap-4 md:grid-cols-2">
            <DateInput label={t("production.form.date")} value={date} onChange={setDate} />
            <div className="space-y-2">
              <Label htmlFor="production-reference">{t("production.form.reference")}</Label>
              <Input
                id="production-reference"
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder={t("production.form.referencePlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="production-notes">{t("production.form.notes")}</Label>
            <Input
              id="production-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("production.form.notesPlaceholder")}
            />
          </div>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{t("production.form.materialsTitle")}</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInputs((rows) => [...rows, emptyInput()])}
              >
                <Plus className="mr-1 h-4 w-4" />
                {t("production.form.addMaterial")}
              </Button>
            </div>

            {noMaterials && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t("production.form.noMaterials")}{" "}
                {purchaseHref && (
                  <Link href={purchaseHref} className="font-medium underline">
                    {t("production.form.goToSupplierLedger")}
                  </Link>
                )}
              </p>
            )}

            <div className="space-y-3">
              {inputs.map((line, index) => {
                const late = boughtTooLate(line);
                const short = tooMuch(line);
                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 items-start gap-3 rounded-lg border p-3 lg:grid-cols-12"
                  >
                    <div className="min-w-0 space-y-2 lg:col-span-6">
                      <Label className="block text-xs">{t("production.form.material")}</Label>
                      <SearchableSelect<ProductionMaterialOption>
                        value={line.inventoryItemId}
                        displayValue={line.label}
                        options={materialOptions}
                        isLoading={isLoadingMaterials}
                        onSearch={(query) => {
                          setMaterialSearch(query);
                          onMaterialSearch?.(query);
                        }}
                        placeholder={t("production.form.pickMaterial")}
                        searchPlaceholder={t("production.form.searchByName")}
                        onValueChange={(id, option) =>
                          option?.data
                            ? updateInput(index, {
                                inventoryItemId: id,
                                label: option.data.name,
                                unit: option.data.unit,
                                stock: option.data.currentStock,
                                unitCost: option.data.unitCost,
                                firstPurchaseDate: option.data.firstPurchaseDate ?? null,
                              })
                            : updateInput(index, emptyInput())
                        }
                      />
                      {line.inventoryItemId && (
                        <p className="text-xs text-muted-foreground">
                          {[
                            line.firstPurchaseDate
                              ? t("production.form.boughtOn", { date: showDate(line.firstPurchaseDate) })
                              : null,
                            formatRatePerUnit(line.unitCost, line.unit),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 lg:col-span-3">
                      <Label className="block text-xs">
                        {t("production.form.quantity")} {line.unit && `(${line.unit})`}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={line.quantity || ""}
                        aria-invalid={short || undefined}
                        onChange={(event) =>
                          updateInput(index, {
                            quantity: Number(event.target.value) || 0,
                          })
                        }
                      />
                      {line.inventoryItemId && (
                        <p className={`text-xs ${short ? "text-red-600" : "text-muted-foreground"}`}>
                          {short
                            ? t("production.form.onlyLeft", { qty: formatQuantity(line.stock), unit: line.unit })
                            : t("production.form.left", { qty: formatQuantity(line.stock), unit: line.unit })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-2 lg:col-span-3 lg:pt-6">
                      <span className="pt-2 text-sm font-medium">
                        {line.inventoryItemId && line.quantity > 0
                          ? money(line.quantity * line.unitCost)
                          : ""}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("production.form.removeMaterial", { n: index + 1 })}
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

                    {late && (
                      <p className="text-sm text-red-600 lg:col-span-12">
                        {t("production.form.boughtLaterHint", { date: showDate(line.firstPurchaseDate!) })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{t("production.form.productsTitle")}</h3>
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
                {t("production.form.addProduct")}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {noProducts ? t("production.form.noProducts") : t("production.form.productsHint")}{" "}
              <Link href={inventoryHref} className="font-medium text-primary hover:underline">
                {t("production.form.inventorySelfFeed")}
              </Link>
              {t("production.form.sentenceEnd")}
              {multipleProducts && <> {t("production.form.shareHint")}</>}
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
                    <div className={`min-w-0 space-y-2 ${multipleProducts ? "lg:col-span-4" : "lg:col-span-6"}`}>
                      <Label className="block text-xs">{t("production.form.product")}</Label>
                      <SearchableSelect<ProductionProductOption>
                        value={line.productId}
                        displayValue={line.label}
                        options={productOptions}
                        isLoading={isLoadingProducts}
                        onSearch={(query) => {
                          setProductSearch(query);
                          onProductSearch?.(query);
                        }}
                        placeholder={t("production.form.pickProduct")}
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

                    <div className="space-y-2 lg:col-span-3">
                      <Label className="block text-xs">
                        {t("production.form.quantity")} {line.unit && `(${line.unit})`}
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
                      {line.quantity > 0 && totalInputCost > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {t("production.form.costPerUnit", {
                            rate: formatRatePerUnit(
                              Math.round((allocated / line.quantity) * 100) / 100,
                              line.unit || t("production.form.unitFallback")
                            ),
                          })}
                        </p>
                      )}
                    </div>

                    {multipleProducts && (
                      <div className="space-y-2 lg:col-span-2">
                        <Label className="block text-xs">{t("production.form.costShare")}</Label>
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
                    )}

                    <div className="flex items-start justify-between gap-2 lg:col-span-3 lg:pt-6">
                      <span className="pt-2 text-sm font-medium">
                        {totalInputCost > 0 ? money(allocated) : ""}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("production.form.removeProduct", { n: index + 1 })}
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

            {multipleProducts && !allocationOk && (
              <p className="text-sm text-red-600">
                {t("production.form.errorShareTotal", { total: allocationTotal })}
              </p>
            )}
          </section>

          <div className="sticky bottom-0 z-10 -mx-6 border-t bg-background px-6 py-3 md:static md:mx-0 md:rounded-lg md:border-0 md:bg-muted md:px-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span>
                  {t("production.form.totalCost")}{" "}
                  <strong>{money(totalInputCost)}</strong>
                </span>
                {multipleProducts && (
                  <span>
                    {t("production.form.costShare")}{" "}
                    <strong className={allocationOk ? "text-emerald-600" : "text-red-600"}>
                      {allocationTotal}%
                    </strong>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={backHref}>{t("production.form.cancel")}</Link>
                </Button>
                <Button type="button" onClick={submit} disabled={isSubmitting}>
                  {isSubmitting ? t("production.form.saving") : t("production.form.save")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
