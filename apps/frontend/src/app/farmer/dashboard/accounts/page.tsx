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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

      {/* Conditional Content Based on Active Tab */}
      {activeTab === "DEALER" ? (
        <>
          {/* Dealer Tab Content */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Dealers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dealers.length}</div>
                <p className="text-xs text-muted-foreground">Connected dealers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(dealers.reduce((sum, d) => sum + Math.max(0, d.balance || 0), 0))}
                </div>
                <p className="text-xs text-muted-foreground">Amount due to dealers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.pendingAmount)} pending
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Dealers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Dealers & Balances</CardTitle>
              <CardDescription>
                {dealers.length} dealer{dealers.length !== 1 ? "s" : ""} with balance information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dealersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading dealers...</span>
                </div>
              ) : dealers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No dealers found</h3>
                  <p className="text-muted-foreground">
                    Dealers you transact with will appear here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dealer Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
                      <TableHead>Last Transaction</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dealers.map((dealer: any) => (
                      <TableRow key={dealer.id}>
                        <TableCell className="font-medium">{dealer.name}</TableCell>
                        <TableCell>{dealer.contact || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              dealer.balance > 0
                                ? "font-bold text-red-600"
                                : "text-muted-foreground"
                            }
                          >
                            {formatCurrency(dealer.balance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {dealer.lastTransactionDate
                            ? formatDate(dealer.lastTransactionDate)
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          {dealer.balance > 0 && (
                            <Button
                              size="sm"
                              onClick={() => openPaymentDialog(dealer)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Pay
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                        <TableCell>{formatDate(request.createdAt)}</TableCell>
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
                      setActiveTab("ALL");
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
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
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

