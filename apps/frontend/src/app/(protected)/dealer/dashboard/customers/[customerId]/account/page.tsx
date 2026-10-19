"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { DealerSaleBill } from "@/app/(protected)/dealer/dashboard/sales/_components/DealerSaleBill";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  Plus,
  Receipt,
  Loader2,
  Trash2,
  Edit,
  Eye,
  MapPin,
  Phone,
  ReceiptText,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { useGetDealerSales } from "@/fetchers/dealer/dealerSaleQueries";
import {
  dealerLedgerKeys,
  useGetLedgerEntries,
  useDeleteDealerManualGeneralPayment,
} from "@/fetchers/dealer/dealerLedgerQueries";
import axiosInstance from "@/common/lib/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DealerAddPaymentDialog } from "@/components/dealer/DealerAddPaymentDialog";
import { DateDisplay } from "@/common/components/ui/date-display";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { toast } from "sonner";
import { BusinessDownloadDialog, fetchAllPages } from "@/components/downloads/BusinessDownloadDialog";

export default function CustomerAccountPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;
  const PAGE_SIZE = 10;

  const [activeTab, setActiveTab] = useState<"sales" | "payments">("sales");
  // Sale shown in the details popup.
  const [detailsSale, setDetailsSale] = useState<any | null>(null);
  const [billSaleId, setBillSaleId] = useState<string | null>(null);
  const { t } = useI18n();
  const [salesPage, setSalesPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditOpeningOpen, setIsEditOpeningOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState<string>("");
  const [openingDirection, setOpeningDirection] = useState<"OWED" | "ADVANCE">("OWED");
  const [openingNotes, setOpeningNotes] = useState<string>("");
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<{
    id: string;
    amount: number;
  } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const queryClient = useQueryClient();

  const deleteManualPaymentMutation = useDeleteDealerManualGeneralPayment(customerId);

  // Dealer-side customer accounts are now manual-only.
  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ["dealer-customer", customerId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/dealer/sales/customers/${customerId}`);
      return data;
    },
    enabled: !!customerId,
  });

  const customer = customerData?.data;
  const partyId = customerId;

  // Sales
  const { data: salesData, isFetching: salesFetching } = useGetDealerSales(
    { customerId, page: salesPage, limit: PAGE_SIZE },
    { keepPrevious: true }
  );

  // Payments
  const { data: paymentsData, isFetching: paymentsFetching } = useGetLedgerEntries(
    { partyId, type: "PAYMENT_RECEIVED,PAYMENT_MADE", page: paymentsPage, limit: PAGE_SIZE },
    { keepPrevious: true }
  );

  const sales = salesData?.data || [];
  const salesPagination = salesData?.pagination;
  const payments = paymentsData?.data || [];
  const paymentsPagination = paymentsData?.pagination;
  const totalSales = Number(customer?.totalSales ?? 0);
  const totalPaid = Number(customer?.totalPayments ?? 0);
  const currentBalance = Number(customer?.balance ?? 0);
  const openingBalance = customer?.openingBalance;

  const downloadStatement = async (range: { startDate?: string; endDate?: string }) => {
    const [allSales, allPayments] = await Promise.all([
      fetchAllPages(async (page, limit) => {
        const { data } = await axiosInstance.get("/dealer/sales", { params: { customerId, page, limit, ...range } });
        return { rows: data.data || [], totalPages: data.pagination?.totalPages };
      }),
      fetchAllPages(async (page, limit) => {
        const { data } = await axiosInstance.get("/dealer/ledger", { params: { partyId: customerId, type: "PAYMENT_RECEIVED,PAYMENT_MADE", page, limit, ...range } });
        return { rows: data.data || [], totalPages: data.pagination?.totalPages };
      }),
    ]);
    const salesRows = allSales.map((sale: any) => ({ date: sale.date, type: "Sale", reference: sale.invoiceNumber || sale.id?.slice(0, 8), amount: Number(sale.totalAmount || 0), note: sale.notes || "" }));
    const paymentRows = allPayments.map((payment: any) => ({
      date: payment.date,
      type: payment.type === "PAYMENT_MADE" ? "Payment made" : "Payment received",
      direction: payment.direction || (payment.type === "PAYMENT_MADE" ? "MADE" : "RECEIVED"),
      reference: payment.reference || "",
      amount: Number(payment.amount || 0),
      note: payment.description || "",
    }));
    const rawOpeningAmount = Number(openingBalance?.amount || 0);
    const openingAmount = Number.isFinite(rawOpeningAmount) ? rawOpeningAmount : 0;
    const columns = [
        { label: "Date", value: (row: any) => new Date(row.date).toLocaleDateString() },
        { label: "Type", value: (row: any) => row.type },
        { label: "Direction", value: (row: any) => row.direction || "" },
        { label: "Reference", value: (row: any) => row.reference },
        { label: "Amount", value: (row: any) => row.amount.toFixed(2) },
        { label: "Note", value: (row: any) => row.note },
      ];
    return {
      sections: [
        { title: "Sales", columns, rows: salesRows },
        { title: "Payments", columns, rows: paymentRows },
      ],
      summary: [
        {
          label: "Opening balance",
          value: openingAmount === 0
            ? "Rs 0.00"
            : `Rs ${Math.abs(openingAmount).toFixed(2)} (${openingAmount > 0 ? "customer owes me" : "advance"})`,
        },
        { label: "Current balance", value: `Rs ${(Math.round(currentBalance * 100) / 100).toFixed(2)}` },
        { label: "Sales", value: `Rs ${(Math.round(allSales.reduce((sum: number, sale: any) => sum + Number(sale.totalAmount || 0), 0) * 100) / 100).toFixed(2)}` },
        { label: "Payments", value: `Rs ${(Math.round(allPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0) * 100) / 100).toFixed(2)}` },
      ],
    };
  };

  const formatCurrency = (amount: number) => {
    return `रू ${(Math.round(amount * 100) / 100).toFixed(2)}`;
  };

  const salesTotalRows = Number(salesPagination?.total ?? 0);
  const salesTotalPages = Math.max(1, Number(salesPagination?.totalPages ?? 1));
  const salesCurrentPage = Math.min(Math.max(1, Number(salesPagination?.page ?? salesPage)), salesTotalPages);

  const paymentsTotalRows = Number(paymentsPagination?.total ?? 0);
  const paymentsTotalPages = Math.max(1, Number(paymentsPagination?.totalPages ?? 1));
  const paymentsCurrentPage = Math.min(Math.max(1, Number(paymentsPagination?.page ?? paymentsPage)), paymentsTotalPages);

  useEffect(() => {
    if (salesPage > salesTotalPages) {
      setSalesPage(salesTotalPages);
    }
  }, [salesPage, salesTotalPages]);

  useEffect(() => {
    if (paymentsPage > paymentsTotalPages) {
      setPaymentsPage(paymentsTotalPages);
    }
  }, [paymentsPage, paymentsTotalPages]);

  const openEditOpening = () => {
    const amt = Number(openingBalance?.amount ?? 0);
    setOpeningDirection(amt < 0 ? "ADVANCE" : "OWED");
    setOpeningAmount(String(Math.abs(amt || 0)));
    setOpeningNotes(openingBalance?.notes ?? "");
    setIsEditOpeningOpen(true);
  };

  const saveOpening = async () => {
    const amt = Number(openingAmount || 0);
    if (Number.isNaN(amt) || amt < 0) {
      toast.error("Opening balance must be a non-negative number");
      return;
    }
    const signed = amt === 0 ? 0 : openingDirection === "ADVANCE" ? -amt : amt;
    try {
      await axiosInstance.post(`/dealer/sales/customers/${customerId}/opening-balance`, {
        openingBalance: signed,
        notes: openingNotes.trim() || undefined,
      });
      toast.success("Opening balance updated");
      setIsEditOpeningOpen(false);
      queryClient.invalidateQueries({ queryKey: ["dealer-customer", customerId] });
      queryClient.invalidateQueries({ queryKey: ["dealer-ledger", "party", customerId] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to update opening balance");
    }
  };

  const confirmDeleteManualPayment = async () => {
    if (!deletePaymentTarget) return;
    if (!deletePassword.trim()) {
      toast.error("Enter your password to confirm");
      return;
    }
    try {
      await deleteManualPaymentMutation.mutateAsync({
        ledgerEntryId: deletePaymentTarget.id,
        password: deletePassword,
      });
      toast.success("Payment deleted and balances updated");
      setDeletePaymentTarget(null);
      setDeletePassword("");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to delete payment");
    }
  };

  const backLink = (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 px-2 text-muted-foreground"
      onClick={() => router.push("/dealer/dashboard/customers")}
    >
      <ArrowLeft className="mr-1.5 h-4 w-4" />
      Customers
    </Button>
  );

  if (customerLoading) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
          Loading account…
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
          Customer not found
        </div>
      </div>
    );
  }

  const money = (value: number) => formatCurrency(Number(value || 0));
  const signedTone = (value: number) => (value > 0 ? "text-red-600" : value < 0 ? "text-green-600" : "");
  const openingAmountValue = Number(openingBalance?.amount ?? 0);

  const itemsSummary = (sale: any) => {
    const items: any[] = Array.isArray(sale.items) ? sale.items : [];
    if (items.length === 0) return "—";
    if (items.length > 1) return `${items.length} items`;
    const item = items[0];
    const name = item.product?.name || item.dealerProduct?.name || (sale.isChickenSale ? "Broiler" : "Product");
    return `${name} · ${Number(item.quantity)}${item.unit ? ` ${item.unit}` : ""}`;
  };

  const discountLabel = (sale: any) =>
    sale.discount
      ? sale.discount.type === "PERCENT"
        ? `${sale.discount.value}%`
        : money(Number(sale.discount.value))
      : null;

  const paymentKind = (payment: any) =>
    payment.type === "PAYMENT_MADE"
      ? payment.affectsCustomerBalance === true ? "Advance" : "Payout"
      : "Received";

  const canDeletePayment = (payment: any) =>
    (payment.type === "PAYMENT_RECEIVED" || payment.affectsCustomerBalance === true) && !payment.saleId;

  const iconButton = (label: string, onClick: () => void, icon: React.ReactNode, danger = false) => (
    <Button
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      className={`h-8 w-8 p-0 ${danger ? "text-muted-foreground hover:text-red-600" : ""}`}
      onClick={onClick}
    >
      {icon}
    </Button>
  );

  const salesColumns: Column[] = [
    { key: "date", label: "Date", width: "120px", render: (value) => <DateDisplay date={value} /> },
    { key: "invoiceNumber", label: "Invoice", width: "100px", render: (value, row) => value || `#${String(row.id).slice(0, 8)}` },
    { key: "items", label: "Items", width: "170px", render: (_v, row) => <span className="text-sm">{itemsSummary(row)}</span> },
    {
      key: "discount",
      label: "Discount",
      align: "right",
      width: "100px",
      render: (_v, row) => {
        const label = discountLabel(row);
        return label ? <span className="text-green-700">{label}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    { key: "totalAmount", label: "Total", align: "right", width: "120px", render: (value) => <span className="font-semibold">{money(Number(value))}</span> },
    {
      key: "paidAmount",
      label: "Paid at sale",
      align: "right",
      width: "120px",
      render: (value) => Number(value) > 0 ? money(Number(value)) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      width: "60px",
      render: (_v, row) => <div className="flex justify-end">{iconButton("View sale", () => setDetailsSale(row), <Eye className="h-4 w-4" />)}</div>,
    },
  ];

  const paymentColumns: Column[] = [
    { key: "date", label: "Date", width: "120px", render: (_v, row) => <DateDisplay date={row.date || row.paymentDate} /> },
    {
      key: "type",
      label: "Type",
      width: "110px",
      render: (_v, row) => {
        const kind = paymentKind(row);
        return kind === "Received"
          ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Received</Badge>
          : <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{kind}</Badge>;
      },
    },
    { key: "paymentMethod", label: "Method", width: "100px", render: (value) => value ? String(value).replaceAll("_", " ") : "—" },
    { key: "reference", label: "Reference", width: "110px", render: (value) => value || "—" },
    {
      key: "description",
      label: "Note",
      width: "170px",
      render: (_v, row) => <span className="text-xs text-muted-foreground">{row.description ?? row.notes ?? "—"}</span>,
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      width: "120px",
      render: (value, row) => (
        <span className={`font-semibold ${row.type === "PAYMENT_MADE" ? "text-amber-600" : "text-green-600"}`}>
          {row.type === "PAYMENT_MADE" ? "+" : "−"} {money(Number(value))}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      width: "60px",
      render: (_v, row) => canDeletePayment(row) ? (
        <div className="flex justify-end">
          {iconButton("Delete payment", () => {
            setDeletePaymentTarget({ id: row.id, amount: Number(row.amount) });
            setDeletePassword("");
          }, <Trash2 className="h-4 w-4" />, true)}
        </div>
      ) : null,
    },
  ];

  const tabs = [
    { key: "sales" as const, label: "Sales", icon: Receipt, count: salesTotalRows, activeClass: "border-blue-500 text-blue-600" },
    { key: "payments" as const, label: "Payments", icon: Wallet, count: paymentsTotalRows, activeClass: "border-green-500 text-green-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        {backLink}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{customer.name}</h1>
              <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {customer.phone ? (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {customer.phone}
                  </span>
                ) : null}
                {customer.address ? (
                  <span className="flex min-w-0 items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{customer.address}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
            <BusinessDownloadDialog title={`${customer.name} statement`} fileName={`${customer.name}-statement`} getData={downloadStatement} />
            <Button size="sm" onClick={() => setIsPaymentDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Record payment
            </Button>
          </div>
        </div>
      </div>

      {/* Balance + totals: one slim strip (same as the supplier page) */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-gray-200 sm:grid-cols-4">
        <div className="col-span-2 bg-white px-3 py-2 sm:col-span-1">
          <p className="text-[11px] text-muted-foreground">
            {currentBalance > 0 ? "Customer owes you" : currentBalance < 0 ? "Advance from customer" : "Balance"}
          </p>
          <p className={`text-lg font-bold leading-tight ${signedTone(currentBalance)}`}>
            {money(Math.abs(currentBalance))}
          </p>
        </div>
        <div className="bg-white px-3 py-2">
          <div className="flex items-center gap-1">
            <p className="text-[11px] text-muted-foreground">
              Opening {openingAmountValue > 0 ? "(owed)" : openingAmountValue < 0 ? "(advance)" : ""}
            </p>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Edit opening balance"
              title="Edit opening balance"
              onClick={openEditOpening}
            >
              <Edit className="h-3 w-3" />
            </button>
          </div>
          <p className={`text-sm font-semibold leading-tight ${signedTone(openingAmountValue)}`}>
            {money(Math.abs(openingAmountValue))}
          </p>
        </div>
        <div className="bg-white px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Sales</p>
          <p className="text-sm font-semibold leading-tight">{money(totalSales)}</p>
        </div>
        <div className="bg-white px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Payments</p>
          <p className="text-sm font-semibold leading-tight">{money(totalPaid)}</p>
        </div>
      </div>

      {/* Statement */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Account statement</CardTitle>
          <div className="mt-2 flex gap-1 overflow-x-auto border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${active
                    ? tab.activeClass
                    : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeTab === "sales" ? (
            <>
              <DataTable
                data={sales}
                columns={salesColumns}
                loading={salesFetching && sales.length === 0}
                emptyMessage="No sales yet"
                getRowKey={(row: any) => row.id}
              />
              <LedgerPagination
                page={salesCurrentPage}
                totalPages={salesPagination ? salesTotalPages : 0}
                totalRows={salesTotalRows}
                pageLimit={PAGE_SIZE}
                onPageChange={setSalesPage}
                loading={salesFetching}
              />
            </>
          ) : (
            <>
              <DataTable
                data={payments}
                columns={paymentColumns}
                loading={paymentsFetching && payments.length === 0}
                emptyMessage="No payments yet"
                getRowKey={(row: any) => row.id}
              />
              <LedgerPagination
                page={paymentsCurrentPage}
                totalPages={paymentsPagination ? paymentsTotalPages : 0}
                totalRows={paymentsTotalRows}
                pageLimit={PAGE_SIZE}
                onPageChange={setPaymentsPage}
                loading={paymentsFetching}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Sale details */}
      <Dialog open={!!detailsSale} onOpenChange={(open) => !open && setDetailsSale(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-lg">
          {detailsSale ? (
            <>
              <DialogHeader>
                <DialogTitle>Sale {detailsSale.invoiceNumber || ""}</DialogTitle>
                <DialogDescription>
                  <DateDisplay date={detailsSale.date} format="long" />
                </DialogDescription>
              </DialogHeader>
              <div className="divide-y rounded-lg border">
                {(detailsSale.items || []).map((item: any, index: number) => (
                  <div key={item.id ?? index} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 font-medium">
                      {item.product?.name || item.dealerProduct?.name || (detailsSale.isChickenSale ? "Broiler" : "Product")}
                    </span>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <p>
                        {Number(item.quantity)}{item.unit ? ` ${item.unit}` : ""} × {money(Number(item.unitPrice))}
                      </p>
                      <p className="text-sm font-medium text-foreground">{money(Number(item.totalAmount))}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                {discountLabel(detailsSale) ? (
                  <div className="flex justify-between text-green-700">
                    <span>Discount</span>
                    <span>{discountLabel(detailsSale)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{money(Number(detailsSale.totalAmount))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Paid at sale</span>
                  <span>{money(Number(detailsSale.paidAmount || 0))}</span>
                </div>
              </div>
              {detailsSale.notes ? <p className="text-sm text-muted-foreground">Note: {detailsSale.notes}</p> : null}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Close the details first so the bill pop-up can take focus.
                    setBillSaleId(detailsSale.id);
                    setDetailsSale(null);
                  }}
                >
                  <ReceiptText className="mr-2 h-4 w-4" />
                  {t("bills.openBill")}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <DealerAddPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        mode="single"
        customer={{
          id: customer.id,
          name: customer.name,
          phone: customer.phone || "",
          balance: currentBalance,
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["dealer-customer", customerId] });
          queryClient.invalidateQueries({ queryKey: dealerLedgerKeys.party(customerId) });
          queryClient.invalidateQueries({ queryKey: ["dealer-sales"] });
          queryClient.invalidateQueries({ queryKey: ["dealer-customers"] });
          queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] });
        }}
        formatCurrency={(n) => formatCurrency(n)}
      />

      <Dialog
        open={!!deletePaymentTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeletePaymentTarget(null);
            setDeletePassword("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete payment</DialogTitle>
            <DialogDescription>
              This reverses the payment on the customer account balance and dealer
              ledger. Enter your account password to confirm.
              {deletePaymentTarget != null && (
                <span className="block mt-2 font-medium text-foreground">
                  Amount: {formatCurrency(deletePaymentTarget.amount)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-payment-password">Password</Label>
            <Input
              id="delete-payment-password"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirmDeleteManualPayment();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeletePaymentTarget(null);
                setDeletePassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteManualPayment()}
              disabled={deleteManualPaymentMutation.isPending}
            >
              {deleteManualPaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Opening Balance Dialog (manual customers only) */}
      <Dialog open={isEditOpeningOpen} onOpenChange={setIsEditOpeningOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit opening balance</DialogTitle>
            <DialogDescription>
              This will create a new opening balance entry (history is preserved) and update the running balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={openingDirection} onValueChange={(v) => setOpeningDirection(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWED">Customer owes me</SelectItem>
                    <SelectItem value="ADVANCE">I owe customer (advance/credit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                placeholder="Reason / context"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpeningOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveOpening}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DealerSaleBill saleId={billSaleId} onClose={() => setBillSaleId(null)} />
    </div>
  );
}
