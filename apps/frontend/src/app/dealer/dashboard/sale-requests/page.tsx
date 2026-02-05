"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileCheck, Search, Eye, Clock, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
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
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

interface SaleRequest {
  id: string;
  requestNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  totalAmount: number;
  paidAmount: number;
  date: string;
  reviewedAt?: string;
  rejectionReason?: string;
  farmer: {
    id: string;
    name: string;
    phone: string;
    companyName?: string;
  };
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    product: {
      id: string;
      name: string;
      type: string;
      unit: string;
    };
  }>;
  dealerSale?: {
    id: string;
    invoiceNumber: string;
  };
}

export default function DealerSaleRequestsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Get sale requests
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["dealer-sale-requests", page, search, statusFilter],
    queryFn: async () => {
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter !== "ALL") params.status = statusFilter;

      const { data } = await axiosInstance.get("/dealer/sales/requests", {
        params,
      });
      return data;
    },
  });

  // Get statistics
  const { data: statsData } = useQuery({
    queryKey: ["dealer-sale-request-stats"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/dealer/sales/requests/statistics");
      return data;
    },
  });

  const requests: SaleRequest[] = requestsData?.data || [];
  const pagination = requestsData?.pagination;
  const stats = statsData?.data || { pending: 0, approved: 0, rejected: 0, pendingAmount: 0 };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number | string) => {
    return `रू ${Number(amount).toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dealer/dashboard/sales")}
            className="text-xs md:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Back to Sales</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sale Requests</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Track sale requests to farmers
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{stats.pending}</div>
            <p className="text-[9px] md:text-xs text-muted-foreground">
              <span className="hidden md:inline">{formatCurrency(stats.pendingAmount)}</span>
              <span className="md:hidden">रू{Math.round(stats.pendingAmount).toLocaleString()}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{stats.total || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 md:p-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-full sm:w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={requests}
            loading={isLoading}
            emptyMessage="No sale requests. Requests will appear when you create sales."
            columns={[
              {
                key: 'requestNumber',
                label: 'Request',
                width: '90px',
                render: (val) => <span className="font-medium">{val}</span>
              },
              {
                key: 'farmer',
                label: 'Farmer',
                width: '100px',
                render: (val) => (
                  <div>
                    <div className="font-medium truncate max-w-[80px]">{val?.name}</div>
                    <div className="text-[10px] text-muted-foreground">{val?.phone}</div>
                  </div>
                )
              },
              {
                key: 'date',
                label: 'Date',
                width: '80px',
                render: (val) => formatDate(val)
              },
              {
                key: 'items',
                label: 'Items',
                width: '50px',
                render: (val) => val?.length || 0
              },
              {
                key: 'totalAmount',
                label: 'Amount',
                width: '90px',
                render: (val, row) => (
                  <div>
                    <div className="font-medium">{formatCurrency(val)}</div>
                    {row.paidAmount > 0 && (
                      <div className="text-[9px] text-muted-foreground">Paid: रू{Math.round(row.paidAmount).toLocaleString()}</div>
                    )}
                  </div>
                )
              },
              {
                key: 'status',
                label: 'Status',
                width: '100px',
                render: (val) => getStatusBadge(val)
              },
              {
                key: 'actions',
                label: 'View',
                align: 'right',
                width: '60px',
                render: (_, request) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => router.push(`/dealer/dashboard/sale-requests/${request.id}`)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )
              }
            ] as Column[]}
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t">
              <span className="text-xs text-muted-foreground">
                {page}/{pagination.totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Prev
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
