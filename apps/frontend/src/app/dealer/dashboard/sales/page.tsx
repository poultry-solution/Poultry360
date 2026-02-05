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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
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

      {/* Sales Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Sales Records</CardTitle>
          <CardDescription>
            {pagination?.total || 0} total sales transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading sales...</div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sales found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by recording your first sale.
              </p>
              <Button onClick={() => router.push("/dealer/dashboard/sales/new")}>
                <Plus className="mr-2 h-4 w-4" />
                New Sale
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">
                        {sale.invoiceNumber || `#${sale.id.slice(0, 8)}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(sale.date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sale.customer ? (
                          <div>
                            <div className="font-medium">{sale.customer.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {sale.customer.phone}
                            </div>
                          </div>
                        ) : sale.farmer ? (
                          <div>
                            <div className="font-medium">{sale.farmer.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {sale.farmer.phone}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(sale.totalAmount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sale.isCredit ? "secondary" : "default"}>
                          {sale.isCredit ? "Credit" : "Cash"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dealer/dashboard/sales/${sale.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {sale.accountId ?? sale.farmerId ?? sale.customer?.farmerId ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/dealer/dashboard/customers/${sale.customerId ?? sale.farmerId}/account`
                                )
                              }
                              title="View farmer account"
                            >
                              <Wallet className="h-4 w-4" />
                            </Button>
                          ) : (
                            sale.isCredit &&
                            sale.dueAmount &&
                            Number(sale.dueAmount) > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/dealer/dashboard/sales/${sale.id}?tab=payments`
                                  )
                                }
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Sales List - Mobile */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Sales Records</h3>
          <span className="text-sm text-muted-foreground">{pagination?.total || 0} total</span>
        </div>
        {isLoading ? (
          <div className="text-center py-8">Loading sales...</div>
        ) : sales.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-2">No sales found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Record your first sale to get started.
              </p>
              <Button size="sm" onClick={() => router.push("/dealer/dashboard/sales/new")}>
                <Plus className="mr-2 h-4 w-4" />
                New Sale
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {sales.map((sale) => (
              <Card key={sale.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">
                          {sale.invoiceNumber || `#${sale.id.slice(0, 8)}`}
                        </h4>
                        {sale.isCredit && sale.dueAmount && Number(sale.dueAmount) > 0 ? (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Credit</Badge>
                        ) : sale.isCredit ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Paid</Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">Cash</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(sale.date)}
                        {(sale.customer || sale.farmer) && (
                          <> • {sale.customer?.name || sale.farmer?.name}</>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => router.push(`/dealer/dashboard/sales/${sale.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {sale.isCredit && sale.dueAmount && Number(sale.dueAmount) > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => router.push(`/dealer/dashboard/sales/${sale.id}?tab=payments`)}
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Total</span>
                      <p className="font-medium">रू {Number(sale.totalAmount).toFixed(0)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Paid</span>
                      <p className="font-medium">रू {Number(sale.paidAmount).toFixed(0)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Due</span>
                      <p className={`font-medium ${sale.dueAmount && Number(sale.dueAmount) > 0 ? "text-red-600" : ""}`}>
                        {sale.dueAmount && Number(sale.dueAmount) > 0 ? `रू ${Number(sale.dueAmount).toFixed(0)}` : "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Mobile Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">
                  {pagination.page}/{pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
