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
import { useI18n } from "@/i18n/useI18n";

type EntityType = "ALL" | "DEALER" | "HATCHERY" | "CUSTOMER" | "MEDICINE_SUPPLIER";

export default function AccountsPage() {
  const { t } = useI18n();
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
      toast.error(t("farmer.accountLedger.paymentDialog.errors.invalidAmount"));
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

      toast.success(t("farmer.accountLedger.paymentDialog.errors.success"));
      closePaymentDialog();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("farmer.accountLedger.paymentDialog.errors.fail"));
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
    createColumn("date", t("farmer.accountLedger.table.date"), {
      type: "date",
      width: "120px",
      render: (value) => <DateDisplay date={value} format="short" />,
    }),
    createColumn("entityType", t("farmer.accountLedger.table.entityType"), {
      width: "140px",
      render: (value) => {
        const colors: Record<string, string> = {
          DEALER: "bg-blue-100 text-blue-800",
          HATCHERY: "bg-purple-100 text-purple-800",
          CUSTOMER: "bg-green-100 text-green-800",
          MEDICINE_SUPPLIER: "bg-orange-100 text-orange-800",
        };
        const labels: Record<string, string> = {
          DEALER: t("farmer.accountLedger.entityTypes.dealer"),
          HATCHERY: t("farmer.accountLedger.entityTypes.hatchery"),
          CUSTOMER: t("farmer.accountLedger.entityTypes.customer"),
          MEDICINE_SUPPLIER: t("farmer.accountLedger.entityTypes.medicine"),
        };
        return (
          <Badge className={colors[value] || "bg-gray-100 text-gray-800"}>
            {labels[value] || value}
          </Badge>
        );
      },
    }),
    createColumn("entityName", t("farmer.accountLedger.table.entityName"), {
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
    createColumn("type", t("farmer.accountLedger.table.transactionType"), {
      width: "140px",
      render: (value) => {
        const colors: Record<string, string> = {
          PURCHASE: "bg-red-100 text-red-800",
          PAYMENT: "bg-red-100 text-red-800",
          RECEIPT: "bg-green-100 text-green-800",
          SALE: "bg-green-100 text-green-800",
        };
        const labels: Record<string, string> = {
          PURCHASE: t("farmer.accountLedger.transactionTypes.purchase"),
          PAYMENT: t("farmer.accountLedger.transactionTypes.payment"),
          RECEIPT: t("farmer.accountLedger.transactionTypes.receipt"),
          SALE: t("farmer.accountLedger.transactionTypes.sale"),
        };
        return (
          <Badge className={colors[value] || "bg-gray-100 text-gray-800"}>
            {labels[value] || value}
          </Badge>
        );
      },
    }),
    createColumn("description", t("farmer.accountLedger.table.description"), {
      width: "200px",
      render: (value, row) => (
        <div>
          <div className="font-medium">{value || row.itemName || "—"}</div>
          {row.quantity && (
            <div className="text-xs text-gray-500">
              {t("farmer.accountLedger.table.qty", { qty: row.quantity })}
              {row.freeQuantity ? ` ${t("farmer.accountLedger.table.freeQty", { qty: row.freeQuantity })}` : ""}
            </div>
          )}
        </div>
      ),
    }),
    createColumn("debit", t("farmer.accountLedger.table.debit"), {
      type: "currency",
      align: "right",
      width: "120px",
      render: (value) => (
        <span className={value > 0 ? "text-red-600 font-medium" : "text-gray-400"}>
          {value > 0 ? `₹${value.toLocaleString()}` : "—"}
        </span>
      ),
    }),
    createColumn("credit", t("farmer.accountLedger.table.credit"), {
      type: "currency",
      align: "right",
      width: "120px",
      render: (value) => (
        <span className={value > 0 ? "text-green-600 font-medium" : "text-gray-400"}>
          {value > 0 ? `₹${value.toLocaleString()}` : "—"}
        </span>
      ),
    }),
    createColumn("runningBalance", t("farmer.accountLedger.table.balance"), {
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
    createColumn("reference", t("farmer.accountLedger.table.reference"), {
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("farmer.accountLedger.title")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("farmer.accountLedger.subtitle")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg overflow-x-auto">
        {[
          { id: "ALL", label: t("farmer.accountLedger.tabs.all"), icon: BookOpen },
          { id: "DEALER", label: t("farmer.accountLedger.tabs.dealers"), icon: Users },
          { id: "HATCHERY", label: t("farmer.accountLedger.tabs.hatchery"), icon: Egg },
          { id: "CUSTOMER", label: t("farmer.accountLedger.tabs.customers"), icon: ShoppingCart },
          { id: "MEDICINE_SUPPLIER", label: t("farmer.accountLedger.tabs.medicine"), icon: Pill },
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
            <span className="sm:hidden">{tab.id === "ALL" ? t("farmer.accountLedger.filters.allTypes") : tab.id === "DEALER" ? "D" : tab.id === "HATCHERY" ? "H" : tab.id === "CUSTOMER" ? "C" : "M"}</span>
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
                <CardTitle className="text-[10px] md:text-sm font-medium">{t("farmer.accountLedger.dealerTab.stats.dealers")}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold">{dealers.length}</div>
                <p className="text-[9px] md:text-xs text-muted-foreground">{t("farmer.accountLedger.dealerTab.stats.connected")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
                <CardTitle className="text-[10px] md:text-sm font-medium">{t("farmer.accountLedger.dealerTab.stats.due")}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold text-red-600">
                  <span className="hidden md:inline">रू</span>{dealers.reduce((sum: number, d: any) => sum + Math.max(0, d.balance || 0), 0).toLocaleString()}
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground">{t("farmer.accountLedger.dealerTab.stats.outstanding")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
                <CardTitle className="text-[10px] md:text-sm font-medium">{t("farmer.accountLedger.dealerTab.stats.pending")}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-[9px] md:text-xs text-muted-foreground">{t("farmer.accountLedger.dealerTab.stats.requests")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Dealers Table */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">{t("farmer.accountLedger.dealerTab.table.title")}</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {t("farmer.accountLedger.dealerTab.table.subtitle", { count: dealers.length })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {dealersLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-sm">{t("farmer.accountLedger.dealerTab.table.loading")}</span>
                </div>
              ) : dealers.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-base font-semibold mb-1">{t("farmer.accountLedger.dealerTab.table.emptyTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{t("farmer.accountLedger.dealerTab.table.emptyDesc")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">{t("farmer.accountLedger.dealerTab.table.columns.name")}</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">{t("farmer.accountLedger.dealerTab.table.columns.contact")}</TableHead>
                        <TableHead className="text-xs text-right">{t("farmer.accountLedger.dealerTab.table.columns.due")}</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">{t("farmer.accountLedger.dealerTab.table.columns.lastTxn")}</TableHead>
                        <TableHead className="text-xs text-right">{t("farmer.accountLedger.dealerTab.table.columns.action")}</TableHead>
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
                                <span className="hidden md:inline">{t("farmer.accountLedger.dealerTab.table.pay")}</span>
                              </Button>
                            ) : dealer.balance < 0 ? (
                              <span className="text-[10px] md:text-xs text-green-600 font-medium">
                                {t("farmer.accountLedger.dealerTab.table.credit")}
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
              <CardTitle>{t("farmer.accountLedger.dealerTab.requests.title")}</CardTitle>
              <CardDescription>
                {t("farmer.accountLedger.dealerTab.requests.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">{t("farmer.accountLedger.dealerTab.requests.loading")}</span>
                </div>
              ) : paymentRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("farmer.accountLedger.dealerTab.requests.empty")}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("farmer.accountLedger.dealerTab.requests.columns.requestNum")}</TableHead>
                      <TableHead>{t("farmer.accountLedger.dealerTab.requests.columns.dealer")}</TableHead>
                      <TableHead className="text-right">{t("farmer.accountLedger.dealerTab.requests.columns.amount")}</TableHead>
                      <TableHead>{t("farmer.accountLedger.dealerTab.requests.columns.type")}</TableHead>
                      <TableHead>{t("farmer.accountLedger.dealerTab.requests.columns.status")}</TableHead>
                      <TableHead>{t("farmer.accountLedger.dealerTab.requests.columns.date")}</TableHead>
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
                            <Badge variant="secondary">{t("farmer.accountLedger.dealerTab.requests.types.general")}</Badge>
                          ) : (
                            <Badge variant="outline">
                              {t("farmer.accountLedger.dealerTab.requests.types.bill", { billId: request.dealerSale?.invoiceNumber || "N/A" })}
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
                {t("farmer.accountLedger.filters.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="grid gap-2 md:gap-4 grid-cols-2 lg:grid-cols-5">
                <div className="col-span-2 lg:col-span-1">
                  <Label htmlFor="search" className="text-xs">{t("farmer.accountLedger.filters.searchLabel")}</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder={t("farmer.accountLedger.filters.searchPlaceholder")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="transactionType" className="text-xs">{t("farmer.accountLedger.filters.typeLabel")}</Label>
                  <Select
                    value={transactionTypeFilter}
                    onValueChange={(value) => setTransactionTypeFilter(value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t("farmer.accountLedger.filters.allTypes")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("farmer.accountLedger.filters.allTypes")}</SelectItem>
                      <SelectItem value="PURCHASE">{t("farmer.accountLedger.filters.purchase")}</SelectItem>
                      <SelectItem value="PAYMENT">{t("farmer.accountLedger.filters.payment")}</SelectItem>
                      <SelectItem value="RECEIPT">{t("farmer.accountLedger.filters.receipt")}</SelectItem>
                      <SelectItem value="SALE">{t("farmer.accountLedger.filters.sale")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <DateInput
                    label={t("farmer.accountLedger.filters.from")}
                    value={startDate}
                    onChange={(value) => {
                      const datePart = value.includes("T") ? value.split("T")[0] : value;
                      setStartDate(datePart);
                    }}
                  />
                </div>
                <div>
                  <DateInput
                    label={t("farmer.accountLedger.filters.to")}
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
                    {t("farmer.accountLedger.filters.clear")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">{t("farmer.accountLedger.transactions.title")}</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {pagination
                  ? t("farmer.accountLedger.transactions.count", { count: pagination.total })
                  : t("farmer.accountLedger.transactions.loading")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-sm">{t("farmer.accountLedger.transactions.loading")}</span>
                </div>
              ) : error ? (
                <div className="text-center py-6">
                  <p className="text-red-600 text-sm">{t("farmer.accountLedger.transactions.error")}</p>
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
                          {t("farmer.accountLedger.transactions.pageInfo", { count: transactions.length, total: pagination?.total || 0, page: pagination?.page || 1, totalPages: pagination?.totalPages || 1 })}
                        </span>
                      </div>
                    }
                    emptyMessage={t("farmer.accountLedger.transactions.empty")}
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
            <DialogTitle>{t("farmer.accountLedger.paymentDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("farmer.accountLedger.paymentDialog.subtitle", { name: selectedDealer?.name })}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePaymentRequest}>
            <div className="space-y-4 py-4">
              {/* Dealer Info Display */}
              {selectedDealer && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm"><strong>{t("farmer.accountLedger.paymentDialog.dealerInfo")}</strong> {selectedDealer.name}</p>
                  <p className="text-sm"><strong>{t("farmer.accountLedger.paymentDialog.balanceInfo")}</strong> {formatCurrency(selectedDealer.balance)}</p>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-2">
                <Label htmlFor="amount">{t("farmer.accountLedger.paymentDialog.amountLabel")}</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={t("farmer.accountLedger.paymentDialog.amountPlaceholder")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">{t("farmer.accountLedger.paymentDialog.methodLabel")}</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">{t("farmer.accountLedger.paymentDialog.methods.cash")}</SelectItem>
                    <SelectItem value="BANK_TRANSFER">{t("farmer.accountLedger.paymentDialog.methods.bank")}</SelectItem>
                    <SelectItem value="UPI">{t("farmer.accountLedger.paymentDialog.methods.upi")}</SelectItem>
                    <SelectItem value="CHEQUE">{t("farmer.accountLedger.paymentDialog.methods.cheque")}</SelectItem>
                    <SelectItem value="OTHER">{t("farmer.accountLedger.paymentDialog.methods.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">{t("farmer.accountLedger.paymentDialog.referenceLabel")}</Label>
                <Input
                  id="reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={t("farmer.accountLedger.paymentDialog.referencePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <DateInput
                  label={t("farmer.accountLedger.paymentDialog.dateLabel")}
                  value={paymentDate}
                  onChange={(v) =>
                    setPaymentDate(v.includes("T") ? v.split("T")[0] : v)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t("farmer.accountLedger.paymentDialog.notesLabel")}</Label>
                <Input
                  id="notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder={t("farmer.accountLedger.paymentDialog.notesPlaceholder")}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closePaymentDialog}
              >
                {t("farmer.accountLedger.paymentDialog.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createPaymentRequest.isPending}
              >
                {createPaymentRequest.isPending ? t("farmer.accountLedger.paymentDialog.submitting") : t("farmer.accountLedger.paymentDialog.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

