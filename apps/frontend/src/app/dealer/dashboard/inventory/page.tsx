"use client";

import { useState } from "react";
import { Search, Package, AlertTriangle, TrendingUp } from "lucide-react";
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
  useGetDealerProducts,
  useGetInventorySummary,
} from "@/fetchers/dealer/dealerProductQueries";
import { useI18n } from "@/i18n/useI18n";

export default function DealerInventoryPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  // Queries
  const { data: summaryData, isLoading: summaryLoading } = useGetInventorySummary();
  const { data: productsData, isLoading } = useGetDealerProducts({
    page,
    limit: 10,
    search,
    type: typeFilter || undefined,
  });

  const summary = summaryData?.data;
  const products = productsData?.data || [];
  const pagination = productsData?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("dealer.inventory.title")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("dealer.inventory.subtitle")}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("dealer.inventory.stats.products")}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {summaryLoading ? "..." : summary?.totalProducts || 0}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {t("dealer.inventory.stats.inInventory")}
            </p>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("dealer.inventory.stats.totalValue")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold">
              रू {summaryLoading ? "..." : (summary?.totalInventoryValue?.toFixed(2) || "0.00")}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {t("dealer.inventory.stats.atCost")}
            </p>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("dealer.inventory.stats.lowStock")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-yellow-600">
              {summaryLoading ? "..." : summary?.lowStockProducts || 0}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {t("dealer.inventory.stats.belowMin")}
            </p>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("dealer.inventory.stats.outOfStock")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-red-600">
              {summaryLoading ? "..." : summary?.outOfStockProducts || 0}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {t("dealer.inventory.stats.needsRestock")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("dealer.inventory.filters.search")}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => { setTypeFilter(value === "ALL" ? "" : value); setPage(1); }}
            >
              <SelectTrigger className="w-full sm:w-[140px] bg-white">
                <SelectValue placeholder={t("dealer.inventory.filters.allTypes")} />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="ALL">{t("dealer.inventory.filters.allTypes")}</SelectItem>
                <SelectItem value="FEED">{t("dealer.inventory.filters.feed")}</SelectItem>
                <SelectItem value="CHICKS">Chicks</SelectItem>
                <SelectItem value="MEDICINE">Medicine</SelectItem>
                <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                <SelectItem value="OTHER">{t("dealer.inventory.filters.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CardDescription className="text-xs md:text-sm">
            {pagination?.total || 0} {t("dealer.inventory.stats.products")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={products}
            loading={isLoading}
            emptyMessage={t("dealer.inventory.table.empty")}
            columns={[
              {
                key: 'name',
                label: t("dealer.inventory.table.name"),
                width: '180px',
                render: (val, row) => (
                  <div>
                    <span className="font-medium">{val}</span>
                    {row.sku && (
                      <span className="text-xs text-muted-foreground ml-1">({row.sku})</span>
                    )}
                  </div>
                )
              },
              {
                key: 'type',
                label: t("dealer.inventory.table.type"),
                width: '80px',
                render: (val) => (
                  <Badge variant="secondary" className="text-xs">
                    {val}
                  </Badge>
                )
              },
              {
                key: 'unit',
                label: t("dealer.inventory.table.unit"),
                width: '60px'
              },
              {
                key: 'costPrice',
                label: t("dealer.inventory.table.cost"),
                type: 'currency',
                align: 'right',
                width: '100px',
                render: (val) => `रू ${Number(val).toFixed(2)}`
              },
              {
                key: 'sellingPrice',
                label: t("dealer.inventory.table.sell"),
                align: 'right',
                width: '100px',
                render: (val) => (
                  <span className="font-medium">रू {Number(val).toFixed(2)}</span>
                )
              },
              {
                key: 'currentStock',
                label: t("dealer.inventory.table.stock"),
                align: 'right',
                width: '80px',
                render: (val, row) => (
                  <span className={
                    row.minStock && Number(val) <= Number(row.minStock)
                      ? "text-red-600 font-semibold"
                      : ""
                  }>
                    {Number(val).toFixed(2)}
                  </span>
                )
              },
              {
                key: 'minStock',
                label: t("dealer.inventory.table.min"),
                align: 'right',
                width: '70px',
                render: (val) => val ? Number(val).toFixed(2) : '-'
              },
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
