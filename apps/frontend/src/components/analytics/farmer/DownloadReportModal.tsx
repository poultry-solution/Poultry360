"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { downloadBusinessData, type DownloadColumn } from "@/components/downloads/BusinessDownloadDialog";
import { rupees } from "@/components/dashboard/StatsCards";
import { useGetBillSettings } from "@/fetchers/billSettings/billSettingsQueries";
import {
  fetchFarmerReport,
  type FarmerAnalyticsGroupBy,
  type FarmerAnalyticsParams,
  type FarmerReportType,
} from "@/fetchers/analytics/farmerAnalyticsQueries";
import { useI18n } from "@/i18n/useI18n";
import { bsDay, periodLabel } from "./shared";

const TYPES: FarmerReportType[] = ["money", "batches", "sales", "costs", "deaths", "eggs"];

type Format = "csv" | "pdf";

/**
 * Report columns. Files use English headings (the PDF font has no Nepali letters);
 * CSV gets plain numbers for Excel, PDF gets formatted money.
 */
function columnsFor(type: FarmerReportType, format: Format, groupBy: FarmerAnalyticsGroupBy, t: any): DownloadColumn[] {
  const money = (v: unknown) => (v == null ? "" : format === "csv" ? Number(v) : rupees(Number(v)));
  const plain = (v: unknown) => (v == null ? "" : Number(v));
  const day = (v: unknown) => (v ? bsDay(String(v).slice(0, 10)) : "");
  switch (type) {
    case "money":
      return [
        { label: "Period", value: (r) => periodLabel(r.start, groupBy, t) },
        { label: "Sales", value: (r) => money(r.sales) },
        { label: "Costs", value: (r) => money(r.costs) },
        { label: "Profit", value: (r) => money(r.profit) },
      ];
    case "batches":
      return [
        { label: "Batch", value: (r) => r.batchNumber },
        { label: "Farm", value: (r) => r.farmName },
        { label: "Type", value: (r) => (r.batchType === "LAYERS" ? "Layers" : "Broiler") },
        { label: "Status", value: (r) => (r.status === "ACTIVE" ? "Running" : "Closed") },
        { label: "Started", value: (r) => day(r.startDate) },
        { label: "Day", value: (r) => r.day },
        { label: "Birds", value: (r) => plain(r.started) },
        { label: "Sold", value: (r) => plain(r.sold) },
        { label: "Died", value: (r) => plain(r.died) },
        { label: "Death %", value: (r) => plain(r.deathPercent) },
        { label: "Feed kg", value: (r) => plain(r.feedKg) },
        { label: "FCR", value: (r) => (r.fcr == null ? "" : r.fcr) },
        { label: "Sales", value: (r) => money(r.sales) },
        { label: "Costs", value: (r) => money(r.costs) },
        { label: "Profit", value: (r) => money(r.profit) },
        { label: "Cost per bird", value: (r) => money(r.costPerBird) },
      ];
    case "sales":
      return [
        { label: "Date", value: (r) => day(r.date) },
        { label: "Bill no", value: (r) => r.invoiceNumber ?? "" },
        { label: "Item", value: (r) => String(r.itemType).replace("Chicken_Meat", "Chicken") },
        { label: "Customer", value: (r) => r.customer ?? "" },
        { label: "Batch", value: (r) => r.batch ?? "" },
        { label: "Qty", value: (r) => plain(r.quantity) },
        { label: "Weight kg", value: (r) => plain(r.weight) },
        { label: "Rate", value: (r) => money(r.unitPrice) },
        { label: "Discount", value: (r) => money(r.discount) },
        { label: "Amount", value: (r) => money(r.amount) },
      ];
    case "costs":
      return [
        { label: "Date", value: (r) => day(r.date) },
        { label: "Type", value: (r) => r.category },
        { label: "Batch", value: (r) => r.batch ?? "" },
        { label: "Note", value: (r) => r.description ?? "" },
        { label: "Qty", value: (r) => plain(r.quantity) },
        { label: "Amount", value: (r) => money(r.amount) },
      ];
    case "deaths":
      return [
        { label: "Date", value: (r) => day(r.date) },
        { label: "Batch", value: (r) => r.batch },
        { label: "Day", value: (r) => r.day },
        { label: "Died", value: (r) => plain(r.count) },
        { label: "Reason", value: (r) => r.reason ?? "" },
      ];
    case "eggs":
      return [
        { label: "Date", value: (r) => day(r.start) },
        { label: "Eggs laid", value: (r) => plain(r.eggs) },
        { label: "Eggs sold", value: (r) => plain(r.sold) },
        { label: "Laying %", value: (r) => plain(r.layingPercent) },
      ];
  }
}

const TITLES: Record<FarmerReportType, string> = {
  money: "Money by period",
  batches: "Batch summary",
  sales: "Sales list",
  costs: "Costs list",
  deaths: "Deaths list",
  eggs: "Eggs by day",
};

export function DownloadReportModal({
  isOpen,
  onClose,
  params,
  showEggs,
}: {
  isOpen: boolean;
  onClose: () => void;
  params: FarmerAnalyticsParams;
  showEggs: boolean;
}) {
  const { t } = useI18n();
  const [type, setType] = useState<FarmerReportType>("money");
  const [busy, setBusy] = useState<Format | null>(null);
  const { data: bill } = useGetBillSettings({ enabled: isOpen });

  const download = async (format: Format) => {
    setBusy(format);
    try {
      const report = await fetchFarmerReport(type, params);
      const period = report.range.allTime
        ? `All time (from ${bsDay(report.range.startDay)})`
        : `${bsDay(report.range.startDay)} to ${bsDay(report.range.endDay)}`;
      const money = (v: number) => (format === "csv" ? v : rupees(v));
      downloadBusinessData({
        businessName: bill?.effective.businessName || "Poultry360",
        title: TITLES[type],
        fileName: `analytics-${type}`,
        period,
        format,
        data: {
          columns: columnsFor(type, format, report.range.groupBy, t),
          rows: type === "money" ? report.rows.filter((row) => row.sales || row.costs) : report.rows,
          summary: report.totals
            ? [
                { label: "Sales", value: money(report.totals.sales) },
                { label: "Costs", value: money(report.totals.costs) },
                { label: "Profit", value: money(report.totals.profit) },
              ]
            : undefined,
        },
      });
      if (report.truncated) toast.message(t("farmer.analytics.download.truncated", { n: report.limit }));
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("farmer.analytics.download.failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("farmer.analytics.download.title")}>
      <ModalContent>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">{t("farmer.analytics.download.hint")}</p>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.filter((item) => item !== "eggs" || showEggs).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                className={`rounded-lg border px-3 py-2 text-left ${type === item ? "border-primary bg-green-50" : "hover:bg-muted/50"}`}
              >
                <p className="font-medium">{t(`farmer.analytics.download.types.${item}`)}</p>
                <p className="text-xs text-muted-foreground">{t(`farmer.analytics.download.typeHints.${item}`)}</p>
              </button>
            ))}
          </div>
        </div>
      </ModalContent>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          {t("farmer.analytics.download.cancel")}
        </Button>
        <Button variant="outline" disabled={!!busy} onClick={() => download("csv")}>
          {busy === "csv" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
          CSV (Excel)
        </Button>
        <Button disabled={!!busy} onClick={() => download("pdf")}>
          {busy === "pdf" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
          PDF
        </Button>
      </ModalFooter>
    </Modal>
  );
}
