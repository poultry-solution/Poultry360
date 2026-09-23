"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Search } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Input } from "@/common/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/common/components/ui/table";
import { useAuthStore } from "@/common/store/store";
import { exportBusinessAudit, type AuditFilters, type BusinessAuditLog, useBusinessAudit } from "@/fetchers/businessAuditQueries";
import { toast } from "sonner";

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
  "company.staff.record.archive.updated": { description: "Archived a payroll staff member", relatedTo: "Payroll staff" },
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
  const lines = rows(logs, scope, businessName).map((row) => `${row[0]} | ${row[1]} | ${row[3]} | ${row[4]} | ${row[5]}`.replace(/[()\\]/g, "\\$&").slice(0, 140));
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / 42)) }, (_, index) => lines.slice(index * 42, index * 42 + 42));
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`];
  pages.forEach((page, index) => {
    const pageId = 3 + index * 2; const contentId = pageId + 1;
    const content = ["BT /F1 10 Tf 42 800 Td (Poultry360 activity) Tj 0 -18 Td", ...page.map((line) => `(${line}) Tj 0 -16 Td`), "ET"].join("\n");
    objects.push(`<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 842] /Contents ${contentId} 0 R >>`, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  let pdf = "%PDF-1.4\n"; const offsets = [0]; objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  download([pdf], "application/pdf", "activity.pdf");
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

export function BusinessActivityPage({ scope }: { scope: "account" | "admin" }) {
  const user = useAuthStore((state) => state.user);
  const businessName =
    scope === "account"
      ? user?.dealer?.name || user?.hatchery?.name || user?.farmer?.name || user?.company?.name || user?.companyName || (user?.role === "OWNER" ? user.name : undefined)
      : undefined;
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, limit: 25, archived: "false" });
  const query = useBusinessAudit(scope, filters);
  const logs = query.data?.data || [];
  const update = (patch: Partial<AuditFilters>) => setFilters((current) => ({ ...current, ...patch, page: 1 }));
  const doExport = async (type: "csv" | "excel" | "pdf") => {
    try {
      const all = await exportBusinessAudit(scope, { ...filters, page: undefined, limit: undefined });
      if (type === "csv") exportCsv(all, scope, businessName); else if (type === "excel") exportExcel(all, scope, businessName); else exportPdf(all, scope, businessName);
    } catch { toast.error("Could not export activity"); }
  };
  return <div className="container max-w-7xl space-y-6 py-6">
    <div><h1 className="text-2xl font-bold">Activity</h1><p className="text-sm text-muted-foreground">{scope === "admin" ? "See important account and security actions." : "See important business actions. Staff cannot view this page."}</p></div>
    <Card><CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Business activity</CardTitle><CardDescription>New records are kept here for 10 days. Older records can still be included when needed.</CardDescription></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => doExport("csv")}><Download className="mr-1 h-4 w-4" /> CSV</Button><Button size="sm" variant="outline" onClick={() => doExport("excel")}><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel</Button><Button size="sm" variant="outline" onClick={() => doExport("pdf")}><FileText className="mr-1 h-4 w-4" /> PDF</Button></div></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-2 md:grid-cols-4"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search activity" value={filters.search || ""} onChange={(event) => update({ search: event.target.value })} /></div><select className="rounded-md border bg-background px-3 text-sm" value={filters.actorType || ""} onChange={(event) => update({ actorType: event.target.value || undefined })}><option value="">All people</option><option value="USER">Owners / users</option><option value="STAFF">Staff</option></select><select className="rounded-md border bg-background px-3 text-sm" value={filters.archived || "false"} onChange={(event) => update({ archived: event.target.value as AuditFilters["archived"] })}><option value="false">Last 10 days</option><option value="all">All records</option><option value="true">Older records</option></select><Input type="date" value={filters.startDate || ""} onChange={(event) => update({ startDate: event.target.value || undefined })} /></div>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading activity…</p> : <Table><TableHeader><TableRow><TableHead>When</TableHead><TableHead>Who</TableHead><TableHead>What happened</TableHead><TableHead>Related to</TableHead><TableHead>Details</TableHead></TableRow></TableHeader><TableBody>{logs.length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No activity found.</TableCell></TableRow> : logs.map((log) => <TableRow key={log.id}><TableCell className="whitespace-nowrap text-xs">{new Date(log.createdAt).toLocaleString()}</TableCell><TableCell>{actorDisplayName(log, scope, businessName)}<span className="block text-xs text-muted-foreground">{actorRoleLabel(log)}</span></TableCell><TableCell>{activityDescription(log)}</TableCell><TableCell>{relatedRecord(log)}</TableCell><TableCell className="max-w-72 text-xs text-muted-foreground">{readableDetails(log.metadata, log.securityMetadata)}</TableCell></TableRow>)}</TableBody></Table>}
      <div className="flex items-center justify-between text-sm"><span>{query.data?.pagination.total || 0} records</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={!filters.page || filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: (current.page || 1) - 1 }))}>Previous</Button><Button size="sm" variant="outline" disabled={!query.data?.pagination.totalPages || (filters.page || 1) >= query.data.pagination.totalPages} onClick={() => setFilters((current) => ({ ...current, page: (current.page || 1) + 1 }))}>Next</Button></div></div>
    </CardContent></Card>
  </div>;
}
