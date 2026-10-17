"use client";

import { useState } from "react";
import { Activity, CalendarDays, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, Info, Search, X } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import { NepaliDatePicker } from "@/common/components/ui/nepali-date-picker";
import { convertADtoBS } from "@/common/lib/nepali-date";
import { Input } from "@/common/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/common/components/ui/table";
import { useAuthStore } from "@/common/store/store";
import { exportBusinessAudit, type AuditFilters, type BusinessAuditLog, useBusinessAudit } from "@/fetchers/businessAuditQueries";
import { toast } from "sonner";
import { downloadBusinessData } from "@/components/downloads/BusinessDownloadDialog";

function download(content: BlobPart | BlobPart[], type: string, filename: string) {
  const url = URL.createObjectURL(new Blob(Array.isArray(content) ? content : [content], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
function actorRoleLabel(log: BusinessAuditLog) {
  return log.actorType === "STAFF" ? "Staff" : ["OWNER", "DEALER", "HATCHERY", "COMPANY"].includes(log.actorRole || "") ? "Owner" : log.actorRole || "User";
}

function actorDisplayName(log: BusinessAuditLog, scope: "account" | "admin", businessName?: string) {
  if (scope === "account" && log.actorType === "USER" && ["OWNER", "DEALER", "HATCHERY", "COMPANY"].includes(log.actorRole || "") && businessName) {
    return `${businessName} — Owner (${log.actorName})`;
  }
  return log.actorName;
}

const companyActivityPresentation: Record<string, { description: string; relatedTo: string }> = {
  "company.purchases.created": { description: "Recorded a raw-material purchase", relatedTo: "Raw-material purchase" },
  "company.raw-materials.created": { description: "Added a raw material", relatedTo: "Raw material" },
  "company.raw-materials.updated": { description: "Updated a raw material", relatedTo: "Raw material" },
  "company.raw-materials.deleted": { description: "Deleted a raw material", relatedTo: "Raw material" },
  "company.production.created": { description: "Recorded a production run", relatedTo: "Production run" },
  "company.products.created": { description: "Added a product", relatedTo: "Product" },
  "company.products.updated": { description: "Updated a product", relatedTo: "Product" },
  "company.products.deleted": { description: "Deleted a product", relatedTo: "Product" },
  "company.products.record.adjust-stock.created": { description: "Adjusted product stock", relatedTo: "Product" },
  "company.sales.created": { description: "Recorded a sale", relatedTo: "Sale" },
  "company.sales.record.payments.created": { description: "Recorded a sale payment", relatedTo: "Sale payment" },
  "company.suppliers.created": { description: "Added a supplier", relatedTo: "Supplier" },
  "company.suppliers.updated": { description: "Updated a supplier", relatedTo: "Supplier" },
  "company.suppliers.deleted": { description: "Deleted a supplier", relatedTo: "Supplier" },
  "company.suppliers.record.payments.created": { description: "Recorded a supplier payment", relatedTo: "Supplier payment" },
  "company.ledger.payments.created": { description: "Recorded a ledger payment", relatedTo: "Ledger payment" },
  "company.dealers.created": { description: "Added a dealer", relatedTo: "Dealer" },
  "company.dealers.updated": { description: "Updated a dealer", relatedTo: "Dealer" },
  "company.dealers.deleted": { description: "Deleted a dealer", relatedTo: "Dealer" },
  "company.dealers.record.account.balance-limit.updated": { description: "Updated a dealer credit limit", relatedTo: "Dealer account" },
  "company.dealers.record.payments.created": { description: "Recorded a dealer account payment", relatedTo: "Dealer payment" },
  "company.staff.created": { description: "Added a payroll staff member", relatedTo: "Payroll staff" },
  "company.staff.record.updated": { description: "Updated payroll staff details", relatedTo: "Payroll staff" },
  "company.staff.record.stop.updated": { description: "Stopped a payroll staff member", relatedTo: "Payroll staff" },
  "company.staff.record.deleted": { description: "Deleted a payroll staff member", relatedTo: "Payroll staff" },
  "company.staff.record.payments.created": { description: "Recorded a salary payment", relatedTo: "Salary payment" },
};

function activityDescription(log: BusinessAuditLog) {
  return companyActivityPresentation[log.action]?.description || log.description;
}

function relatedRecord(log: BusinessAuditLog) {
  return companyActivityPresentation[log.action]?.relatedTo || recordLabels[log.targetType] || "Business record";
}

function rows(logs: BusinessAuditLog[], scope: "account" | "admin", businessName?: string) {
  return logs.map((log) => [new Date(log.createdAt).toLocaleString(), actorDisplayName(log, scope, businessName), actorRoleLabel(log), activityDescription(log), relatedRecord(log), readableDetails(log.metadata, log.securityMetadata)]);
}

function exportCsv(logs: BusinessAuditLog[], scope: "account" | "admin", businessName?: string) {
  download([[["Time", "Actor", "Role", "Action", "Related to", "Details"], ...rows(logs, scope, businessName)].map((row) => row.map(escapeCsv).join(",")).join("\n")], "text/csv;charset=utf-8", "activity.csv");
}
function exportExcel(logs: BusinessAuditLog[], scope: "account" | "admin", businessName?: string) {
  const cells = [["Time", "Actor", "Role", "Action", "Related to", "Details"], ...rows(logs, scope, businessName)].map((row) => `<tr>${row.map((value) => `<td>${String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</td>`).join("")}</tr>`).join("");
  download([`<html><head><meta charset="utf-8"></head><body><table>${cells}</table></body></html>`], "application/vnd.ms-excel", "activity.xls");
}
function exportPdf(logs: BusinessAuditLog[], scope: "account" | "admin", businessName?: string) {
  downloadBusinessData({
    businessName: businessName || "Poultry360",
    title: "Activity history",
    fileName: "activity",
    format: "pdf",
    data: {
      columns: [
        { label: "Time", value: (row: BusinessAuditLog) => new Date(row.createdAt).toLocaleString() },
        { label: "Actor", value: (row: BusinessAuditLog) => actorDisplayName(row, scope, businessName) },
        { label: "Role", value: actorRoleLabel },
        { label: "Action", value: activityDescription },
        { label: "Related to", value: relatedRecord },
        { label: "Details", value: (row: BusinessAuditLog) => readableDetails(row.metadata, row.securityMetadata) },
      ],
      rows: logs,
    },
  });
}

const recordLabels: Record<string, string> = {
  DealerSale: "Sale",
  BroilerSaleSettlement: "Broiler settlement",
  Customer: "Customer",
  DealerLedgerEntry: "Balance change",
  DealerProduct: "Product stock",
  DealerManualPurchase: "Supplier purchase",
  DealerManualCompanyPayment: "Supplier payment",
  StaffUser: "Staff login",
  User: "Account login",
  AccountFeature: "Account setting",
  Company: "Company",
  Dealer: "Feed Dealer",
  BlogPost: "Blog post",
  LandingReview: "Review",
  Authentication: "Login activity",
  "Hatchery operation": "Hatchery record",
  "Farmer operation": "Farmer record",
  "Company operation": "Company record",
  "Company purchase": "Raw-material purchase",
  "Company raw material": "Raw material",
  "Company production run": "Production run",
  "Company product": "Product",
  "Company sale": "Sale",
  "Company sale payment": "Sale payment",
  "Company supplier": "Supplier",
  "Company supplier payment": "Supplier payment",
  "Company ledger payment": "Ledger payment",
  "Company dealer": "Dealer",
  "Company dealer account": "Dealer account",
  "Company dealer payment": "Dealer payment",
  "Company payroll staff": "Payroll staff",
  "Company payroll payment": "Salary payment",
  "Dealer payroll staff": "Payroll staff",
  "Dealer payroll payment": "Salary payment",
};

const detailLabels: Record<string, string> = {
  amount: "Amount",
  totalAmount: "Total",
  paidAmount: "Paid",
  marginAmount: "Your margin",
  creditRecovered: "Used to clear due",
  farmerPayout: "Paid to farmer",
  quantity: "Quantity",
  itemCount: "Items",
  saleCount: "Sales",
  paymentMethod: "Payment method",
  adjustmentType: "Stock change",
  permissions: "Extra access",
  changedFields: "Changed",
  featureKey: "Setting",
  enabled: "Status",
  reference: "Reference",
  messageType: "Message type",
  hasText: "Has text",
  hasAttachment: "Has attachment",
  attachmentSize: "Attachment size",
};

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value));
}

function readableDetails(metadata: BusinessAuditLog["metadata"], securityMetadata?: BusinessAuditLog["securityMetadata"]) {
  const details = metadata ? Object.entries(metadata)
    .filter(([key]) => !key.endsWith("Id") && key !== "method" && key !== "route")
    .map(([key, value]) => {
      const label = detailLabels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
      const display = ["amount", "totalAmount", "paidAmount", "marginAmount", "creditRecovered", "farmerPayout"].includes(key)
        ? formatMoney(value)
        : key === "itemCount" || key === "saleCount" ? `${value} ${Number(value) === 1 ? key === "itemCount" ? "item" : "sale" : key === "itemCount" ? "items" : "sales"}`
        : key === "permissions" && Array.isArray(value) ? (value.length ? "Extra access enabled" : "No extra access")
        : key === "changedFields" && Array.isArray(value) ? value.map((field) => String(field).replaceAll("_", " ")).join(", ")
        : key === "enabled" ? (value ? "On" : "Off")
        : key === "hasText" || key === "hasAttachment" ? (value ? "Yes" : "No")
        : key === "attachmentSize" ? `${Math.max(0, Number(value) / 1024).toFixed(1)} KB`
        : String(value ?? "");
      return `${label}: ${display}`;
    })
    : [];
  if (securityMetadata) {
    details.push(
      `IP address: ${securityMetadata.ipAddress || "Not available"}`,
      `Browser: ${securityMetadata.browserFamily}`,
      `System: ${securityMetadata.operatingSystem}`,
      `Device: ${securityMetadata.deviceType}`,
    );
    const area = [securityMetadata.region, securityMetadata.countryCode].filter(Boolean).join(", ");
    if (area) details.push(`Estimated area: ${area}`);
  }
  return details.join(" · ") || "—";
}

const NEPAL_OFFSET_MS = 5.75 * 60 * 60 * 1000;
const nepalTimeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", hour: "2-digit", minute: "2-digit", hour12: true });

/** Nepali (BS) date and Nepal time for screen display. Exports keep their own format. */
function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { day: "—", time: "" };
  const nepalDayAd = new Date(date.getTime() + NEPAL_OFFSET_MS).toISOString().slice(0, 10);
  let day = nepalDayAd;
  try { day = convertADtoBS(nepalDayAd); } catch { /* keep AD */ }
  return { day, time: nepalTimeFormat.format(date) };
}

function DetailChips({ log }: { log: BusinessAuditLog }) {
  const text = readableDetails(log.metadata, log.securityMetadata);
  if (text === "—") return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {text.split(" · ").map((part, index) => (
        <span key={index} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {part}
        </span>
      ))}
    </div>
  );
}

function ActorCell({ log, scope, businessName }: { log: BusinessAuditLog; scope: "account" | "admin"; businessName?: string }) {
  const isStaff = log.actorType === "STAFF";
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">{actorDisplayName(log, scope, businessName)}</p>
      <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${isStaff ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
        {actorRoleLabel(log)}
      </span>
    </div>
  );
}

export function BusinessActivityPage({ scope }: { scope: "account" | "admin" }) {
  const user = useAuthStore((state) => state.user);
  const businessName =
    scope === "account"
      ? user?.dealer?.name || user?.hatchery?.name || user?.farmer?.name || user?.company?.name || user?.companyName || (user?.role === "OWNER" ? user.name : undefined)
      : undefined;
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, limit: 25, archived: "false" });
  const query = useBusinessAudit(scope, filters);
  // The Nepali picker always shows a date, so it only appears once the user asks for one.
  const [isPickingDate, setIsPickingDate] = useState(false);
  const logs = query.data?.data || [];
  const update = (patch: Partial<AuditFilters>) => setFilters((current) => ({ ...current, ...patch, page: 1 }));
  const doExport = async (type: "csv" | "excel" | "pdf") => {
    try {
      const all = await exportBusinessAudit(scope, { ...filters, page: undefined, limit: undefined });
      if (type === "csv") exportCsv(all, scope, businessName); else if (type === "excel") exportExcel(all, scope, businessName); else exportPdf(all, scope, businessName);
    } catch { toast.error("Could not export activity"); }
  };

  const page = filters.page || 1;
  const totalPages = query.data?.pagination.totalPages || 0;
  const total = query.data?.pagination.total || 0;
  const hasFilters = Boolean(filters.search || filters.actorType || filters.startDate || (filters.archived && filters.archived !== "false"));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Activity</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            {scope === "admin" ? "See important account and security actions." : "See important business actions. Staff cannot view this page."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <Button size="sm" variant="outline" onClick={() => doExport("csv")}><Download className="mr-1.5 h-4 w-4" /> CSV</Button>
          <Button size="sm" variant="outline" onClick={() => doExport("excel")}><FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel</Button>
          <Button size="sm" variant="outline" onClick={() => doExport("pdf")}><FileText className="mr-1.5 h-4 w-4" /> PDF</Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Filters */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search activity" value={filters.search || ""} onChange={(event) => update({ search: event.target.value })} />
            </div>
            <Select value={filters.actorType || "ALL"} onValueChange={(value) => update({ actorType: value === "ALL" ? undefined : value })}>
              <SelectTrigger className="w-full bg-white" aria-label="Who">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="ALL">All people</SelectItem>
                <SelectItem value="USER">Owners / users</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.archived || "false"} onValueChange={(value) => update({ archived: value as AuditFilters["archived"] })}>
              <SelectTrigger className="w-full bg-white" aria-label="Period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="false">Last 10 days</SelectItem>
                <SelectItem value="all">All records</SelectItem>
                <SelectItem value="true">Older records</SelectItem>
              </SelectContent>
            </Select>
            {!filters.startDate && !isPickingDate ? (
              <Button type="button" variant="outline" className="w-full justify-start font-normal text-muted-foreground" onClick={() => setIsPickingDate(true)}>
                <CalendarDays className="mr-2 h-4 w-4" />
                From date: any
              </Button>
            ) : (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <NepaliDatePicker
                  key={filters.startDate || "no-date"}
                  defaultDate={filters.startDate ? convertADtoBS(filters.startDate) : undefined}
                  onChange={({ adDate }) => update({ startDate: adDate.split("T")[0] })}
                  className="w-full rounded-md border border-input"
                  theme="light"
                  language="en"
                />
              </div>
              <Button type="button" size="icon" variant="ghost" aria-label="Clear date" onClick={() => { setIsPickingDate(false); update({ startDate: undefined }); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              New records are kept here for 10 days. Choose "Older records" to see earlier ones.
            </span>
            {hasFilters ? (
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setIsPickingDate(false); setFilters({ page: 1, limit: filters.limit, archived: "false" }); }}>
                Clear filters
              </button>
            ) : null}
          </div>

          {/* List */}
          {query.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((key) => <div key={key} className="h-14 animate-pulse rounded-lg bg-muted/50" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
              <Activity className="h-6 w-6 text-muted-foreground" />
              <p className="font-medium">No activity found</p>
              <p className="text-sm text-muted-foreground">{hasFilters ? "Try clearing the filters." : "Actions will show here as they happen."}</p>
            </div>
          ) : (
            <>
              {/* Phone: cards */}
              <ul className="space-y-3 md:hidden">
                {logs.map((log) => {
                  const when = formatWhen(log.createdAt);
                  return (
                    <li key={log.id} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <ActorCell log={log} scope={scope} businessName={businessName} />
                        <div className="shrink-0 text-right text-xs text-muted-foreground">
                          <p>{when.day}</p>
                          <p>{when.time}</p>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{activityDescription(log)}</p>
                      <p className="text-xs text-muted-foreground">Related to: {relatedRecord(log)}</p>
                      <DetailChips log={log} />
                    </li>
                  );
                })}
              </ul>

              {/* Tablet and desktop: table */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-32">When</TableHead>
                      <TableHead className="w-56">Who</TableHead>
                      <TableHead>What happened</TableHead>
                      <TableHead className="w-40">Related to</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const when = formatWhen(log.createdAt);
                      return (
                        <TableRow key={log.id} className="align-top">
                          <TableCell className="whitespace-nowrap text-xs">
                            <p className="font-medium text-foreground">{when.day}</p>
                            <p className="text-muted-foreground">{when.time}</p>
                          </TableCell>
                          <TableCell><ActorCell log={log} scope={scope} businessName={businessName} /></TableCell>
                          <TableCell className="text-sm font-medium">{activityDescription(log)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{relatedRecord(log)}</TableCell>
                          <TableCell className="max-w-80"><DetailChips log={log} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 border-t pt-4 text-sm sm:flex-row">
            <span className="text-muted-foreground">
              {total} record{total === 1 ? "" : "s"}{totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={!filters.page || filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: (current.page || 1) - 1 }))}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              <Button size="sm" variant="outline" disabled={!query.data?.pagination.totalPages || (filters.page || 1) >= query.data.pagination.totalPages} onClick={() => setFilters((current) => ({ ...current, page: (current.page || 1) + 1 }))}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
