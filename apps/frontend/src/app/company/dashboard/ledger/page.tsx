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
  useGetCompanyLedgerSummary,
  useGetCompanyLedgerParties,
  useGetCompanyLedgerEntries,
  useAddCompanyPayment,
} from "@/fetchers/company/companyLedgerQueries";
import { useGetCompanySales } from "@/fetchers/company/companySaleQueries";
import { useGetCompanyDealers } from "@/fetchers/company/companyDealerQueries";

export default function CompanyLedgerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("parties");
  const [search, setSearch] = useState("");
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Queries
  const { data: summaryData, isLoading: summaryLoading } =
    useGetCompanyLedgerSummary();
  const { data: partiesData, isLoading: partiesLoading } =
    useGetCompanyLedgerParties(search);
  const { data: entriesData, isLoading: entriesLoading } =
    useGetCompanyLedgerEntries({
      page: 1,
      limit: 100,
    });
  const { data: salesData } = useGetCompanySales({ limit: 1000 });
  const { data: dealersData } = useGetCompanyDealers({ limit: 100 });

  const addPaymentMutation = useAddCompanyPayment();

  const summary = summaryData?.data;
  const parties = partiesData?.data || [];
  const entries = entriesData?.data || [];
  const sales = salesData?.data || [];
  const dealers = dealersData?.data || [];

  // Filter sales for selected dealer
  const dealerSales =
    selectedDealerId && sales
      ? sales.filter((s: any) => s.dealerId === selectedDealerId)
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
    if (!selectedDealerId || !paymentAmount || paymentAmount <= 0) {
      toast.error("Please select a dealer and enter a valid amount");
      return;
    }

    try {
      await addPaymentMutation.mutateAsync({
        dealerId: selectedDealerId,
        saleId: selectedSaleId || undefined,
        amount: paymentAmount,
        paymentMethod,
        date: paymentDate,
        notes: paymentNotes || undefined,
      });

      toast.success("Payment added successfully");
      setIsAddPaymentOpen(false);
      setSelectedDealerId("");
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
    (e) => e.type === "PAYMENT_RECEIVED" && e.companySaleId
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Ledger</h1>
        <p className="text-muted-foreground">
          Track payments, balances, and transactions with dealers
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
                {formatCurrency(summary?.totalReceived || 0)}
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
                {formatCurrency(summary?.totalDue || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Outstanding balances
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Dealers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {partiesLoading ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <div className="text-2xl font-bold">{parties.length}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Dealers with transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="text-2xl font-bold">...</div>
            ) : (
              <div className="text-2xl font-bold">
                {summary?.pendingRequests || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Payment requests pending
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
                  <CardTitle>Dealers & Balances</CardTitle>
                  <CardDescription>
                    View dealers and their outstanding balances
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search dealers..."
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
                  <h3 className="text-lg font-semibold mb-2">No dealers found</h3>
                  <p className="text-muted-foreground">
                    Dealers with transactions will appear here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dealer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Last Transaction</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parties.map((party) => (
                      <TableRow key={party.id}>
                        <TableCell className="font-medium">
                          {party.name}
                        </TableCell>
                        <TableCell>{party.contact}</TableCell>
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
                                setSelectedDealerId(party.id);
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
                    {entries.map((entry) => (
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
                          {entry.companySale?.invoiceNumber && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({entry.companySale.invoiceNumber})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.companySale?.dealer?.name || "N/A"}
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
                          {formatCurrency(entry.runningBalance)}
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
                All payments received from dealers
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
                      <TableHead>Dealer</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDate(entry.date)}</TableCell>
                        <TableCell>
                          {entry.companySale?.invoiceNumber || "N/A"}
                        </TableCell>
                        <TableCell>
                          {entry.companySale?.dealer?.name || "N/A"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell>
                          {entry.companySaleId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/company/dashboard/sales/${entry.companySaleId}`
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
              Record a payment received from a dealer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dealer">Dealer *</Label>
              <Select
                value={selectedDealerId}
                onValueChange={(value) => {
                  setSelectedDealerId(value);
                  setSelectedSaleId(""); // Reset sale selection
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dealer" />
                </SelectTrigger>
                <SelectContent>
                  {dealers.map((dealer: any) => (
                    <SelectItem key={dealer.id} value={dealer.id}>
                      {dealer.name} - {dealer.contact}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDealerId && dealerSales.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="sale">Sale (Optional)</Label>
                <Select
                  value={selectedSaleId || "GENERAL"}
                  onValueChange={(value) => {
                    setSelectedSaleId(value === "GENERAL" ? "" : value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sale (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">Account Level Payment</SelectItem>
                    {dealerSales.map((sale: any) => (
                        <SelectItem key={sale.id} value={sale.id}>
                          {sale.invoiceNumber || sale.id.slice(0, 8)} - Total:{" "}
                          {formatCurrency(Number(sale.totalAmount || 0))}
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

