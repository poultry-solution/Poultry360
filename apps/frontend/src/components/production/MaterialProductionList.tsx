"use client";

import { useState } from "react";
import Link from "next/link";
import { Factory, Plus, Undo2 } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { DateDisplay } from "@/common/components/ui/date-display";
import { Input } from "@/common/components/ui/input";
import {
  Modal,
  ModalContent,
  ModalFooter,
} from "@/common/components/ui/modal";
import {
  formatQuantity,
  formatRatePerUnit,
  formatRupeesExact,
} from "@/common/lib/utils";
import type { MaterialProductionRun } from "@/fetchers/production/materialProductionTypes";
import { useI18n } from "@/i18n/useI18n";

const summary = (
  items: Array<{
    quantity: number;
    inventoryItem?: { name: string; unit: string };
    product?: { name: string; unit: string };
  }>
) =>
  items
    .map(
      (item) =>
        `${item.inventoryItem?.name ?? item.product?.name} ${formatQuantity(item.quantity)} ${item.inventoryItem?.unit ?? item.product?.unit}`
    )
    .join(", ");

const runTotal = (run: MaterialProductionRun) =>
  run.inputs.reduce((sum, item) => sum + Number(item.amount || 0), 0);

interface MaterialProductionListProps {
  runs: MaterialProductionRun[];
  newHref: string;
  /** Where raw materials are bought (Supplier Ledger), for the empty help. */
  purchaseHref?: string;
  /** Inventory page (Self Feed tab), for the empty help. */
  inventoryHref?: string;
  isLoading?: boolean;
  isRemoving?: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  onRemove: (run: MaterialProductionRun) => Promise<void>;
}

export function MaterialProductionList({
  runs,
  newHref,
  purchaseHref,
  inventoryHref,
  isLoading = false,
  isRemoving = false,
  search,
  onSearchChange,
  onRemove,
}: MaterialProductionListProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<MaterialProductionRun | null>(null);
  const [deleteRun, setDeleteRun] = useState<MaterialProductionRun | null>(null);

  const steps: Array<{ text: string; href?: string; link?: string }> = [
    { text: t("production.list.step1"), href: purchaseHref, link: t("production.list.step1Link") },
    { text: t("production.list.step2"), href: inventoryHref, link: t("production.list.step2Link") },
    { text: t("production.list.step3") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Factory className="h-7 w-7 text-gray-700" />
          <div>
            <h1 className="text-2xl font-bold">{t("production.list.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("production.list.subtitle")}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={newHref}>
            <Plus className="mr-1 h-4 w-4" />
            {t("production.list.add")}
          </Link>
        </Button>
      </div>

      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={t("production.list.search")}
        className="max-w-md"
      />

      {isLoading ? (
        <p className="py-8 text-center text-muted-foreground">{t("production.list.loading")}</p>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            {search ? (
              <p className="text-center text-muted-foreground">{t("production.list.noMatch")}</p>
            ) : (
              <div className="mx-auto max-w-md space-y-4">
                <p className="text-center font-medium">{t("production.list.emptyTitle")}</p>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  {steps.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                        {index + 1}
                      </span>
                      <span className="pt-0.5">
                        {step.text}
                        {step.href && step.link && (
                          <>
                            {" "}
                            <Link href={step.href} className="font-medium text-primary hover:underline">
                              {step.link}
                            </Link>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <Card key={run.id} className="py-0">
              <CardContent className="p-0">
                <button
                  type="button"
                  className="flex w-full flex-col gap-3 px-4 py-4 text-left hover:bg-muted/40 md:flex-row md:items-center md:justify-between md:px-6"
                  onClick={() => setSelected(run)}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <DateDisplay date={run.date} className="font-medium" />
                      {run.referenceNumber && (
                        <Badge variant="outline">{run.referenceNumber}</Badge>
                      )}
                    </div>
                    <p className="text-sm">
                      <span className="text-xs text-muted-foreground">{t("production.list.used")}</span>{" "}
                      {summary(run.inputs)}
                    </p>
                    <p className="text-sm">
                      <span className="text-xs text-muted-foreground">{t("production.list.made")}</span>{" "}
                      {summary(run.outputs)}
                    </p>
                  </div>
                  <div className="shrink-0 space-y-0.5 md:text-right">
                    <p className="text-xs text-muted-foreground">{t("production.list.totalCost")}</p>
                    <p className="font-semibold">{formatRupeesExact(runTotal(run))}</p>
                    {run.outputs.map((item) => (
                      <p key={item.id} className="text-xs text-muted-foreground">
                        {item.product.name}: {formatRatePerUnit(Number(item.unitCost).toFixed(2), item.product.unit)}
                      </p>
                    ))}
                  </div>
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={t("production.details.title")}
      >
        <ModalContent>
          {selected && (
            <div className="space-y-5 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span>
                  <span className="text-muted-foreground">{t("production.details.date")}</span>{" "}
                  <DateDisplay date={selected.date} className="font-medium" />
                </span>
                {selected.referenceNumber && (
                  <span>
                    <span className="text-muted-foreground">{t("production.details.reference")}</span>{" "}
                    <span className="font-medium">{selected.referenceNumber}</span>
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <p className="font-semibold">{t("production.details.used")}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-1.5 pr-3 text-left font-normal">{t("production.details.material")}</th>
                        <th className="py-1.5 pr-3 text-right font-normal">{t("production.details.qty")}</th>
                        <th className="py-1.5 pr-3 text-right font-normal">{t("production.details.rate")}</th>
                        <th className="py-1.5 text-right font-normal">{t("production.details.amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.inputs.map((item) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-1.5 pr-3">{item.inventoryItem.name}</td>
                          <td className="whitespace-nowrap py-1.5 pr-3 text-right">
                            {formatQuantity(item.quantity)} {item.inventoryItem.unit}
                          </td>
                          <td className="whitespace-nowrap py-1.5 pr-3 text-right">
                            {formatRatePerUnit(item.unitCost, item.inventoryItem.unit)}
                          </td>
                          <td className="whitespace-nowrap py-1.5 text-right">{formatRupeesExact(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold">
                        <td className="py-1.5 pr-3" colSpan={3}>{t("production.details.totalCost")}</td>
                        <td className="whitespace-nowrap py-1.5 text-right">{formatRupeesExact(runTotal(selected))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">{t("production.details.made")}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-1.5 pr-3 text-left font-normal">{t("production.details.product")}</th>
                        <th className="py-1.5 pr-3 text-right font-normal">{t("production.details.qty")}</th>
                        {selected.outputs.length > 1 && (
                          <th className="py-1.5 pr-3 text-right font-normal">{t("production.details.share")}</th>
                        )}
                        <th className="py-1.5 pr-3 text-right font-normal">{t("production.details.amount")}</th>
                        <th className="py-1.5 text-right font-normal">{t("production.details.costPerUnit")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.outputs.map((item) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-1.5 pr-3">{item.product.name}</td>
                          <td className="whitespace-nowrap py-1.5 pr-3 text-right">
                            {formatQuantity(item.quantity)} {item.product.unit}
                          </td>
                          {selected.outputs.length > 1 && (
                            <td className="whitespace-nowrap py-1.5 pr-3 text-right">
                              {Number(item.costAllocationPercent)}%
                            </td>
                          )}
                          <td className="whitespace-nowrap py-1.5 pr-3 text-right">{formatRupeesExact(item.amount)}</td>
                          <td className="whitespace-nowrap py-1.5 text-right font-medium">
                            {formatRatePerUnit(Number(item.unitCost).toFixed(2), item.product.unit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selected.notes && (
                <div>
                  <span className="text-muted-foreground">{t("production.details.notes")}</span>{" "}
                  {selected.notes}
                </div>
              )}
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            size="sm"
            className="mr-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => {
              setDeleteRun(selected);
              setSelected(null);
            }}
          >
            <Undo2 className="mr-1 h-4 w-4" />
            {t("production.details.undo")}
          </Button>
          <Button variant="outline" onClick={() => setSelected(null)}>
            {t("production.details.close")}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={!!deleteRun}
        onClose={() => setDeleteRun(null)}
        title={t("production.undo.title")}
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground">{t("production.undo.body")}</p>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteRun(null)}>
            {t("production.undo.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={isRemoving}
            onClick={async () => {
              if (!deleteRun) return;
              try {
                await onRemove(deleteRun);
                setDeleteRun(null);
              } catch {
                // The page-level handler displays the API error and the dialog
                // remains open so the user can review the reversal constraint.
              }
            }}
          >
            {isRemoving ? t("production.undo.working") : t("production.undo.confirm")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
