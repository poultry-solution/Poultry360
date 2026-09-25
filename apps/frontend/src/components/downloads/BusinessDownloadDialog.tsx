"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { useAuthStore } from "@/common/store/store";
import { getTodayLocalDate } from "@/common/lib/utils";

export type DownloadDateRange = {
  startDate?: string;
  endDate?: string;
};

export type DownloadColumn = {
  label: string;
  value: (row: any) => string | number | null | undefined;
};

export type BusinessDownloadData = {
  columns?: DownloadColumn[];
  rows?: any[];
  summary?: Array<{ label: string; value: string | number }>;
  sections?: BusinessDownloadSection[];
};

export type BusinessDownloadSection = {
  title: string;
  columns: DownloadColumn[];
  rows: any[];
  summary?: Array<{ label: string; value: string | number }>;
};

type Period = "today" | "dates" | "all";

type BusinessDownloadDialogProps = {
  title: string;
  fileName: string;
  getData: (range: DownloadDateRange) => Promise<BusinessDownloadData>;
  hasDateFilter?: boolean;
  className?: string;
  buttonLabel?: string;
};

function csvValue(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function cleanPdfText(value: unknown) {
  return String(value ?? "")
    .replace(/₹|रू/g, "Rs ")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

function saveFile(content: BlobPart, type: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function safeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "download";
}

function getSections(data: BusinessDownloadData): BusinessDownloadSection[] {
  if (data.sections?.length) return data.sections;
  return [{ title: "Records", columns: data.columns || [], rows: data.rows || [], summary: data.summary }];
}

function hasRows(data: BusinessDownloadData) {
  return getSections(data).some((section) => section.rows.length > 0);
}

function createTablePdf({
  businessName,
  title,
  period,
  data,
}: {
  businessName: string;
  title: string;
  period: string;
  data: BusinessDownloadData;
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 34;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(cleanPdfText(businessName).slice(0, 80), margin, y);
  y += 22;
  doc.setFontSize(12);
  doc.text(cleanPdfText(title).slice(0, 120), margin, y);
  y += 17;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Period: ${cleanPdfText(period)}    Downloaded: ${new Date().toLocaleString()}`, margin, y);
  y += 17;

  const writeSummary = (summary?: Array<{ label: string; value: string | number }>) => {
    if (!summary?.length) return;
    const text = summary.map((item) => `${cleanPdfText(item.label)}: ${cleanPdfText(item.value)}`).join("     ");
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
    doc.setFontSize(8);
    doc.text(lines, margin, y);
    y += lines.length * 10 + 8;
  };

  writeSummary(data.summary);
  getSections(data).forEach((section) => {
    if (!section.rows.length) return;
    if (y > pageHeight - 90) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(cleanPdfText(section.title).slice(0, 120), margin, y);
    y += 8;
    writeSummary(section.summary);
    autoTable(doc, {
      startY: y,
      head: [section.columns.map((column) => cleanPdfText(column.label))],
      body: section.rows.map((row) => section.columns.map((column) => cleanPdfText(column.value(row)))),
      theme: "grid",
      margin: { left: margin, right: margin, bottom: 30 },
      styles: { font: "helvetica", fontSize: 7, cellPadding: 4, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: [31, 78, 121], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 248, 250] },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 14, { align: "right" });
  }
  return doc.output("blob");
}

function periodLabel(period: Period, range: DownloadDateRange) {
  if (period === "today") return "Today";
  if (period === "dates") return `${range.startDate || "Start"} to ${range.endDate || "End"}`;
  return "All time";
}

export function downloadBusinessData({
  businessName,
  title,
  fileName,
  period = "All time",
  data,
  format,
}: {
  businessName: string;
  title: string;
  fileName: string;
  period?: string;
  data: BusinessDownloadData;
  format: "csv" | "pdf";
}) {
  if (format === "csv") {
    const lines = getSections(data).flatMap((section) => [
      csvValue(section.title),
      section.columns.map((column) => csvValue(column.label)).join(","),
      ...section.rows.map((row) => section.columns.map((column) => csvValue(column.value(row))).join(",")),
      ...(section.summary?.length ? ["", ...section.summary.map((item) => `${csvValue(item.label)},${csvValue(item.value)}`)] : []),
      "",
    ]);
    saveFile(`\uFEFF${lines.join("\n")}`, "text/csv;charset=utf-8", `${safeFileName(fileName)}.csv`);
    return;
  }
  saveFile(createTablePdf({ businessName, title, period, data }), "application/pdf", `${safeFileName(fileName)}.pdf`);
}

export function BusinessDownloadDialog({
  title,
  fileName,
  getData,
  hasDateFilter = true,
  className,
  buttonLabel = "Download",
}: BusinessDownloadDialogProps) {
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const businessName = user?.dealer?.name || user?.hatchery?.name || user?.farmer?.name || user?.company?.name || user?.companyName || user?.name || "Poultry360";

  const getRange = (): DownloadDateRange => {
    if (period === "today") {
      const today = getTodayLocalDate();
      return { startDate: today, endDate: today };
    }
    if (period === "dates") return { startDate, endDate };
    return {};
  };

  const download = async (format: "csv" | "pdf") => {
    const range = getRange();
    if (period === "dates" && (!range.startDate || !range.endDate)) {
      toast.error("Choose both dates first");
      return;
    }
    if (range.startDate && range.endDate && range.startDate > range.endDate) {
      toast.error("End date must be after start date");
      return;
    }
    try {
      setIsDownloading(true);
      const data = await getData(range);
      if (!hasRows(data)) {
        toast.error("No records to download");
        return;
      }
      const suffix = `${safeFileName(fileName)}-${period === "today" ? getTodayLocalDate() : period === "dates" ? `${range.startDate}-${range.endDate}` : "all-time"}`;
      downloadBusinessData({ businessName, title, fileName: suffix, period: periodLabel(period, range), data, format });
      setOpen(false);
    } catch {
      toast.error("Could not download. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" className={className} onClick={() => setOpen(true)}>
        <Download className="mr-2 h-4 w-4" />
        {buttonLabel}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download {title}</DialogTitle>
          <DialogDescription>Choose what you want to download.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {hasDateFilter ? (
            <div className="space-y-2">
              <Label>Time</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["today", "dates", "all"] as Period[]).map((value) => (
                  <Button key={value} type="button" size="sm" variant={period === value ? "default" : "outline"} onClick={() => setPeriod(value)}>
                    {value === "today" ? "Today" : value === "dates" ? "Choose dates" : "All time"}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          {hasDateFilter && period === "dates" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="download-start-date">Start date</Label><Input id="download-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="download-end-date">End date</Label><Input id="download-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isDownloading}>Cancel</Button>
          <Button type="button" variant="outline" onClick={() => download("csv")} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Save as CSV
          </Button>
          <Button type="button" onClick={() => download("pdf")} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Save as PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function fetchAllPages<T>(
  getPage: (page: number, limit: number) => Promise<{ rows: T[]; total?: number; totalPages?: number }>,
  limit = 100
) {
  const rows: T[] = [];
  let page = 1;
  while (true) {
    const result = await getPage(page, limit);
    rows.push(...result.rows);
    const totalPages = result.totalPages ?? (result.total !== undefined ? Math.ceil(result.total / limit) : undefined);
    if (!result.rows.length || (totalPages ? page >= totalPages : result.rows.length < limit)) break;
    page += 1;
  }
  return rows;
}

export function filterRowsByDate<T>(
  rows: T[],
  range: DownloadDateRange,
  getDate: (row: T) => string | Date | null | undefined
) {
  if (!range.startDate && !range.endDate) return rows;
  const start = range.startDate ? new Date(`${range.startDate}T00:00:00`) : null;
  const end = range.endDate ? new Date(`${range.endDate}T23:59:59.999`) : null;
  return rows.filter((row) => {
    const value = getDate(row);
    if (!value) return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && (!start || date >= start) && (!end || date <= end);
  });
}
