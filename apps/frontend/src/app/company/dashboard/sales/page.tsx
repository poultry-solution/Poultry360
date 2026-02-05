"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Receipt, Search, Eye, Calendar } from "lucide-react";
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
  useGetCompanySales,
  type CompanySale,
} from "@/fetchers/company/companySaleQueries";

export default function CompanySalesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Get sales
  const { data: salesData, isLoading } = useGetCompanySales({
    page,
    limit: 10,
    search,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const sales: CompanySale[] = salesData?.data || [];
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
            Track and manage sales to dealers
          </p>
        </div>
        <Button
          onClick={() => router.push("/company/dashboard/sales/new")}
          className="bg-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">New Sale</span>
          <span className="sm:hidden">Create</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search invoice..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="Start"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 sm:w-[130px]"
              />
              <Input
                type="date"
                placeholder="End"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 sm:w-[130px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
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
            emptyMessage="No sales found. Create your first sale to get started."
            columns={[
              {
                key: 'invoiceNumber',
                label: 'Invoice',
                width: '100px',
                render: (val, row) => <span className="font-medium">{val || `#${row.id.slice(0, 8)}`}</span>
              },
              {
                key: 'date',
                label: 'Date',
                width: '100px',
                render: (val) => formatDate(val)
              },
              {
                key: 'dealer',
                label: 'Dealer',
                width: '140px',
                render: (val) => val?.name || '-'
              },
              {
                key: 'totalAmount',
                label: 'Amount',
                align: 'right',
                width: '100px',
                render: (val) => formatCurrency(Number(val))
              },
              {
                key: 'isCredit',
                label: 'Payment',
                width: '80px',
                render: (val, row) => (
                  <Badge variant={val ? "secondary" : "default"} className="text-xs">
                    {val ? "Credit" : row.paymentMethod || "Cash"}
                  </Badge>
                )
              },
              {
                key: 'id',
                label: 'View',
                align: 'right',
                width: '60px',
                render: (val) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => router.push(`/company/dashboard/sales/${val}`)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
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

