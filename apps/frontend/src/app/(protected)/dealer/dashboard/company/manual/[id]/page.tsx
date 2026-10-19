"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Building2,
    Phone,
    MapPin,
    ShoppingCart,
    Wallet,
    Package,
    CreditCard,
    Edit,
    Trash2,
    Eye,
    Paperclip,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
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
    useGetManualCompanyStatementTab,
    type StatementTab,
    useSetManualCompanyOpeningBalance,
    useUpdateManualCompany,
    manualCompanyKeys,
    useVoidManualPurchase,
    useVoidManualPayment,
} from "@/fetchers/dealer/dealerManualCompanyQueries";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import { useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { BusinessDownloadDialog, fetchAllPages, filterRowsByDate } from "@/components/downloads/BusinessDownloadDialog";
import {
    ACCOUNT_FEATURE_KEYS,
    useAccountFeature,
} from "@/fetchers/accountFeatureQueries";

const PAGE_SIZE = 10;

const TABS: Array<{ key: StatementTab; label: string; icon: typeof ShoppingCart; activeClass: string; empty: string }> = [
    { key: "purchases", label: "Purchases", icon: ShoppingCart, activeClass: "border-orange-500 text-orange-600", empty: "No purchases recorded yet" },
    { key: "payments", label: "Payments", icon: Wallet, activeClass: "border-green-500 text-green-600", empty: "No payments recorded yet" },
    { key: "settlements", label: "Settlement sales", icon: Package, activeClass: "border-blue-500 text-blue-600", empty: "No settlement sales yet" },
    { key: "adjustments", label: "Adjustments", icon: CreditCard, activeClass: "border-blue-500 text-blue-600", empty: "No adjustments yet" },
    { key: "voided", label: "Deleted", icon: Trash2, activeClass: "border-gray-500 text-gray-700", empty: "No deleted records" },
];

export default function ManualCompanyAccountPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [activeTab, setActiveTab] = useState<StatementTab>("purchases");
    const [page, setPage] = useState(1);
    // Purchase or settlement sale shown in the details popup.
    const [detailsRow, setDetailsRow] = useState<any | null>(null);
    const [isEditOpeningOpen, setIsEditOpeningOpen] = useState(false);
    const [openingAmount, setOpeningAmount] = useState<string>("");
    const [openingDirection, setOpeningDirection] = useState<"OWED" | "ADVANCE">("OWED");
    const [openingNotes, setOpeningNotes] = useState<string>("");
    const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
    const [companyForm, setCompanyForm] = useState({
        name: "",
        phone: "",
        address: "",
    });
    const [voidConfirm, setVoidConfirm] = useState<
        | { kind: "PURCHASE"; id: string; date: any; amount: number }
        | { kind: "PAYMENT"; id: string; date: any; amount: number }
        | null
    >(null);
    const [voidReason, setVoidReason] = useState("");

    const queryClient = useQueryClient();
    const { data, isLoading, isFetching } = useGetManualCompanyStatementTab(id, { type: activeTab, page, limit: PAGE_SIZE });
    const setOpeningMutation = useSetManualCompanyOpeningBalance();
    const updateCompanyMutation = useUpdateManualCompany();
    const voidPurchaseMutation = useVoidManualPurchase();
    const voidPaymentMutation = useVoidManualPayment();
    const { isEnabled: isPurchaseBillEnabled } = useAccountFeature(
        ACCOUNT_FEATURE_KEYS.DEALER_PURCHASE_BILL_UPLOAD
    );
    const { isEnabled: isSupplierSettlementEnabled } = useAccountFeature(
        ACCOUNT_FEATURE_KEYS.DEALER_SUPPLIER_SETTLEMENT_SALES
    );

    const company = data?.company;
    const openingBalance = data?.openingBalance;
    // Rows belong to the tab that was asked for; while a new tab loads, show nothing old.
    const rows = data?.type === activeTab ? data.rows : [];
    const counts = data?.counts;
    const pagination = data?.pagination;
    // "Sell to supplier" is admin-enabled. Show its tab and totals only when the
    // feature is on, or this supplier already has such sales (old data stays visible).
    const showSettlements =
        isSupplierSettlementEnabled ||
        (counts?.settlements ?? 0) > 0 ||
        Number(company?.totalSettlementSales || 0) !== 0;
    const visibleTabs = TABS.filter((tab) => tab.key !== "settlements" || showSettlements);

    // A hidden tab can't stay selected.
    useEffect(() => {
        if (data && activeTab === "settlements" && !showSettlements) {
            setActiveTab("purchases");
            setPage(1);
        }
    }, [data, activeTab, showSettlements]);

    // After a void, the last page can become empty: step back to the new last page.
    useEffect(() => {
        if (!pagination || isFetching) return;
        if (page > 1 && page > pagination.totalPages) setPage(Math.max(1, pagination.totalPages));
    }, [pagination, page, isFetching]);

    const changeTab = (tab: StatementTab) => {
        setActiveTab(tab);
        setPage(1);
    };

    const downloadStatement = async (range: { startDate?: string; endDate?: string }) => {
        const allTransactions = await fetchAllPages(async (page, limit) => {
            const { data: response } = await axiosInstance.get(`/dealer/manual-companies/${id}/statement`, { params: { page, limit } });
            return { rows: response.data?.transactions || [], totalPages: response.data?.pagination?.totalPages };
        });
        const rows = filterRowsByDate(allTransactions, range, (row: any) => row.date);
        const rawOpeningAmount = Number(openingBalance?.amount || 0);
        const openingAmount = Number.isFinite(rawOpeningAmount) ? rawOpeningAmount : 0;
        const columns = [
                { label: "Date", value: (row: any) => new Date(row.date).toLocaleDateString() },
                { label: "Type", value: (row: any) => String(row.type || "").replaceAll("_", " ") },
                { label: "Direction", value: (row: any) => row.direction || "" },
                { label: "Reference", value: (row: any) => row.reference || "" },
                { label: "Amount", value: (row: any) => Number(row.amount || 0).toFixed(2) },
                { label: "Note", value: (row: any) => row.notes || "" },
            ];
        return {
            sections: [
                { title: "Purchases", columns, rows: rows.filter((row: any) => row.type === "PURCHASE") },
                { title: "Payments", columns, rows: rows.filter((row: any) => row.type === "PAYMENT") },
                ...(showSettlements
                    ? [{ title: "Supplier settlement sales", columns, rows: rows.filter((row: any) => row.type === "SUPPLIER_SETTLEMENT_SALE") }]
                    : []),
                { title: "Other records", columns, rows: rows.filter((row: any) => !["PURCHASE", "PAYMENT", "SUPPLIER_SETTLEMENT_SALE"].includes(row.type)) },
            ],
            summary: [
                {
                    label: "Opening balance",
                    value: openingAmount === 0
                        ? "Rs 0.00"
                        : `Rs ${Math.abs(openingAmount).toFixed(2)} (${openingAmount > 0 ? "payable" : "advance"})`,
                },
                { label: "Current balance", value: `Rs ${Number(company?.balance || 0).toFixed(2)}` },
                { label: "Purchases", value: `Rs ${Number(company?.totalPurchases || 0).toFixed(2)}` },
                { label: "Payments", value: `Rs ${Number(company?.totalPayments || 0).toFixed(2)}` },
            ],
        };
    };

    const formatCurrency = (amount: number) => {
        return `रू ${(Math.round(Math.abs(amount) * 100) / 100).toFixed(2)}`;
    };

    const openEditOpening = () => {
        const amt = Number(openingBalance?.amount ?? 0);
        setOpeningDirection(amt < 0 ? "ADVANCE" : "OWED");
        setOpeningAmount(String(Math.abs(amt || 0)));
        setOpeningNotes(openingBalance?.notes ?? "");
        setIsEditOpeningOpen(true);
    };

    const openEditCompany = () => {
        setCompanyForm({
            name: company?.name ?? "",
            phone: company?.phone ?? "",
            address: company?.address ?? "",
        });
        setIsEditCompanyOpen(true);
    };

    const saveCompany = async () => {
        if (!companyForm.name.trim()) {
            toast.error("Company name is required");
            return;
        }
        try {
            await updateCompanyMutation.mutateAsync({
                id,
                name: companyForm.name.trim(),
                phone: companyForm.phone.trim() || undefined,
                address: companyForm.address.trim() || undefined,
            });
            await queryClient.invalidateQueries({ queryKey: manualCompanyKeys.statementBase(id) });
            toast.success("Company details updated");
            setIsEditCompanyOpen(false);
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Failed to update company details");
        }
    };

    const saveOpening = async () => {
        const amt = Number(openingAmount || 0);
        if (Number.isNaN(amt) || amt < 0) {
            toast.error("Opening balance must be a non-negative number");
            return;
        }
        const signed = amt === 0 ? 0 : openingDirection === "ADVANCE" ? -amt : amt;
        try {
            await setOpeningMutation.mutateAsync({
                companyId: id,
                openingBalance: signed,
                notes: openingNotes.trim() || undefined,
            });
            toast.success("Opening balance updated");
            setIsEditOpeningOpen(false);
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Failed to update opening balance");
        }
    };

    const askVoid = (kind: "PURCHASE" | "PAYMENT", row: any) => {
        setVoidReason("");
        setVoidConfirm({ kind, id: row.id, date: row.date, amount: Number(row.amount) });
    };

    const money = (value: number) => `रू ${Number(value || 0).toFixed(2)}`;
    const dateColumn = (label = "Date", key = "date"): Column => ({
        key,
        label,
        width: "130px",
        render: (value) => <DateDisplay date={value} />,
    });
    const itemsSummary = (row: any) => {
        const items: any[] = Array.isArray(row.items) ? row.items : [];
        if (items.length === 0) return "—";
        if (items.length > 1) return `${items.length} items`;
        const item = items[0];
        return `${item.productName ?? item.product?.name ?? "Product"} · ${Number(item.quantity).toFixed(2)} ${item.unit ?? item.product?.unit ?? ""}`;
    };
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

    const columnsFor = (tab: StatementTab): Column[] => {
        if (tab === "purchases") {
            return [
                dateColumn(),
                { key: "items", label: "Items", width: "180px", render: (_v, row) => <span className="text-sm">{itemsSummary(row)}</span> },
                {
                    key: "basicTotal",
                    label: "Basic total",
                    align: "right",
                    width: "120px",
                    render: (_v, row) => money((row.items || []).reduce((sum: number, item: any) => sum + Number(item.totalAmount || 0), 0)),
                },
                {
                    key: "tradeDiscountAmount",
                    label: "Discount",
                    align: "right",
                    width: "110px",
                    render: (value) => Number(value) > 0 ? <span className="text-green-700">− {money(Number(value))}</span> : <span className="text-muted-foreground">—</span>,
                },
                { key: "amount", label: "Net total", align: "right", width: "120px", render: (value) => <span className="font-semibold">{money(Number(value))}</span> },
                ...(isPurchaseBillEnabled
                    ? [{
                        key: "billImageUrl",
                        label: "Bill",
                        align: "center" as const,
                        width: "70px",
                        render: (value: any) => value ? (
                            <a href={value} target="_blank" rel="noopener noreferrer" aria-label="View bill photo" className="inline-flex text-primary">
                                <Paperclip className="h-4 w-4" />
                            </a>
                        ) : <span className="text-muted-foreground">—</span>,
                    }]
                    : []),
                {
                    key: "actions",
                    label: "",
                    align: "right",
                    width: "90px",
                    render: (_v, row) => (
                        <div className="flex justify-end gap-1">
                            {iconButton("View details", () => setDetailsRow(row), <Eye className="h-4 w-4" />)}
                            {iconButton("Delete purchase", () => askVoid("PURCHASE", row), <Trash2 className="h-4 w-4" />, true)}
                        </div>
                    ),
                },
            ];
        }
        if (tab === "payments") {
            return [
                dateColumn(),
                {
                    key: "direction",
                    label: "Type",
                    width: "110px",
                    render: (value) => value === "RECEIVED"
                        ? <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Received</Badge>
                        : <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>,
                },
                { key: "paymentMethod", label: "Method", width: "110px", render: (value) => value ? String(value).replaceAll("_", " ") : "—" },
                { key: "amount", label: "Amount", align: "right", width: "120px", render: (value) => <span className="font-semibold">{money(Number(value))}</span> },
                { key: "balanceAfter", label: "Balance after", align: "right", width: "130px", render: (value) => money(Number(value)) },
                {
                    key: "notes",
                    label: "Note / Ref",
                    width: "160px",
                    render: (_v, row) => <span className="text-xs text-muted-foreground">{[row.notes, row.reference && `Ref: ${row.reference}`].filter(Boolean).join(" · ") || "—"}</span>,
                },
                {
                    key: "actions",
                    label: "",
                    align: "right",
                    width: "60px",
                    render: (_v, row) => <div className="flex justify-end">{iconButton("Delete payment", () => askVoid("PAYMENT", row), <Trash2 className="h-4 w-4" />, true)}</div>,
                },
            ];
        }
        if (tab === "settlements") {
            return [
                dateColumn(),
                { key: "reference", label: "Invoice", width: "110px", render: (value) => value || "—" },
                { key: "items", label: "Items", width: "180px", render: (_v, row) => <span className="text-sm">{itemsSummary(row)}</span> },
                { key: "amount", label: "Amount", align: "right", width: "120px", render: (value) => <span className="font-semibold text-blue-700">− {money(Number(value))}</span> },
                {
                    key: "actions",
                    label: "",
                    align: "right",
                    width: "60px",
                    render: (_v, row) => <div className="flex justify-end">{iconButton("View details", () => setDetailsRow(row), <Eye className="h-4 w-4" />)}</div>,
                },
            ];
        }
        if (tab === "adjustments") {
            return [
                dateColumn(),
                { key: "type", label: "Type", width: "130px", render: (value) => value === "OPENING_BALANCE" ? "Opening balance" : "Adjustment" },
                {
                    key: "amount",
                    label: "Amount",
                    align: "right",
                    width: "140px",
                    render: (value) => {
                        const amount = Number(value);
                        if (amount > 0) return <span className="font-semibold text-red-600">{money(amount)} owed</span>;
                        if (amount < 0) return <span className="font-semibold text-green-600">{money(Math.abs(amount))} advance</span>;
                        return money(0);
                    },
                },
                { key: "balanceAfter", label: "Balance after", align: "right", width: "130px", render: (value) => money(Number(value)) },
                { key: "notes", label: "Note", width: "160px", render: (value) => <span className="text-xs text-muted-foreground">{value || "—"}</span> },
            ];
        }
        return [
            dateColumn("Deleted on", "voidedAt"),
            {
                key: "kind",
                label: "Record",
                width: "150px",
                render: (value, row) => value === "PURCHASE"
                    ? `Purchase${row.itemsCount ? ` · ${row.itemsCount} item${row.itemsCount === 1 ? "" : "s"}` : ""}`
                    : `Payment · ${row.direction === "RECEIVED" ? "Received" : "Paid"}`,
            },
            dateColumn("Original date"),
            { key: "amount", label: "Amount", align: "right", width: "120px", render: (value) => money(Number(value)) },
            { key: "voidedReason", label: "Reason", width: "180px", render: (value) => <span className="text-xs text-muted-foreground">{value || "—"}</span> },
        ];
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                </div>
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">Loading account details...</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                </div>
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">Company not found</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-3">
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 h-8 px-2 text-muted-foreground"
                    onClick={() => router.push("/dealer/dashboard/company")}
                >
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Companies
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                        </span>
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{company.name}</h1>
                            <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                {company.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5" />
                                        {company.phone}
                                    </span>
                                )}
                                {company.address && (
                                    <span className="flex min-w-0 items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{company.address}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                        <BusinessDownloadDialog title={`${company.name} statement`} fileName={`${company.name}-statement`} getData={downloadStatement} />
                        <Button variant="outline" size="sm" onClick={openEditCompany}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                    </div>
                </div>
            </div>

            {/* Balance + totals: one slim strip */}
            {(() => {
                const balance = Number(company.balance);
                const opening = Number(openingBalance?.amount ?? 0);
                const tone = (value: number) => (value > 0 ? "text-red-600" : value < 0 ? "text-green-600" : "");
                const stats = [
                    { label: "Purchases", value: formatCurrency(company.totalPurchases), className: "" },
                    { label: "Payments", value: formatCurrency(company.totalPayments), className: "" },
                    ...(showSettlements
                        ? [{ label: "Settlement sales", value: formatCurrency(Number(company.totalSettlementSales || 0)), className: "text-blue-700" }]
                        : []),
                ];
                return (
                    <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-gray-200 ${showSettlements ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
                        {/* With 5 boxes the balance takes a full row on phones; with 4 it's a neat 2×2. */}
                        <div className={`bg-white px-3 py-2 ${showSettlements ? "col-span-2 sm:col-span-1" : ""}`}>
                            <p className="text-[11px] text-muted-foreground">
                                {balance > 0 ? "You owe" : balance < 0 ? "Advance paid" : "Balance"}
                            </p>
                            <p className={`text-lg font-bold leading-tight ${tone(balance)}`}>
                                {balance === 0 ? "रू 0.00" : formatCurrency(balance)}
                            </p>
                        </div>
                        <div className="bg-white px-3 py-2">
                            <div className="flex items-center gap-1">
                                <p className="text-[11px] text-muted-foreground">
                                    Opening {opening > 0 ? "(owed)" : opening < 0 ? "(advance)" : ""}
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
                            <p className={`text-sm font-semibold leading-tight ${tone(opening)}`}>
                                {opening === 0 ? "रू 0.00" : formatCurrency(opening)}
                            </p>
                        </div>
                        {stats.map((stat) => (
                            <div key={stat.label} className="bg-white px-3 py-2">
                                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                                <p className={`text-sm font-semibold leading-tight ${stat.className}`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>
                );
            })()}

            {/* Transaction History — one table per tab, paged on the server */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Transaction History</CardTitle>
                    <div className="mt-2 flex gap-1 overflow-x-auto border-b">
                        {visibleTabs.map((tab) => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => changeTab(tab.key)}
                                    className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${active
                                        ? tab.activeClass
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label} ({counts?.[tab.key] ?? 0})
                                </button>
                            );
                        })}
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <DataTable
                        data={rows}
                        columns={columnsFor(activeTab)}
                        loading={isFetching && rows.length === 0}
                        emptyMessage={TABS.find((tab) => tab.key === activeTab)?.empty}
                        getRowKey={(row: any) => `${row.kind ?? row.type}-${row.id}`}
                    />
                    <LedgerPagination
                        page={page}
                        totalPages={pagination?.totalPages ?? 0}
                        totalRows={pagination?.total ?? 0}
                        pageLimit={PAGE_SIZE}
                        onPageChange={setPage}
                        loading={isFetching}
                    />
                </CardContent>
            </Card>

            {/* Purchase / settlement sale details */}
            <Dialog open={!!detailsRow} onOpenChange={(open) => !open && setDetailsRow(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-lg">
                    {detailsRow && (() => {
                        const isPurchase = detailsRow.type === "PURCHASE";
                        const items: any[] = Array.isArray(detailsRow.items) ? detailsRow.items : [];
                        const basicTotal = items.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
                        const discount = Number(detailsRow.tradeDiscountAmount || 0);
                        return (
                            <>
                                <DialogHeader>
                                    <DialogTitle>{isPurchase ? "Purchase details" : "Settlement sale details"}</DialogTitle>
                                    <DialogDescription>
                                        <DateDisplay date={detailsRow.date} format="long" />
                                        {detailsRow.reference ? ` · ${isPurchase ? "Ref" : "Invoice"}: ${detailsRow.reference}` : ""}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="divide-y rounded-lg border">
                                    {items.map((item: any, index: number) => (
                                        <div key={item.id ?? index} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium">{item.productName ?? item.product?.name ?? "Product"}</span>
                                                    {item.type ? <Badge variant="secondary" className="py-0 text-xs">{item.type}</Badge> : null}
                                                </div>
                                                {item.expiryDate ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        Expiry: <DateDisplay date={item.expiryDate} />
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className="shrink-0 text-right text-xs text-muted-foreground">
                                                <p>
                                                    {Number(item.quantity).toFixed(2)} {item.unit ?? item.product?.unit ?? ""} × रू {Number(item.costPrice ?? item.unitPrice ?? 0).toFixed(2)}
                                                </p>
                                                <p className="text-sm font-medium text-foreground">रू {Number(item.totalAmount || 0).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-1 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                                    {isPurchase ? (
                                        <>
                                            <div className="flex justify-between"><span>Basic total</span><span>{formatCurrency(basicTotal)}</span></div>
                                            <div className="flex justify-between text-green-700"><span>Trade discount</span><span>− {formatCurrency(discount)}</span></div>
                                        </>
                                    ) : null}
                                    <div className="flex justify-between border-t pt-1 font-semibold">
                                        <span>{isPurchase ? "Net total" : "Total"}</span>
                                        <span>{formatCurrency(Number(detailsRow.amount || 0))}</span>
                                    </div>
                                </div>
                                {detailsRow.notes ? <p className="text-sm text-muted-foreground">Note: {detailsRow.notes}</p> : null}
                                {isPurchase && isPurchaseBillEnabled && detailsRow.billImageUrl ? (
                                    <a
                                        href={detailsRow.billImageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                                    >
                                        <Paperclip className="h-4 w-4" /> View bill photo
                                    </a>
                                ) : null}
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Edit Opening Balance Dialog */}
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
                                        <SelectItem value="OWED">I owe them</SelectItem>
                                        <SelectItem value="ADVANCE">They owe me (advance paid)</SelectItem>
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
                        <Button onClick={saveOpening} disabled={setOpeningMutation.isPending}>
                            {setOpeningMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Company Details Dialog */}
            <Dialog open={isEditCompanyOpen} onOpenChange={setIsEditCompanyOpen}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle>Edit company details</DialogTitle>
                        <DialogDescription>
                            Update this manual company&apos;s name, phone, and address.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={companyForm.name}
                                onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))}
                                placeholder="Company name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                                value={companyForm.phone}
                                onChange={(e) => setCompanyForm((p) => ({ ...p, phone: e.target.value }))}
                                placeholder="Phone number"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Address</Label>
                            <Input
                                value={companyForm.address}
                                onChange={(e) => setCompanyForm((p) => ({ ...p, address: e.target.value }))}
                                placeholder="Address"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditCompanyOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={saveCompany} disabled={updateCompanyMutation.isPending}>
                            {updateCompanyMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Void (delete) purchase/payment confirm */}
            <Dialog open={!!voidConfirm} onOpenChange={(o) => !o && setVoidConfirm(null)}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle>
                            {voidConfirm?.kind === "PURCHASE" ? "Delete purchase?" : "Delete payment?"}
                        </DialogTitle>
                        <DialogDescription>
                            {voidConfirm?.kind === "PURCHASE"
                                ? "This will reverse inventory stock and revert the company balance. If purchased items are already consumed/sold, deletion will be blocked."
                                : "This will revert the company balance for this payment."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label>Reason (optional)</Label>
                        <Input
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            placeholder="Why are you deleting this record?"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setVoidConfirm(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="bg-red-600 text-white hover:bg-red-700"
                            onClick={async () => {
                                if (!voidConfirm) return;
                                try {
                                    if (voidConfirm.kind === "PURCHASE") {
                                        await voidPurchaseMutation.mutateAsync({
                                            companyId: id,
                                            purchaseId: voidConfirm.id,
                                            reason: voidReason.trim() || undefined,
                                        });
                                        toast.success("Purchase deleted");
                                    } else {
                                        await voidPaymentMutation.mutateAsync({
                                            companyId: id,
                                            paymentId: voidConfirm.id,
                                            reason: voidReason.trim() || undefined,
                                        });
                                        toast.success("Payment deleted");
                                    }
                                    setVoidConfirm(null);
                                } catch (e: any) {
                                    toast.error(e?.response?.data?.message ?? "Failed to delete");
                                }
                            }}
                            disabled={voidPurchaseMutation.isPending || voidPaymentMutation.isPending}
                        >
                            {(voidPurchaseMutation.isPending || voidPaymentMutation.isPending) ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
