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
import { useGetDealerSales } from "@/fetchers/dealer/dealerSaleQueries";

export default function DealerLedgerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("parties");
  const [search, setSearch] = useState("");
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState("");
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
  const { data: salesData } = useGetDealerSales({ limit: 1000 });

  const addPaymentMutation = useAddDealerPayment();

  const summary = summaryData?.data;
  const parties = partiesData?.data || [];
  const entries = entriesData?.data || [];
  const sales = salesData?.data || [];

  // Filter sales for selected party
  const partySales =
    selectedPartyId && sales
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
    if (!selectedSaleId || !paymentAmount || paymentAmount <= 0) {
      toast.error("Please select a sale and enter a valid amount");
      return;
    }

    try {
      await addPaymentMutation.mutateAsync({
        saleId: selectedSaleId,
        amount: paymentAmount,
        paymentMethod,
        date: paymentDate,
        notes: paymentNotes || undefined,
      });

      toast.success("Payment added successfully");
      setIsAddPaymentOpen(false);
      setSelectedPartyId("");
      setSelectedSaleId("");
      setPaymentAmount(0);
      setPaymentMethod("CASH");
      setPaymentNotes("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add payment");
    }
  };

  // Get payments from entries
  const payments = entries.filter(
    (e) => e.type === "PAYMENT_RECEIVED" && e.saleId
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dealer Ledger</h1>
        <p className="text-muted-foreground">
          Track payments, balances, and transactions with customers
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary?.totalPaymentsReceived || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Total payments received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary?.totalDueAmount || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Outstanding balances
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {partiesLoading ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <div className="text-2xl font-bold">{parties.length}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Customers with transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(summary?.currentBalance || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Net balance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="parties">Parties</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* Parties Tab */}
        <TabsContent value="parties" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Customers & Balances</CardTitle>
                  <CardDescription>
                    View customers and their outstanding balances
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-[200px]"
                    />
                  </div>
                  <Button onClick={() => setIsAddPaymentOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Payment
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {partiesLoading ? (
                <div className="text-center py-8">Loading parties...</div>
              ) : parties.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No customers found</h3>
                  <p className="text-muted-foreground">
                    Customers with transactions will appear here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Last Transaction</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parties.map((party: any) => (
                      <TableRow key={party.id}>
                        <TableCell className="font-medium">
                          {party.name}
                        </TableCell>
                        <TableCell>{party.contact}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {party.partyType === "FARMER" ? "Farmer" : "Customer"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              party.balance > 0
                                ? "font-bold text-red-600"
                                : "text-muted-foreground"
                            }
                          >
                            {formatCurrency(party.balance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {party.lastTransactionDate
                            ? formatDate(party.lastTransactionDate)
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPartyId(party.id);
                                setIsAddPaymentOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Pay
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>
                Complete ledger entries for all transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {entriesLoading ? (
                <div className="text-center py-8">Loading transactions...</div>
              ) : entries.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No transactions found
                  </h3>
                  <p className="text-muted-foreground">
                    Transactions will appear here once sales are created.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDate(entry.date)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.type === "SALE"
                                ? "default"
                                : entry.type === "PAYMENT_RECEIVED"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {entry.type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.description || "N/A"}
                          {entry.sale?.invoiceNumber && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({entry.sale.invoiceNumber})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.sale?.customer?.name ||
                            entry.sale?.farmer?.name ||
                            "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              entry.type === "SALE"
                                ? "text-red-600"
                                : "text-green-600"
                            }
                          >
                            {entry.type === "SALE" ? "+" : "-"}
                            {formatCurrency(entry.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(entry.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                All payments received from customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No payments found
                  </h3>
                  <p className="text-muted-foreground">
                    Payments will appear here once received.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDate(entry.date)}</TableCell>
                        <TableCell>
                          {entry.sale?.invoiceNumber || "N/A"}
                        </TableCell>
                        <TableCell>
                          {entry.sale?.customer?.name ||
                            entry.sale?.farmer?.name ||
                            "N/A"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell>
                          {entry.saleId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/dealer/dashboard/sales/${entry.saleId}`
                                )
                              }
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Sale
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
        </TabsContent>
      </Tabs>

      {/* Add Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a payment received from a customer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPartyId && partySales.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="sale">Sale *</Label>
                <Select
                  value={selectedSaleId || "GENERAL"}
                  onValueChange={(value) => {
                    setSelectedSaleId(value === "GENERAL" ? "" : value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sale" />
                  </SelectTrigger>
                  <SelectContent>
                    {partySales.map((sale: any) => (
                      <SelectItem key={sale.id} value={sale.id}>
                        {sale.invoiceNumber || sale.id.slice(0, 8)} - Due:{" "}
                        {formatCurrency(Number(sale.dueAmount || 0))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="sale">Sale *</Label>
                <Select
                  value={selectedSaleId || "GENERAL"}
                  onValueChange={(value) => {
                    setSelectedSaleId(value === "GENERAL" ? "" : value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sale" />
                  </SelectTrigger>
                  <SelectContent>
                    {sales
                      .filter((s: any) => Number(s.dueAmount || 0) > 0)
                      .map((sale: any) => (
                        <SelectItem key={sale.id} value={sale.id}>
                          {sale.invoiceNumber || sale.id.slice(0, 8)} - Due:{" "}
                          {formatCurrency(Number(sale.dueAmount || 0))}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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

