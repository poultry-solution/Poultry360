"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Search,
  Plus,
  Eye,
  Calendar,
  FileText,
  CreditCard,
} from "lucide-react";
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
import { DataTable, Column } from "@/common/components/ui/data-table";
import { Badge } from "@/common/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/ui/tabs";
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
import { toast } from "sonner";
import {
  useGetLedgerSummary,
  useGetDealerLedgerParties,
  useGetLedgerEntries,
  useAddDealerPayment,
} from "@/fetchers/dealer/dealerLedgerQueries";

export default function DealerLedgerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("parties");
  const [search, setSearch] = useState("");
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Queries
  const { data: summaryData, isLoading: summaryLoading } =
    useGetLedgerSummary();
  const { data: partiesData, isLoading: partiesLoading } =
    useGetDealerLedgerParties(search);
  const { data: entriesData, isLoading: entriesLoading } = useGetLedgerEntries({
    page: 1,
    limit: 100,
  });

  const addPaymentMutation = useAddDealerPayment();

  const summary = summaryData?.data;
  const parties = partiesData?.data || [];
  const entries = entriesData?.data || [];
  // salesData was never fetched - using empty array as fallback
  const sales: any[] = [];

  // Filter sales for selected party
  const partySales =
    selectedPartyId && sales.length > 0
      ? sales.filter(
        (s: any) =>
          (s.customerId === selectedPartyId ||
            s.farmerId === selectedPartyId) &&
          Number(s.dueAmount || 0) > 0
      )
      : [];

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null) return "रू 0.00";
    const numAmount = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(numAmount)) return "रू 0.00";
    return `रू ${numAmount.toFixed(2)}`;
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!selectedPartyId) {
      toast.error("Please select a customer");
      return;
    }

    try {
      // Account-level payment only (no sale selection); backend routes farmers to farmer account
      await addPaymentMutation.mutateAsync({
        customerId: selectedPartyId,
        amount: paymentAmount,
        paymentMethod,
        date: paymentDate,
        notes: paymentNotes || undefined,
      });

      toast.success("Payment recorded successfully");
      setIsAddPaymentOpen(false);
      setSelectedPartyId("");
      setPaymentAmount(0);
      setPaymentMethod("CASH");
      setPaymentNotes("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add payment");
    }
  };

  // Get payments from entries
  const payments = entries.filter(
    (e: any) => e.type === "PAYMENT_RECEIVED" && e.saleId
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dealer Ledger</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Track payments, balances, and transactions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Received</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            {summaryLoading ? (
              <div className="text-lg md:text-2xl font-bold">...</div>
            ) : (
              <div className="text-lg md:text-2xl font-bold text-green-600">
                रू {Math.round(summary?.totalPaymentsReceived || 0)}
              </div>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Total received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Due</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            {summaryLoading ? (
              <div className="text-lg md:text-2xl font-bold">...</div>
            ) : (
              <div className="text-lg md:text-2xl font-bold text-red-600">
                रू {Math.round(summary?.totalDueAmount || 0)}
              </div>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Outstanding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            {partiesLoading ? (
              <div className="text-lg md:text-2xl font-bold">...</div>
            ) : (
              <div className="text-lg md:text-2xl font-bold">{parties.length}</div>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            {summaryLoading ? (
              <div className="text-lg md:text-2xl font-bold">...</div>
            ) : (
              <div className="text-lg md:text-2xl font-bold">
                रू {Math.round(summary?.currentBalance || 0)}
              </div>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Net
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="parties" className="flex-1 md:flex-none">Parties</TabsTrigger>
          <TabsTrigger value="transactions" className="flex-1 md:flex-none">Transactions</TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 md:flex-none">Payments</TabsTrigger>
        </TabsList>

        {/* Parties Tab */}
        <TabsContent value="parties" className="space-y-4">
          {/* Unified Search and Actions */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base md:text-lg">Customers & Balances</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    {parties.length} customers with transactions
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-full sm:w-[180px]"
                    />
                  </div>
                  <Button size="sm" onClick={() => setIsAddPaymentOpen(true)} className="whitespace-nowrap">
                    <Plus className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Add Payment</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={parties}
                loading={partiesLoading}
                emptyMessage="No customers found. Customers with transactions will appear here."
                columns={[
                  {
                    key: 'name',
                    label: 'Customer',
                    width: '140px',
                    render: (val) => <span className="font-medium">{val}</span>
                  },
                  {
                    key: 'contact',
                    label: 'Contact',
                    width: '120px'
                  },
                  {
                    key: 'partyType',
                    label: 'Type',
                    width: '80px',
                    render: (val) => (
                      <Badge variant="secondary" className="text-xs">
                        {val === "FARMER" ? "Farmer" : "Customer"}
                      </Badge>
                    )
                  },
                  {
                    key: 'balance',
                    label: 'Balance',
                    align: 'right',
                    width: '100px',
                    render: (val) => (
                      <span className={val > 0 ? "font-bold text-red-600" : "text-muted-foreground"}>
                        {formatCurrency(val)}
                      </span>
                    )
                  },
                  {
                    key: 'lastTransactionDate',
                    label: 'Last Txn',
                    width: '100px',
                    render: (val) => val ? formatDate(val) : "N/A"
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    align: 'right',
                    width: '100px',
                    render: (_, row) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedPartyId(row.id);
                          setIsAddPaymentOpen(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden sm:inline">Payment</span>
                      </Button>
                    )
                  }
                ] as Column[]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Unified Transactions DataTable */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">All Transactions</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {entries.length} ledger entries
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={entries}
                loading={entriesLoading}
                emptyMessage="No transactions found. Transactions will appear here once sales are created."
                columns={[
                  {
                    key: 'date',
                    label: 'Date',
                    width: '100px',
                    render: (val) => formatDate(val)
                  },
                  {
                    key: 'type',
                    label: 'Type',
                    width: '100px',
                    render: (val) => (
                      <Badge
                        variant={val === "SALE" ? "default" : val === "PAYMENT_RECEIVED" ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {val.replace("_", " ")}
                      </Badge>
                    )
                  },
                  {
                    key: 'description',
                    label: 'Description',
                    width: '150px',
                    render: (val, row) => (
                      <span className="truncate block max-w-[130px]">
                        {val || "N/A"}
                        {row.sale?.invoiceNumber && (
                          <span className="text-xs text-muted-foreground ml-1">({row.sale.invoiceNumber})</span>
                        )}
                      </span>
                    )
                  },
                  {
                    key: 'sale',
                    label: 'Party',
                    width: '100px',
                    render: (val) => val?.customer?.name || val?.farmer?.name || "N/A"
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    align: 'right',
                    width: '100px',
                    render: (val, row) => (
                      <span className={row.type === "SALE" ? "text-red-600" : "text-green-600"}>
                        {row.type === "SALE" ? "+" : "-"}{formatCurrency(val)}
                      </span>
                    )
                  },
                  {
                    key: 'balance',
                    label: 'Balance',
                    align: 'right',
                    width: '90px',
                    render: (val) => <span className="font-medium">{formatCurrency(val)}</span>
                  }
                ] as Column[]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          {/* Unified Payments DataTable */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Payment History</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {payments.length} payments received
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={payments}
                loading={false}
                emptyMessage="No payments found. Payments will appear here once received."
                columns={[
                  {
                    key: 'date',
                    label: 'Date',
                    width: '100px',
                    render: (val) => formatDate(val)
                  },
                  {
                    key: 'sale',
                    label: 'Invoice',
                    width: '100px',
                    render: (val) => val?.invoiceNumber || "N/A"
                  },
                  {
                    key: 'sale',
                    label: 'Customer',
                    width: '130px',
                    render: (val) => val?.customer?.name || val?.farmer?.name || "N/A"
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    align: 'right',
                    width: '100px',
                    render: (val) => (
                      <span className="font-medium text-green-600">{formatCurrency(val)}</span>
                    )
                  },
                  {
                    key: 'saleId',
                    label: 'Actions',
                    width: '80px',
                    render: (val, row) => val ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => router.push(`/dealer/dashboard/sales/${val}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    ) : null
                  }
                ] as Column[]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Payment Dialog - account-level only (no sale selection); backend routes farmers to farmer account */}
      <Dialog
        open={isAddPaymentOpen}
        onOpenChange={(open) => {
          setIsAddPaymentOpen(open);
          if (!open) setSelectedPartyId("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record an account-level payment. Select a customer; for connected farmers, payment is applied to their farmer account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Customer Info */}
            {selectedPartyId && (
              <div className="space-y-2">
                <Label>Customer</Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {parties.find((p: any) => p.id === selectedPartyId)?.name || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {parties.find((p: any) => p.id === selectedPartyId)?.contact || ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className={`font-bold ${Number(parties.find((p: any) => p.id === selectedPartyId)?.balance || 0) > 0
                        ? "text-red-600"
                        : Number(parties.find((p: any) => p.id === selectedPartyId)?.balance || 0) < 0
                          ? "text-green-600"
                          : ""
                        }`}>
                        {formatCurrency(parties.find((p: any) => p.id === selectedPartyId)?.balance || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sale Selection - Optional */}
            <div className="space-y-2">
              <Label htmlFor="party">Customer *</Label>
              <Select
                value={selectedPartyId || ""}
                onValueChange={setSelectedPartyId}
              >
                <SelectTrigger id="party">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((party: any) => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.name}
                      {party.partyType === "FARMER" ? " (Farmer)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPartyId && (
                <div className="p-3 bg-muted rounded-md text-sm">
                  <span className="text-muted-foreground">Balance: </span>
                  <span
                    className={
                      Number(parties.find((p: any) => p.id === selectedPartyId)?.balance || 0) > 0
                        ? "font-bold text-red-600"
                        : Number(parties.find((p: any) => p.id === selectedPartyId)?.balance || 0) < 0
                          ? "font-bold text-green-600"
                          : "font-medium"
                    }
                  >
                    {formatCurrency(parties.find((p: any) => p.id === selectedPartyId)?.balance || 0)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Payment Date *</Label>
              <Input
                id="date"
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
                placeholder="Add payment notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddPaymentOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={addPaymentMutation.isPending}
            >
              {addPaymentMutation.isPending ? "Adding..." : "Add Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

