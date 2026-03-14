"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, Eye, CreditCard, Calendar, FileCheck, User, Phone, Package, FileText, Check, X as XIcon, Wallet } from "lucide-react";
import { DateDisplay } from "@/common/components/ui/date-display";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/common/components/ui/dialog";
import { DataTable, Column } from "@/common/components/ui/data-table";
import { Badge } from "@/common/components/ui/badge";
import {
  useGetDealerSales,
  useGetDealerSaleById,
  type DealerSale,
} from "@/fetchers/dealer/dealerSaleQueries";
import { useI18n } from "@/i18n/useI18n";

export default function DealerSalesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isPaidFilter, setIsPaidFilter] = useState<string>("ALL");
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Get sales
  const { data: salesData, isLoading } = useGetDealerSales({
    page,
    limit: 10,
    search,
    isPaid: isPaidFilter !== "ALL" ? isPaidFilter === "PAID" : undefined,
  });

  // Get selected sale details
  const { data: saleDetailData, isLoading: detailLoading } = useGetDealerSaleById(selectedSaleId || "");

  const sales: DealerSale[] = salesData?.data || [];
  const pagination = salesData?.pagination;
  const sale = saleDetailData?.data;

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toFixed(2)}`;
  };

  // Derived values for the detail modal
  const totalAmount = sale ? Number(sale.totalAmount) : 0;
  const paidAmount = sale ? Number(sale.paidAmount) : 0;
  const dueAmount = sale ? (Number(sale.dueAmount) || 0) : 0;
  const hasDiscount = sale?.subtotalAmount != null && sale?.discount;
  const subtotalAmount = sale?.subtotalAmount != null ? Number(sale.subtotalAmount) : totalAmount;
  const discountLabel = sale?.discount
    ? sale.discount.type === "PERCENT"
      ? `${Number(sale.discount.value)}%`
      : `रू ${Number(sale.discount.value).toFixed(2)}`
    : "";
  const isFarmerAccountSale = Boolean(sale?.accountId ?? sale?.farmerId ?? sale?.customer?.farmerId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("dealer.sales.title")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("dealer.sales.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push("/dealer/dashboard/sale-requests")}
            variant="outline"
            className="flex-1 sm:flex-none hover:bg-green-50 hover:text-green-700 border-green-200"
          >
            <FileCheck className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t("dealer.sales.buttons.requests")}</span>
            <span className="sm:hidden">{t("dealer.sales.buttons.requests")}</span>
          </Button>
          <Button
            onClick={() => router.push("/dealer/dashboard/sales/new")}
            variant="outline"
            className="flex-1 sm:flex-none hover:bg-green-50 hover:text-green-700 border-green-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t("dealer.sales.buttons.newSale")}</span>
            <span className="sm:hidden">{t("dealer.sales.buttons.newSale")}</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("dealer.sales.filters.searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={isPaidFilter}
                onValueChange={setIsPaidFilter}
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder={t("dealer.sales.filters.statusPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("dealer.sales.filters.all")}</SelectItem>
                  <SelectItem value="PAID">{t("dealer.sales.filters.paid")}</SelectItem>
                  <SelectItem value="UNPAID">{t("dealer.sales.filters.unpaid")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table - Unified DataTable */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-lg">{t("dealer.sales.table.title")}</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {t("dealer.sales.table.description", { count: pagination?.total || 0 })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={sales}
            loading={isLoading}
            emptyMessage={t("dealer.sales.table.empty")}
            columns={[
              {
                key: 'invoiceNumber',
                label: t("dealer.sales.table.invoice"),
                width: '100px',
                render: (val, row) => (
                  <span className="font-medium">
                    {val || `#${row.id.slice(0, 8)}`}
                  </span>
                )
              },
              {
                key: 'date',
                label: t("dealer.sales.table.date"),
                width: '110px',
                render: (val) => (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <DateDisplay date={val} />
                  </div>
                )
              },
              {
                key: 'customer',
                label: t("dealer.sales.table.customer"),
                width: '140px',
                render: (val, row) => (
                  val ? (
                    <div>
                      <div className="font-medium truncate max-w-[120px]">{val.name}</div>
                      <div className="text-xs text-muted-foreground">{val.phone}</div>
                    </div>
                  ) : row.farmer ? (
                    <div>
                      <div className="font-medium truncate max-w-[120px]">{row.farmer.name}</div>
                      <div className="text-xs text-muted-foreground">{row.farmer.phone}</div>
                    </div>
                  ) : '-'
                )
              },
              {
                key: 'totalAmount',
                label: t("dealer.sales.table.amount"),
                align: 'right',
                width: '120px',
                render: (val, row) => {
                  const hasDisc = row.subtotalAmount != null && row.discount;
                  const sub = hasDisc ? Number(row.subtotalAmount) : 0;
                  const total = Number(val);
                  const dLabel = row.discount
                    ? row.discount.type === "PERCENT"
                      ? t("dealer.sales.table.off", { amount: `${row.discount.value}%` })
                      : t("dealer.sales.table.off", { amount: `रू ${Number(row.discount.value || 0).toFixed(2)}` })
                    : "";
                  return (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-medium">{formatCurrency(total)}</span>
                      {hasDisc && (
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {t("dealer.sales.table.was", { amount: formatCurrency(sub) })}
                          {dLabel && ` · ${dLabel}`}
                        </span>
                      )}
                    </div>
                  );
                }
              },
              {
                key: 'isCredit',
                label: t("dealer.sales.table.type"),
                width: '70px',
                render: (val) => (
                  <Badge variant={val ? "secondary" : "default"} className="text-xs">
                    {val ? t("dealer.sales.badges.credit") : t("dealer.sales.badges.cash")}
                  </Badge>
                )
              },
              {
                key: 'actions',
                label: t("dealer.sales.table.actions"),
                align: 'right',
                width: '50px',
                render: (_, row) => (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 cursor-pointer"
                      onClick={() => setSelectedSaleId(row.id)}
                      title="View details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              }
            ] as Column[]}
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 md:p-4 border-t">
              <span className="text-xs md:text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Detail Modal */}
      <Dialog open={!!selectedSaleId} onOpenChange={(open) => { if (!open) setSelectedSaleId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Invoice #{sale?.invoiceNumber || sale?.id?.slice(0, 8) || "..."}
            </DialogTitle>
            <DialogDescription>
              {sale ? <span>Sale created on <DateDisplay date={sale.date} format="long" /></span> : "Loading..."}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading sale details...
            </div>
          ) : sale ? (
            <div className="space-y-5 pt-2">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {hasDiscount && (
                  <>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Subtotal</div>
                      <div className="text-lg font-bold">{formatCurrency(subtotalAmount)}</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Discount ({discountLabel})</div>
                      <div className="text-lg font-bold text-green-600">- {formatCurrency(subtotalAmount - totalAmount)}</div>
                    </div>
                  </>
                )}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Total Amount</div>
                  <div className="text-lg font-bold">{formatCurrency(totalAmount)}</div>
                </div>
                {!isFarmerAccountSale && (
                  <>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Paid</div>
                      <div className="text-lg font-bold text-green-600">{formatCurrency(paidAmount)}</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Due</div>
                      <div className="text-lg font-bold text-red-600">{formatCurrency(dueAmount)}</div>
                    </div>
                  </>
                )}
              </div>

              {/* Customer & Payment Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm">Customer Information</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{sale.customer?.name || sale.farmer?.name || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{sale.customer?.phone || sale.farmer?.phone || "N/A"}</span>
                  </div>
                  {sale.customer?.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <Package className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <span>{sale.customer.address}</span>
                    </div>
                  )}
                </div>
                <div className="p-4 border rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm">Payment Information</h4>
                  {isFarmerAccountSale ? (
                    <p className="text-sm text-muted-foreground">Payment tracking is managed in farmer account.</p>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Type</span>
                        <Badge variant={sale.isCredit ? "destructive" : "default"} className="text-xs">
                          {sale.isCredit ? "Credit" : "Cash"}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Method</span>
                        <span className="font-medium">{sale.paymentMethod || "—"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={dueAmount > 0 ? "destructive" : "secondary"} className="text-xs">
                          {dueAmount > 0 ? "Pending" : "Fully Paid"}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Notes */}
              {sale.notes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">{sale.notes}</span>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="p-3 border-b bg-muted/30">
                  <h4 className="font-semibold text-sm">Items Purchased ({sale.items?.length || 0})</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="text-left p-2 pl-3 font-medium">Product</th>
                        <th className="text-right p-2 font-medium">Unit Price</th>
                        <th className="text-right p-2 font-medium">Qty</th>
                        <th className="text-right p-2 pr-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sale.items || []).map((item: any, idx: number) => (
                        <tr key={item.id || idx} className="border-b last:border-0">
                          <td className="p-2 pl-3 font-medium">{item.dealerProduct?.name || item.product?.name || "Product"}</td>
                          <td className="p-2 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                          <td className="p-2 text-right">{Number(item.quantity).toFixed(2)}</td>
                          <td className="p-2 pr-3 text-right font-medium">{formatCurrency(Number(item.totalAmount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t space-y-1">
                  {hasDiscount && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(subtotalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount ({discountLabel})</span>
                        <span className="text-green-600">- {formatCurrency(subtotalAmount - totalAmount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-semibold text-sm">Total Amount</span>
                    <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {!isFarmerAccountSale && sale.payments && sale.payments.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-3 border-b bg-muted/30">
                    <h4 className="font-semibold text-sm">
                      Payment History ({sale.payments.length} payment{sale.payments.length > 1 ? "s" : ""})
                    </h4>
                  </div>
                  <div className="p-3 space-y-2">
                    {sale.payments.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between items-start p-2 bg-muted/20 rounded">
                        <div>
                          <div className="font-medium text-sm">{formatCurrency(Number(payment.amount))}</div>
                          <div className="text-xs text-muted-foreground"><DateDisplay date={payment.paymentDate ?? payment.date} format="long" /></div>
                          {payment.notes && <div className="text-xs text-muted-foreground mt-1">{payment.notes}</div>}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {payment.method ?? payment.paymentMethod ?? "—"}
                        </Badge>
                      </div>
                    ))}
                    <div className="p-3 bg-muted rounded-lg space-y-1 mt-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Amount:</span>
                        <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Total Paid:</span>
                        <span className="font-semibold">{formatCurrency(paidAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-red-600 pt-1 border-t">
                        <span className="font-semibold">Remaining:</span>
                        <span className="font-bold">{formatCurrency(dueAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
