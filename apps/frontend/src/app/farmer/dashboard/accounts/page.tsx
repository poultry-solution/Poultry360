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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
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
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useGetAllAccountTransactions } from "@/fetchers/account/accountQueries";
import { useRouter } from "next/navigation";
import { AccountTransaction } from "@/fetchers/account/accountQueries";
import { useGetAllDealers } from "@/fetchers/dealers/dealerQueries";
import {
  useGetFarmerPaymentRequests,
  useGetFarmerPaymentRequestStats,
  useCreateFarmerPaymentRequest,
} from "@/fetchers/farmer/farmerPaymentRequestQueries";
import { toast } from "sonner";

type EntityType = "ALL" | "DEALER" | "HATCHERY" | "CUSTOMER" | "MEDICINE_SUPPLIER";

export default function AccountsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<EntityType>("ALL");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Payment dialog state
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");

  // Build filters for API
  const filters = useMemo(() => {
    const apiFilters: Record<string, any> = {
      page: 1,
      limit: 100,
    };

    if (activeTab !== "ALL" && activeTab) {
      apiFilters.entityType = activeTab;
    }

    if (transactionTypeFilter && transactionTypeFilter.trim() !== "") {
      apiFilters.transactionType = transactionTypeFilter;
    }

    if (startDate && startDate.trim() !== "") {
      apiFilters.startDate = startDate;
    }

    if (endDate && endDate.trim() !== "") {
      apiFilters.endDate = endDate;
    }

    if (search && search.trim() !== "") {
      apiFilters.search = search;
    }

    console.log("Account filters:", apiFilters); // Debug log
    return apiFilters;
  }, [activeTab, transactionTypeFilter, startDate, endDate, search]);

  const { data, isLoading, error } = useGetAllAccountTransactions(filters);

  console.log("Account query state:", { isLoading, error, dataLength: data?.data?.length }); // Debug log

  const transactions = data?.data || [];
  const pagination = data?.pagination;

  // Dealer-specific queries (only fetch when DEALER tab is active)
  const { data: dealersData, isLoading: dealersLoading } = useGetAllDealers();
  const { data: paymentRequestsData, isLoading: requestsLoading } = useGetFarmerPaymentRequests(
    {},
    { enabled: activeTab === "DEALER" }
  );
  const { data: statsData } = useGetFarmerPaymentRequestStats(
    { enabled: activeTab === "DEALER" }
  );

  const dealers = dealersData?.data || [];
  const paymentRequests = paymentRequestsData?.data || [];
  const stats = statsData?.data || { pending: 0, approved: 0, rejected: 0, total: 0, pendingAmount: 0 };

  // Mutation for creating payment request
  const createPaymentRequest = useCreateFarmerPaymentRequest();

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

  // Payment dialog handlers
  const openPaymentDialog = (dealer: any) => {
    setSelectedDealer(dealer);
    setIsPaymentDialogOpen(true);
    setPaymentAmount("");
    setPaymentMethod("CASH");
    setPaymentReference("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");
  };

  const closePaymentDialog = () => {
    setIsPaymentDialogOpen(false);
    setSelectedDealer(null);
    setPaymentAmount("");
    setPaymentMethod("CASH");
    setPaymentReference("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");
  };

  const handleCreatePaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDealer || !paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      await createPaymentRequest.mutateAsync({
        dealerId: selectedDealer.id,
        amount: Number(paymentAmount),
        paymentMethod,
        paymentReference: paymentReference || undefined,
        paymentDate: paymentDate || undefined,
        description: paymentNotes || undefined,
      });

      toast.success("Payment request created! Awaiting dealer approval.");
      closePaymentDialog();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create payment request");
    }
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null) return "₹0.00";
    const numAmount = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(numAmount)) return "₹0.00";
    return `₹${numAmount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    if (status === "PENDING") return <Clock className="h-4 w-4" />;
    if (status === "APPROVED") return <CheckCircle2 className="h-4 w-4" />;
    if (status === "REJECTED") return <XCircle className="h-4 w-4" />;
    return null;
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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Account Ledger</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Bookkeeping for all transactions.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg overflow-x-auto">
        {[
          { id: "ALL", label: "All", icon: BookOpen },
          { id: "DEALER", label: "Dealers", icon: Users },
          { id: "HATCHERY", label: "Hatchery", icon: Egg },
          { id: "CUSTOMER", label: "Customers", icon: ShoppingCart },
          { id: "MEDICINE_SUPPLIER", label: "Meds", icon: Pill },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.id as EntityType)}
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap"
          >
            <tab.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.id === "ALL" ? "All" : tab.id === "DEALER" ? "D" : tab.id === "HATCHERY" ? "H" : tab.id === "CUSTOMER" ? "C" : "M"}</span>
          </Button>
        ))}
      </div>

      {/* Conditional Content Based on Active Tab */}
      {activeTab === "DEALER" ? (
        <>
          {/* Dealer Tab Content */}
          <div className="grid gap-2 grid-cols-3 mb-4">
            <Card>
              <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
                <CardTitle className="text-[10px] md:text-sm font-medium">Dealers</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold">{dealers.length}</div>
                <p className="text-[9px] md:text-xs text-muted-foreground">Connected</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
                <CardTitle className="text-[10px] md:text-sm font-medium">Due</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold text-red-600">
                  <span className="hidden md:inline">रू</span>{dealers.reduce((sum: number, d: any) => sum + Math.max(0, d.balance || 0), 0).toLocaleString()}
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground">Outstanding</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
                <CardTitle className="text-[10px] md:text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-[9px] md:text-xs text-muted-foreground">Requests</p>
              </CardContent>
            </Card>
          </div>

          {/* Dealers Table */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Dealers & Balances</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {dealers.length} dealer{dealers.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {dealersLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-sm">Loading...</span>
                </div>
              ) : dealers.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-base font-semibold mb-1">No dealers found</h3>
                  <p className="text-sm text-muted-foreground">Dealers will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Contact</TableHead>
                        <TableHead className="text-xs text-right">Due</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Last Txn</TableHead>
                        <TableHead className="text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dealers.map((dealer: any) => (
                        <TableRow key={dealer.id}>
                          <TableCell className="font-medium text-xs md:text-sm max-w-[100px] truncate">{dealer.name}</TableCell>
                          <TableCell className="text-xs hidden md:table-cell">{dealer.contact || "N/A"}</TableCell>
                          <TableCell className="text-right text-xs">
                            <span
                              className={
                                dealer.balance > 0
                                  ? "font-bold text-red-600"
                                  : dealer.balance < 0
                                    ? "font-bold text-green-600"
                                    : "text-muted-foreground"
                              }
                            >
                              {dealer.balance > 0
                                ? `रू${dealer.balance.toLocaleString()}`
                                : dealer.balance < 0
                                  ? `रू${Math.abs(dealer.balance).toLocaleString()}`
                                  : "रू0"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs hidden sm:table-cell">
                            {dealer.lastTransactionDate ? (
                              <DateDisplay
                                date={dealer.lastTransactionDate}
                                format="long"
                              />
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {dealer.balance > 0 ? (
                              <Button
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => openPaymentDialog(dealer)}
                              >
                                <Plus className="h-3.5 w-3.5 md:mr-1" />
                                <span className="hidden md:inline">Pay</span>
                              </Button>
                            ) : dealer.balance < 0 ? (
                              <span className="text-[10px] md:text-xs text-green-600 font-medium">
                                Credit
                              </span>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Requests Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Requests</CardTitle>
              <CardDescription>
                Track status of your payment requests to dealers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading requests...</span>
                </div>
              ) : paymentRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payment requests yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request #</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm">
                          {request.requestNumber}
                        </TableCell>
                        <TableCell>{request.dealer?.name || "N/A"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(request.amount)}
                        </TableCell>
                        <TableCell>
                          {request.isLedgerLevel ? (
                            <Badge variant="secondary">General Payment</Badge>
                          ) : (
                            <Badge variant="outline">
                              Bill: {request.dealerSale?.invoiceNumber || "N/A"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(request.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(request.status)}
                              {request.status}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                        <DateDisplay date={request.createdAt} format="long" />
                      </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Filters (for non-Dealer tabs) */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Filter className="h-4 w-4 md:h-5 md:w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="grid gap-2 md:gap-4 grid-cols-2 lg:grid-cols-5">
                <div className="col-span-2 lg:col-span-1">
                  <Label htmlFor="search" className="text-xs">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="transactionType" className="text-xs">Type</Label>
                  <Select
                    value={transactionTypeFilter}
                    onValueChange={(value) => setTransactionTypeFilter(value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="PURCHASE">Purchase</SelectItem>
                      <SelectItem value="PAYMENT">Payment</SelectItem>
                      <SelectItem value="RECEIPT">Receipt</SelectItem>
                      <SelectItem value="SALE">Sale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <DateInput
                    label="From"
                    value={startDate}
                    onChange={(value) => {
                      const datePart = value.includes("T") ? value.split("T")[0] : value;
                      setStartDate(datePart);
                    }}
                  />
                </div>
                <div>
                  <DateInput
                    label="To"
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
                    size="sm"
                    className="text-xs w-full"
                    onClick={() => {
                      setActiveTab("ALL");
                      setTransactionTypeFilter("");
                      setStartDate("");
                      setEndDate("");
                      setSearch("");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">All Transactions</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {pagination
                  ? `${pagination.total} transactions`
                  : "Loading..."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-sm">Loading...</span>
                </div>
              ) : error ? (
                <div className="text-center py-6">
                  <p className="text-red-600 text-sm">Failed to load. Try again.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable
                    data={transactions}
                    columns={columns}
                    showFooter={true}
                    footerContent={
                      <div className="flex items-center justify-between text-xs text-muted-foreground px-3 py-2">
                        <span>
                          {transactions.length} of {pagination?.total || 0}
                        </span>
                        <span>
                          Page {pagination?.page || 1}/{pagination?.totalPages || 1}
                        </span>
                      </div>
                    }
                    emptyMessage="No transactions found"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Payment Request</DialogTitle>
            <DialogDescription>
              Submit a general payment to {selectedDealer?.name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePaymentRequest}>
            <div className="space-y-4 py-4">
              {/* Dealer Info Display */}
              {selectedDealer && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm"><strong>Dealer:</strong> {selectedDealer.name}</p>
                  <p className="text-sm"><strong>Current Balance:</strong> {formatCurrency(selectedDealer.balance)}</p>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference / Bill ID</Label>
                <Input
                  id="reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction ID / Bill #"
                />
              </div>

              <div className="space-y-2">
                <DateInput
                  label="Payment Date"
                  value={paymentDate}
                  onChange={(v) =>
                    setPaymentDate(v.includes("T") ? v.split("T")[0] : v)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Additional details"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closePaymentDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPaymentRequest.isPending}
              >
                {createPaymentRequest.isPending ? "Submitting..." : "Create Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

