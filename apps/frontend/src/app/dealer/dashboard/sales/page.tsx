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

export default function DealerSalesPage() {
  const router = useRouter();
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sales Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Track and manage sales to your customers
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push("/dealer/dashboard/sale-requests")}
            variant="outline"
            className="flex-1 sm:flex-none hover:bg-green-50 hover:text-green-700 border-green-200"
          >
            <FileCheck className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Sale Requests</span>
            <span className="sm:hidden">Requests</span>
          </Button>
          <Button
            onClick={() => router.push("/dealer/dashboard/sales/new")}
            variant="outline"
            className="flex-1 sm:flex-none hover:bg-green-50 hover:text-green-700 border-green-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">New Sale</span>
            <span className="sm:hidden">New</span>
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
                    placeholder="Search sales..."
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
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sales</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="Start"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1"
              />
              <Input
                type="date"
                placeholder="End"
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
          <CardTitle className="text-base md:text-lg">Sales Records</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {pagination?.total || 0} total sales transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={sales}
            loading={isLoading}
            emptyMessage="No sales found. Record your first sale to get started."
            columns={[
              {
                key: 'invoiceNumber',
                label: 'Invoice',
                width: '100px',
                render: (val, row) => (
                  <span className="font-medium">
                    {val || `#${row.id.slice(0, 8)}`}
                  </span>
                )
              },
              {
                key: 'date',
                label: 'Date',
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
                label: 'Customer',
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
                label: 'Amount',
                align: 'right',
                width: '100px',
                render: (val) => (
                  <span className="font-medium">{formatCurrency(Number(val))}</span>
                )
              },
              {
                key: 'isCredit',
                label: 'Type',
                width: '70px',
                render: (val) => (
                  <Badge variant={val ? "secondary" : "default"} className="text-xs">
                    {val ? "Credit" : "Cash"}
                  </Badge>
                )
              },
              {
                key: 'actions',
                label: 'Actions',
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
