"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Receipt, Search, Filter, Eye, CreditCard, Calendar, FileCheck, Wallet } from "lucide-react";
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
import { DataTable, Column } from "@/common/components/ui/data-table";
import { Badge } from "@/common/components/ui/badge";
import {
  useGetDealerSales,
  type DealerSale,
} from "@/fetchers/dealer/dealerSaleQueries";
import { useI18n } from "@/i18n/useI18n";

export default function DealerSalesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isPaidFilter, setIsPaidFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Get sales
  const { data: salesData, isLoading } = useGetDealerSales({
    page,
    limit: 10,
    search,
    isPaid: isPaidFilter !== "ALL" ? isPaidFilter === "PAID" : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const sales: DealerSale[] = salesData?.data || [];
  const pagination = salesData?.pagination;

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toFixed(2)}`;
  };

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
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder={t("dealer.sales.filters.start")}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1"
              />
              <Input
                type="date"
                placeholder={t("dealer.sales.filters.end")}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1"
              />
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
                    <span>{formatDate(val)}</span>
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
                  const hasDiscount = row.subtotalAmount != null && row.discount;
                  const subtotal = hasDiscount ? Number(row.subtotalAmount) : 0;
                  const total = Number(val);
                  const discountLabel = row.discount
                    ? row.discount.type === "PERCENT"
                      ? t("dealer.sales.table.off", { amount: `${row.discount.value}%` })
                      : t("dealer.sales.table.off", { amount: `रू ${Number(row.discount.value || 0).toFixed(2)}` })
                    : "";
                  return (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-medium">{formatCurrency(total)}</span>
                      {hasDiscount && (
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {t("dealer.sales.table.was", { amount: formatCurrency(subtotal) })}
                          {discountLabel && ` · ${discountLabel}`}
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
                width: '90px',
                render: (_, row) => (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => router.push(`/dealer/dashboard/sales/${row.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {row.accountId ?? row.farmerId ?? row.customer?.farmerId ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          router.push(
                            `/dealer/dashboard/customers/${row.customerId ?? row.farmerId}/account`
                          )
                        }
                        title="View account"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      row.isCredit &&
                      row.dueAmount &&
                      Number(row.dueAmount) > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() =>
                            router.push(
                              `/dealer/dashboard/sales/${row.id}?tab=payments`
                            )
                          }
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                        </Button>
                      )
                    )}
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
    </div>
  );
}
