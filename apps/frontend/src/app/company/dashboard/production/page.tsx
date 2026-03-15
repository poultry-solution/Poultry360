"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Eye } from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { DataTable, Column } from "@/common/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import {
  useGetProductionRuns,
  type ProductionRun,
} from "@/fetchers/company/companyProductionQueries";
import { DateDisplay } from "@/common/components/ui/date-display";

const formatCurrency = (n: number | string) =>
  `रू ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const inputsSummary = (run: ProductionRun, max = 3) => {
  const parts = (run.inputs || []).map(
    (i) => `${i.rawMaterial?.name ?? "-"} ${Number(i.quantity)} ${i.rawMaterial?.unit ?? ""}`
  );
  if (parts.length <= max) return parts.join(", ");
  return parts.slice(0, max).join(", ") + ` +${parts.length - max} more`;
};

const outputsSummary = (run: ProductionRun, max = 3) => {
  const parts = (run.outputs || []).map(
    (o) => `${o.productName} ${Number(o.quantity)} ${o.unit ?? "kg"}`
  );
  if (parts.length <= max) return parts.join(", ");
  return parts.slice(0, max).join(", ") + ` +${parts.length - max} more`;
};

type TableRow = ProductionRun;

export default function CompanyProductionPage() {
  const { data, isLoading } = useGetProductionRuns({ page: 1, limit: 100 });
  const runs: ProductionRun[] = data?.data ?? [];
  const [detailRun, setDetailRun] = useState<ProductionRun | null>(null);

  const columns: Column<TableRow>[] = [
    {
      key: "date",
      label: "Date",
      width: "110px",
      render: (_, row) => <DateDisplay date={row.date} />,
    },
    {
      key: "reference",
      label: "Reference",
      width: "120px",
      render: (_, row) => row.referenceNumber ?? "—",
    },
    {
      key: "inputsUsed",
      label: "Inputs used",
      render: (_, row) => (
        <span className="text-muted-foreground text-sm">{inputsSummary(row)}</span>
      ),
    },
    {
      key: "produced",
      label: "Produced",
      render: (_, row) => (
        <span className="text-sm">{outputsSummary(row)}</span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "100px",
      render: (_, row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDetailRun(row)}
          title="View details"
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Production</h1>
          <p className="text-sm text-muted-foreground">
            Record production runs: use raw materials (stock decreases) and log produced items.
          </p>
        </div>
        <Button asChild className="bg-primary">
          <Link href="/company/dashboard/production/new">
            <Plus className="mr-2 h-4 w-4" />
            Add production
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable<TableRow>
            data={runs}
            columns={columns}
            loading={isLoading}
            emptyMessage='No production runs yet. Use "Add production" to record your first run.'
            getRowKey={(row) => row.id}
          />
        </CardContent>
      </Card>

      <Dialog open={!!detailRun} onOpenChange={(open) => !open && setDetailRun(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Production run details</DialogTitle>
          </DialogHeader>
          {detailRun && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <DateDisplay date={detailRun.date} />{" "}
                {detailRun.referenceNumber && ` · ${detailRun.referenceNumber}`}
              </div>
              {detailRun.notes && (
                <p className="text-sm">{detailRun.notes}</p>
              )}
              <div>
                <h4 className="font-medium text-sm mb-2">Item Consumed</h4>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left p-2 font-medium">Item</th>
                        <th className="text-right p-2 font-medium">Rate</th>
                        <th className="text-right p-2 font-medium">Qty</th>
                        <th className="text-right p-2 font-medium">Total amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailRun.inputs || []).map((i) => {
                        const qty = Number(i.quantity);
                        const rate = Number(i.unitPrice ?? 0);
                        const totalAmount = qty * rate;
                        return (
                          <tr key={i.id} className="border-b last:border-0">
                            <td className="p-2">{i.rawMaterial?.name ?? "—"}</td>
                            <td className="p-2 text-right">{formatCurrency(rate)}</td>
                            <td className="p-2 text-right">
                              {qty.toLocaleString("en-IN", { minimumFractionDigits: 2 })} {i.rawMaterial?.unit ?? ""}
                            </td>
                            <td className="p-2 text-right">{formatCurrency(totalAmount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50 border-t font-medium">
                        <td className="p-2" colSpan={3}>
                          Total
                        </td>
                        <td className="p-2 text-right">
                          {formatCurrency(
                            (detailRun.inputs || []).reduce(
                              (sum, i) => sum + Number(i.quantity) * Number(i.unitPrice ?? 0),
                              0
                            )
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">Items produced</h4>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left p-2 font-medium">Produced item</th>
                        <th className="text-right p-2 font-medium">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailRun.outputs || []).map((o) => (
                        <tr key={o.id} className="border-b last:border-0">
                          <td className="p-2">{o.productName}</td>
                          <td className="p-2 text-right">
                            {Number(o.quantity).toLocaleString("en-IN", { minimumFractionDigits: 2 })} {o.unit ?? "kg"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
