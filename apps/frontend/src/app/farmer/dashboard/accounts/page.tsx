"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Badge } from "@/common/components/ui/badge";
import { DataTable, Column, createColumn } from "@/common/components/ui/data-table";
import { DateInput } from "@/common/components/ui/date-input";
import { DateDisplay } from "@/common/components/ui/date-display";
import {
  BookOpen,
  Users,
  Egg,
  ShoppingCart,
  Pill,
  Search,
  Filter,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useGetAllAccountTransactions } from "@/fetchers/account/accountQueries";
import { useRouter } from "next/navigation";
import { AccountTransaction } from "@/fetchers/account/accountQueries";

type EntityType = "ALL" | "DEALER" | "HATCHERY" | "CUSTOMER" | "MEDICINE_SUPPLIER";

export default function AccountsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<EntityType>("ALL");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Build filters for API
  const filters = useMemo(() => {
    const apiFilters: Record<string, any> = {
      page: 1,
      limit: 100,
    };

    if (activeTab !== "ALL") {
      apiFilters.entityType = activeTab;
    }

    if (transactionTypeFilter) {
      apiFilters.transactionType = transactionTypeFilter;
    }

    if (startDate) {
      apiFilters.startDate = startDate;
    }

    if (endDate) {
      apiFilters.endDate = endDate;
    }

    if (search) {
      apiFilters.search = search;
    }

    return apiFilters;
  }, [activeTab, transactionTypeFilter, startDate, endDate, search]);

  const { data, isLoading, error } = useGetAllAccountTransactions(filters);

  const transactions = data?.data || [];
  const pagination = data?.pagination;

  // Navigate to respective ledger
  const navigateToLedger = (transaction: AccountTransaction) => {
    if (transaction.entityType === "DEALER") {
      router.push("/farmer/dashboard/dealer-ledger");
    } else if (transaction.entityType === "HATCHERY") {
      router.push("/farmer/dashboard/hatchery-ledger");
    } else if (transaction.entityType === "CUSTOMER") {
      router.push("/farmer/dashboard/sales-ledger");
    } else if (transaction.entityType === "MEDICINE_SUPPLIER") {
      router.push("/farmer/dashboard/medical-supplier-ledger");
    }
  };

  // Table columns
  const columns: Column<AccountTransaction>[] = [
    createColumn("date", "Date", {
      type: "date",
      width: "120px",
      render: (value) => <DateDisplay date={value} format="short" />,
    }),
    createColumn("entityType", "Entity Type", {
      width: "140px",
      render: (value) => {
        const colors: Record<string, string> = {
          DEALER: "bg-blue-100 text-blue-800",
          HATCHERY: "bg-purple-100 text-purple-800",
          CUSTOMER: "bg-green-100 text-green-800",
          MEDICINE_SUPPLIER: "bg-orange-100 text-orange-800",
        };
        const labels: Record<string, string> = {
          DEALER: "Dealer",
          HATCHERY: "Hatchery",
          CUSTOMER: "Customer",
          MEDICINE_SUPPLIER: "Medicine",
        };
        return (
          <Badge className={colors[value] || "bg-gray-100 text-gray-800"}>
            {labels[value] || value}
          </Badge>
        );
      },
    }),
    createColumn("entityName", "Entity Name", {
      width: "180px",
      render: (value, row) => (
        <button
          onClick={() => navigateToLedger(row)}
          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
        >
          {value || "N/A"}
          <ExternalLink className="h-3 w-3" />
        </button>
      ),
    }),
    createColumn("type", "Transaction Type", {
      width: "140px",
      render: (value) => {
        const colors: Record<string, string> = {
          PURCHASE: "bg-red-100 text-red-800",
          PAYMENT: "bg-red-100 text-red-800",
          RECEIPT: "bg-green-100 text-green-800",
          SALE: "bg-green-100 text-green-800",
        };
        const labels: Record<string, string> = {
          PURCHASE: "Purchase",
          PAYMENT: "Payment",
          RECEIPT: "Receipt",
          SALE: "Sale",
        };
        return (
          <Badge className={colors[value] || "bg-gray-100 text-gray-800"}>
            {labels[value] || value}
          </Badge>
        );
      },
    }),
    createColumn("description", "Description", {
      width: "200px",
      render: (value, row) => (
        <div>
          <div className="font-medium">{value || row.itemName || "—"}</div>
          {row.quantity && (
            <div className="text-xs text-gray-500">
              Qty: {row.quantity}
              {row.freeQuantity ? ` + ${row.freeQuantity} free` : ""}
            </div>
          )}
        </div>
      ),
    }),
    createColumn("debit", "Debit", {
      type: "currency",
      align: "right",
      width: "120px",
      render: (value) => (
        <span className={value > 0 ? "text-red-600 font-medium" : "text-gray-400"}>
          {value > 0 ? `₹${value.toLocaleString()}` : "—"}
        </span>
      ),
    }),
    createColumn("credit", "Credit", {
      type: "currency",
      align: "right",
      width: "120px",
      render: (value) => (
        <span className={value > 0 ? "text-green-600 font-medium" : "text-gray-400"}>
          {value > 0 ? `₹${value.toLocaleString()}` : "—"}
        </span>
      ),
    }),
    createColumn("runningBalance", "Balance", {
      type: "currency",
      align: "right",
      width: "140px",
      render: (value) => (
        <span
          className={
            value >= 0
              ? "text-green-600 font-semibold"
              : "text-red-600 font-semibold"
          }
        >
          ₹{value.toLocaleString()}
        </span>
      ),
    }),
    createColumn("reference", "Reference", {
      width: "120px",
      render: (value) => (
        <span className="text-sm text-gray-600">{value || "—"}</span>
      ),
    }),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Ledger</h1>
          <p className="text-muted-foreground">
            Central bookkeeping for all transactions across dealers, hatcheries, customers, and sales.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        {[
          { id: "ALL", label: "All", icon: BookOpen },
          { id: "DEALER", label: "Dealers", icon: Users },
          { id: "HATCHERY", label: "Hatcheries", icon: Egg },
          { id: "CUSTOMER", label: "Customers", icon: ShoppingCart },
          { id: "MEDICINE_SUPPLIER", label: "Medicine", icon: Pill },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.id as EntityType)}
            className="flex items-center gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search transactions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="transactionType">Transaction Type</Label>
              <select
                id="transactionType"
                value={transactionTypeFilter}
                onChange={(e) => setTransactionTypeFilter(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All Types</option>
                <option value="PURCHASE">Purchase</option>
                <option value="PAYMENT">Payment</option>
                <option value="RECEIPT">Receipt</option>
                <option value="SALE">Sale</option>
              </select>
            </div>
            <div>
              <DateInput
                label="Start Date"
                value={startDate}
                onChange={(value) => {
                  const datePart = value.includes("T") ? value.split("T")[0] : value;
                  setStartDate(datePart);
                }}
              />
            </div>
            <div>
              <DateInput
                label="End Date"
                value={endDate}
                onChange={(value) => {
                  const datePart = value.includes("T") ? value.split("T")[0] : value;
                  setEndDate(datePart);
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setTransactionTypeFilter("");
                  setStartDate("");
                  setEndDate("");
                  setSearch("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            {pagination
              ? `${pagination.total} total transactions found`
              : "Loading transactions..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading transactions...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">
                Failed to load transactions. Please try again.
              </p>
            </div>
          ) : (
            <DataTable
              data={transactions}
              columns={columns}
              showFooter={true}
              footerContent={
                <div className="flex items-center justify-between text-sm text-muted-foreground px-4 py-2">
                  <span>
                    Showing {transactions.length} of {pagination?.total || 0} transactions
                  </span>
                  <span>
                    Page {pagination?.page || 1} of {pagination?.totalPages || 1}
                  </span>
                </div>
              }
              emptyMessage="No transactions found"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

