"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NepaliDatePicker } from "@/common/components/ui/nepali-date-picker";
import {
    Plus,
    Search,
    Building2,
    Eye,
    Archive,
    ArchiveRestore,
    X,
    Wallet,
    ShoppingCart,
    Trash2,
    Phone,
    MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
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
import { useI18n } from "@/i18n/useI18n";
import { getTodayLocalDate } from "@/common/lib/utils";
import { convertADtoBS } from "@/common/lib/nepali-date";
import axiosInstance from "@/common/lib/axios";
import { BusinessDownloadDialog } from "@/components/downloads/BusinessDownloadDialog";
import { ImageUpload } from "@/common/components/ui/image-upload";
import {
    useGetManualCompanies,
    useCreateManualCompany,
    useDeleteManualCompany,
    useArchiveManualCompany,
    useUnarchiveManualCompany,
    useRecordManualPurchase,
    useRecordManualCompanyPayment,
    type ManualCompany,
    type PurchaseItem,
} from "@/fetchers/dealer/dealerManualCompanyQueries";
import { useGetDealerPaymentDirectionSetting } from "@/fetchers/dealer/dealerSettingsQueries";
import {
    ACCOUNT_FEATURE_KEYS,
    useAccountFeature,
} from "@/fetchers/accountFeatureQueries";

export default function DealerCompanyPage() {
    const { t } = useI18n();
    const router = useRouter();
    const [search, setSearch] = useState("");

    // Manual company state
    const [isAddManualOpen, setIsAddManualOpen] = useState(false);
    const [manualForm, setManualForm] = useState({
        name: "",
        phone: "",
        address: "",
        openingBalanceAmount: "",
        openingBalanceDirection: "OWED" as "OWED" | "ADVANCE",
    });
    const [purchaseCompany, setPurchaseCompany] = useState<ManualCompany | null>(null);
    const [purchaseDateAd, setPurchaseDateAd] = useState(getTodayLocalDate());
    const [purchaseTradeDiscount, setPurchaseTradeDiscount] = useState<number>(0);
    const createEmptyPurchaseItem = (): PurchaseItem => ({
        productName: "",
        type: "FEED",
        unit: "kg",
        quantity: 0,
        costPrice: 0,
        sellingPrice: 0,
        minStock: null,
        expiryDate: null,
    });
    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([createEmptyPurchaseItem()]);
    const [purchaseNotes, setPurchaseNotes] = useState("");
    const [purchaseBillImageUrl, setPurchaseBillImageUrl] = useState("");
    const [isPurchaseBillUploading, setIsPurchaseBillUploading] = useState(false);
    const [paymentCompany, setPaymentCompany] = useState<ManualCompany | null>(null);
    const [paymentDateAd, setPaymentDateAd] = useState(getTodayLocalDate());
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentDirection, setPaymentDirection] = useState<"RECEIVED" | "MADE">("MADE");
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [paymentNotes, setPaymentNotes] = useState("");
    const [deleteManualConfirm, setDeleteManualConfirm] = useState<ManualCompany | null>(null);
    const [manualTab, setManualTab] = useState<"active" | "archived">("active");

    // Queries
    // Manual company queries & mutations
    const { data: manualCompaniesData, isLoading: manualLoading } = useGetManualCompanies({
        archived: manualTab === "archived",
    });
    const createManualMutation = useCreateManualCompany();
    const deleteManualMutation = useDeleteManualCompany();
    const recordPurchaseMutation = useRecordManualPurchase();
    const recordPaymentMutation = useRecordManualCompanyPayment();
    const { data: dealerSettingsData } = useGetDealerPaymentDirectionSetting();
    const { isEnabled: isPurchaseBillEnabled } = useAccountFeature(
        ACCOUNT_FEATURE_KEYS.DEALER_PURCHASE_BILL_UPLOAD
    );
    // Fail safe: keep the normal dealer-pays-company flow if settings cannot load.
    const paymentDirectionEnabled =
        dealerSettingsData?.data?.paymentDirectionEnabled === true;
    const effectivePaymentDirection = paymentDirectionEnabled ? paymentDirection : "MADE";
    const archiveManualMutation = useArchiveManualCompany();
    const unarchiveManualMutation = useUnarchiveManualCompany();
    const manualCompanies = manualCompaniesData || [];

    const downloadCompanies = async () => {
        const { data } = await axiosInstance.get("/dealer/manual-companies", {
            params: { archived: manualTab === "archived" },
        });
        const rows = (data.data || []).filter((company: ManualCompany) => {
            const text = `${company.name} ${company.phone || ""} ${company.address || ""}`.toLowerCase();
            return text.includes(search.toLowerCase());
        });
        const totalPurchaseValue = rows.reduce(
            (total: number, company: ManualCompany) => total + Number(company.totalPurchases || 0),
            0,
        );
        return {
            columns: [
                { label: "Company", value: (row: ManualCompany) => row.name },
                { label: "Phone", value: (row: ManualCompany) => row.phone || "" },
                { label: "Address", value: (row: ManualCompany) => row.address || "" },
                {
                    label: "Opening balance",
                    value: (row: ManualCompany) => {
                        const rawAmount = Number(row.openingBalance || 0);
                        const amount = Number.isFinite(rawAmount) ? rawAmount : 0;
                        return amount === 0
                            ? "Rs 0.00"
                            : `Rs ${Math.abs(amount).toFixed(2)} (${amount > 0 ? "payable" : "advance"})`;
                    },
                },
                { label: "Balance", value: (row: ManualCompany) => Number(row.balance || 0).toFixed(2) },
                { label: "Purchases", value: (row: ManualCompany) => Number(row.totalPurchases || 0).toFixed(2) },
                { label: "Payments", value: (row: ManualCompany) => Number(row.totalPayments || 0).toFixed(2) },
                { label: "Status", value: (row: ManualCompany) => row.archivedAt ? "Archived" : "Active" },
            ],
            rows,
            summary: [
                { label: "Total suppliers", value: rows.length },
                { label: "Total purchase value", value: `Rs ${totalPurchaseValue.toFixed(2)}` },
            ],
        };
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return `रू ${Math.abs(amount).toFixed(2)}`;
    };

    const filteredManualCompanies = manualCompanies.filter((company) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            company.name?.toLowerCase().includes(q) ||
            company.phone?.toLowerCase().includes(q) ||
            company.address?.toLowerCase().includes(q)
        );
    });

    // Manual company handlers
    const handleCreateManualCompany = async () => {
        if (!manualForm.name.trim()) {
            toast.error("Company name is required");
            return;
        }
        try {
            const amtRaw = Number(manualForm.openingBalanceAmount || 0);
            if (Number.isNaN(amtRaw) || amtRaw < 0) {
                toast.error("Opening balance must be a non-negative number");
                return;
            }
            const openingBalance =
                amtRaw === 0
                    ? 0
                    : manualForm.openingBalanceDirection === "ADVANCE"
                        ? -amtRaw
                        : amtRaw;

            await createManualMutation.mutateAsync({
                name: manualForm.name,
                phone: manualForm.phone,
                address: manualForm.address,
                openingBalance,
            } as any);
            toast.success("Manual company added successfully");
            setIsAddManualOpen(false);
            setManualForm({
                name: "",
                phone: "",
                address: "",
                openingBalanceAmount: "",
                openingBalanceDirection: "OWED",
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add manual company");
        }
    };

    const handleDeleteManualCompany = async () => {
        if (!deleteManualConfirm) return;
        try {
            await deleteManualMutation.mutateAsync(deleteManualConfirm.id);
            toast.success("Manual company deleted");
            setDeleteManualConfirm(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete");
        }
    };

    const handleRecordPurchase = async () => {
        if (!purchaseCompany) return;
        if (isPurchaseBillUploading) {
            toast.error("Please wait for the bill image to finish uploading");
            return;
        }
        const validItems = purchaseItems.filter(i => i.productName && i.quantity > 0 && i.costPrice >= 0 && i.sellingPrice >= 0);
        if (validItems.length === 0) {
            toast.error("Add at least one valid item");
            return;
        }
        const grossTotal = purchaseItems.reduce((sum, i) => sum + i.quantity * i.costPrice, 0);
        if (purchaseTradeDiscount < 0 || Number.isNaN(purchaseTradeDiscount)) {
            toast.error("Trade discount must be a valid non-negative number");
            return;
        }
        if (purchaseTradeDiscount > grossTotal) {
            toast.error(`Trade discount cannot exceed gross total (रू ${grossTotal.toFixed(2)})`);
            return;
        }
        try {
            await recordPurchaseMutation.mutateAsync({
                companyId: purchaseCompany.id,
                items: validItems.map((item) => ({
                    ...item,
                    minStock: item.minStock === null || item.minStock === undefined
                        ? undefined
                        : Number(item.minStock),
                })),
                notes: purchaseNotes || undefined,
                date: new Date((purchaseDateAd || getTodayLocalDate()) + "T12:00:00").toISOString(),
                tradeDiscountAmount: purchaseTradeDiscount || 0,
                billImageUrl:
                    isPurchaseBillEnabled && purchaseBillImageUrl
                        ? purchaseBillImageUrl
                        : undefined,
            });
            toast.success("Purchase recorded! Items added to inventory.");
            setPurchaseCompany(null);
            setPurchaseItems([createEmptyPurchaseItem()]);
            setPurchaseNotes("");
            setPurchaseTradeDiscount(0);
            setPurchaseBillImageUrl("");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to record purchase");
        }
    };

    const closePurchaseDialog = () => {
        if (isPurchaseBillUploading) return;
        setPurchaseCompany(null);
        setPurchaseBillImageUrl("");
    };

    /**
     * Nepali datepicker validates defaultDate with string.split — it must be BS YYYY-MM-DD.
     * Typings incorrectly say Date; use `as any`.
     */
    const defaultBsDateForPicker = (draftAd: string): string =>
        convertADtoBS(draftAd || getTodayLocalDate());

    const handleRecordPayment = async () => {
        if (!paymentCompany || !paymentAmount || Number(paymentAmount) <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        try {
            await recordPaymentMutation.mutateAsync({
                companyId: paymentCompany.id,
                amount: Number(paymentAmount),
                direction: effectivePaymentDirection,
                paymentMethod: paymentMethod,
                notes: paymentNotes || undefined,
                paymentDate: new Date(
                    (paymentDateAd || getTodayLocalDate()) + "T12:00:00"
                ).toISOString(),
            });
            toast.success("Payment recorded successfully");
            setPaymentCompany(null);
            setPaymentDateAd(getTodayLocalDate());
            setPaymentAmount("");
            setPaymentDirection("MADE");
            setPaymentMethod("CASH");
            setPaymentNotes("");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to record payment");
        }
    };

    const addPurchaseItem = () => {
        setPurchaseItems([...purchaseItems, createEmptyPurchaseItem()]);
    };

    const removePurchaseItem = (index: number) => {
        setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
    };

    const updatePurchaseItem = (index: number, field: keyof PurchaseItem, value: any) => {
        const updated = [...purchaseItems];
        updated[index] = { ...updated[index], [field]: value };
        // Auto-set unit based on type
        if (field === "type") {
            if (value === "CHICKS") updated[index].unit = "pcs";
            else if (value === "FEED") updated[index].unit = "kg";
            else if (value === "MEDICINE") updated[index].unit = "pcs";
            else if (value === "EQUIPMENT") updated[index].unit = "pcs";
        }
        setPurchaseItems(updated);
    };

    const openPurchase = (company: (typeof manualCompanies)[number]) => {
        setPurchaseCompany(company);
        setPurchaseItems([createEmptyPurchaseItem()]);
        setPurchaseNotes("");
        setPurchaseBillImageUrl("");
    };

    const openPayment = (company: (typeof manualCompanies)[number]) => {
        setPaymentCompany(company);
        setPaymentDateAd(getTodayLocalDate());
        setPaymentAmount("");
        setPaymentDirection("MADE");
        setPaymentNotes("");
    };

    const openAccount = (companyId: string) => router.push(`/dealer/dashboard/company/manual/${companyId}`);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("dealer.company.title")}</h1>
                    <p className="text-sm text-muted-foreground md:text-base">
                        Suppliers you buy from. Track purchases, payments and what you owe.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                    <BusinessDownloadDialog title="suppliers" fileName="dealer-suppliers" getData={downloadCompanies} hasDateFilter={false} buttonLabel="Download" />
                    <Button onClick={() => setIsAddManualOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add company
                    </Button>
                </div>
            </div>

            {/* Toolbar: active / archived + search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="inline-flex shrink-0 rounded-lg border bg-muted/40 p-1" role="tablist" aria-label="Company list">
                    {(["active", "archived"] as const).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={manualTab === tab}
                            onClick={() => setManualTab(tab)}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${manualTab === tab
                                ? "bg-white text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {tab === "active" ? "Active" : "Archived"}
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, phone or address"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-white pl-10"
                    />
                </div>
                {!manualLoading ? (
                    <p className="text-sm text-muted-foreground sm:ml-auto">
                        {filteredManualCompanies.length} {filteredManualCompanies.length === 1 ? "company" : "companies"}
                    </p>
                ) : null}
            </div>

            {/* Company cards */}
            {manualLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2].map((key) => (
                        <div key={key} className="h-56 animate-pulse rounded-xl border bg-muted/40" />
                    ))}
                </div>
            ) : filteredManualCompanies.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-white px-4 py-14 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                    </span>
                    <div>
                        <p className="font-medium">
                            {search
                                ? "No matching companies"
                                : manualTab === "archived"
                                    ? "No archived companies"
                                    : "No companies yet"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {search
                                ? "Try a different search."
                                : "Add the companies you buy from to track purchases and payments."}
                        </p>
                    </div>
                    {manualTab === "active" && !search ? (
                        <Button onClick={() => setIsAddManualOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add company
                        </Button>
                    ) : null}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredManualCompanies.map((company) => {
                        const balance = Number(company.balance);
                        const hasHistory = (company._count?.purchases || 0) > 0 || (company._count?.payments || 0) > 0;
                        return (
                            <Card key={company.id} className="flex flex-col rounded-xl bg-white transition-shadow hover:shadow-md">
                                <CardContent className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
                                    {/* Name + contact */}
                                    <div className="flex items-start gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                            <Building2 className="h-5 w-5 text-primary" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <button
                                                type="button"
                                                onClick={() => openAccount(company.id)}
                                                className="block max-w-full truncate text-left font-semibold hover:underline"
                                            >
                                                {company.name}
                                            </button>
                                            {company.phone ? (
                                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Phone className="h-3 w-3 shrink-0" />
                                                    {company.phone}
                                                </p>
                                            ) : null}
                                            {company.address ? (
                                                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{company.address}</span>
                                                </p>
                                            ) : null}
                                        </div>
                                        {manualTab === "archived" ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                                                title="Unarchive"
                                                aria-label="Unarchive company"
                                                onClick={async () => {
                                                    try {
                                                        await unarchiveManualMutation.mutateAsync(company.id);
                                                        toast.success("Manual company unarchived");
                                                    } catch (error: any) {
                                                        toast.error(error.response?.data?.message || "Failed to unarchive");
                                                    }
                                                }}
                                            >
                                                <ArchiveRestore className="h-4 w-4" />
                                            </Button>
                                        ) : hasHistory ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                                                title="Archive"
                                                aria-label="Archive company"
                                                onClick={async () => {
                                                    try {
                                                        await archiveManualMutation.mutateAsync(company.id);
                                                        toast.success("Manual company archived");
                                                    } catch (error: any) {
                                                        toast.error(error.response?.data?.message || "Failed to archive");
                                                    }
                                                }}
                                            >
                                                <Archive className="h-4 w-4" />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-red-600"
                                                title="Delete"
                                                aria-label="Delete company"
                                                onClick={() => setDeleteManualConfirm(company)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    {/* Balance */}
                                    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                                        <p className="text-xs text-muted-foreground">
                                            {balance > 0 ? "You owe" : balance < 0 ? "Advance paid" : "Balance"}
                                        </p>
                                        <p className={`text-xl font-bold ${balance > 0 ? "text-red-600" : balance < 0 ? "text-green-600" : ""}`}>
                                            {balance === 0 ? "रू 0.00" : formatCurrency(balance)}
                                        </p>
                                    </div>

                                    {/* Totals */}
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Purchases</p>
                                            <p className="font-medium">{formatCurrency(Number(company.totalPurchases))}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Payments</p>
                                            <p className="font-medium">{formatCurrency(Number(company.totalPayments))}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-auto grid grid-cols-3 gap-2 border-t pt-3">
                                        <Button variant="outline" size="sm" onClick={() => openPurchase(company)}>
                                            <ShoppingCart className="mr-1.5 h-4 w-4" />
                                            Buy
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => openPayment(company)}>
                                            <Wallet className="mr-1.5 h-4 w-4" />
                                            Pay
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => openAccount(company.id)}>
                                            <Eye className="mr-1.5 h-4 w-4" />
                                            Account
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Add Manual Company Dialog */}
            <Dialog open={isAddManualOpen} onOpenChange={setIsAddManualOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Add Manual Company</DialogTitle>
                        <DialogDescription>
                            Add a company you purchase from that isn&apos;t registered on the platform
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Company Name *</label>
                            <Input
                                value={manualForm.name}
                                onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                                placeholder="Enter company name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Phone</label>
                            <Input
                                value={manualForm.phone}
                                onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                                placeholder="Contact number"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Address</label>
                            <Input
                                value={manualForm.address}
                                onChange={(e) => setManualForm({ ...manualForm, address: e.target.value })}
                                placeholder="Company address"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2 space-y-2">
                                <label className="text-sm font-medium">Opening balance (optional)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={manualForm.openingBalanceAmount}
                                    onChange={(e) =>
                                        setManualForm({ ...manualForm, openingBalanceAmount: e.target.value })
                                    }
                                    placeholder="0.00"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use this if you already had an outstanding balance before using Poultry360.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Direction</label>
                                <Select
                                    value={manualForm.openingBalanceDirection}
                                    onValueChange={(v) =>
                                        setManualForm({ ...manualForm, openingBalanceDirection: v as any })
                                    }
                                >
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
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddManualOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateManualCompany}
                            disabled={createManualMutation.isPending}
                        >
                            {createManualMutation.isPending ? "Adding..." : "Add Company"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Record Purchase Dialog */}
            <Dialog
                open={!!purchaseCompany}
                onOpenChange={(open) => {
                    if (!open) closePurchaseDialog();
                }}
            >
                <DialogContent className="max-w-3xl bg-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Record Purchase from {purchaseCompany?.name}</DialogTitle>
                        <DialogDescription>
                            Add items purchased. They will be added to your inventory automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Date</label>
                            <NepaliDatePicker
                                onChange={({
                                    adDate,
                                }: {
                                    bsDate: string;
                                    adDate: string;
                                }) => {
                                    const ymd = adDate.includes("T") ? adDate.split("T")[0] : adDate;
                                    setPurchaseDateAd(ymd);
                                }}
                                defaultDate={defaultBsDateForPicker(purchaseDateAd) as any}
                                className="w-full rounded-md border border-input"
                                theme="light"
                                language="en"
                            />
                        </div>
                        {purchaseItems.map((item, index) => (
                            <div key={index} className="border rounded-lg p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Item {index + 1}</span>
                                    {purchaseItems.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-red-600"
                                            onClick={() => removePurchaseItem(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className="text-xs text-muted-foreground">Product Name *</label>
                                        <Input
                                            value={item.productName}
                                            onChange={(e) => updatePurchaseItem(index, "productName", e.target.value)}
                                            placeholder="e.g. Starter Feed"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Type</label>
                                        <Select
                                            value={item.type}
                                            onValueChange={(v) => updatePurchaseItem(index, "type", v)}
                                        >
                                            <SelectTrigger className="mt-1 bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                <SelectItem value="FEED">Feed</SelectItem>
                                                <SelectItem value="CHICKS">Chicks</SelectItem>
                                                <SelectItem value="OTHER">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Unit</label>
                                        <Select
                                            value={item.unit}
                                            onValueChange={(v) => updatePurchaseItem(index, "unit", v)}
                                        >
                                            <SelectTrigger className="mt-1 bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                <SelectItem value="kg">kg</SelectItem>
                                                <SelectItem value="pcs">pcs</SelectItem>
                                                <SelectItem value="liters">liters</SelectItem>
                                                <SelectItem value="bags">bags</SelectItem>
                                                <SelectItem value="bottles">bottles</SelectItem>
                                                <SelectItem value="sets">sets</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Quantity *</label>
                                        <Input
                                            type="number"
                                            value={item.quantity || ""}
                                            onChange={(e) => updatePurchaseItem(index, "quantity", Number(e.target.value))}
                                            placeholder="0"
                                            className="mt-1"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Cost Price (per unit) *</label>
                                        <Input
                                            type="number"
                                            value={item.costPrice || ""}
                                            onChange={(e) => updatePurchaseItem(index, "costPrice", Number(e.target.value))}
                                            placeholder="0"
                                            className="mt-1"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Selling Price (per unit) *</label>
                                        <Input
                                            type="number"
                                            value={item.sellingPrice || ""}
                                            onChange={(e) => updatePurchaseItem(index, "sellingPrice", Number(e.target.value))}
                                            placeholder="0"
                                            className="mt-1"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Minimum Stock (optional)</label>
                                        <Input
                                            type="number"
                                            value={item.minStock ?? ""}
                                            onChange={(e) =>
                                                updatePurchaseItem(
                                                    index,
                                                    "minStock",
                                                    e.target.value === "" ? null : Number(e.target.value)
                                                )
                                            }
                                            placeholder="Threshold for low stock"
                                            className="mt-1"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Expiry Date (optional)</label>
                                        <Input
                                            type="date"
                                            value={item.expiryDate || ""}
                                            onChange={(e) =>
                                                updatePurchaseItem(
                                                    index,
                                                    "expiryDate",
                                                    e.target.value || null
                                                )
                                            }
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Total</label>
                                        <div className="mt-1 px-3 py-2 bg-gray-50 rounded-md text-sm font-medium">
                                            रू {(item.quantity * item.costPrice).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={addPurchaseItem}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Another Item
                        </Button>
                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Notes (optional)</label>
                            <Input
                                value={purchaseNotes}
                                onChange={(e) => setPurchaseNotes(e.target.value)}
                                placeholder="Any notes about this purchase"
                            />
                        </div>
                        {isPurchaseBillEnabled && (
                            <div className="space-y-2">
                                <label className="text-xs text-muted-foreground">Bill Image (optional)</label>
                                <ImageUpload
                                    value={purchaseBillImageUrl}
                                    folder="poultry360/purchase-bills"
                                    onChange={setPurchaseBillImageUrl}
                                    onUploadingChange={setIsPurchaseBillUploading}
                                    placeholder="Upload purchase bill"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Trade discount (NPR)</label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={purchaseTradeDiscount || ""}
                                onChange={(e) => setPurchaseTradeDiscount(Number(e.target.value) || 0)}
                                placeholder="0"
                            />
                        </div>

                        {(() => {
                            const grossTotal = purchaseItems.reduce((sum, i) => sum + i.quantity * i.costPrice, 0);
                            const discount = Math.min(Math.max(purchaseTradeDiscount || 0, 0), grossTotal);
                            const netTotal = grossTotal - discount;
                            return (
                                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Basic total</span>
                                        <span className="font-medium">रू {grossTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Trade discount</span>
                                        <span className="font-medium text-green-700">- रू {discount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t">
                                        <span className="font-medium">Net total</span>
                                        <span className="text-lg font-bold">रू {netTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={closePurchaseDialog}
                            disabled={isPurchaseBillUploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRecordPurchase}
                            disabled={recordPurchaseMutation.isPending || isPurchaseBillUploading}
                        >
                            {isPurchaseBillUploading
                                ? "Uploading bill..."
                                : recordPurchaseMutation.isPending
                                    ? "Recording..."
                                    : "Record Purchase"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Record Payment Dialog */}
            <Dialog open={!!paymentCompany} onOpenChange={() => setPaymentCompany(null)}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>
                            {effectivePaymentDirection === "MADE" ? "Pay" : "Receive payment from"} {paymentCompany?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Current balance: {paymentCompany ? formatCurrency(Number(paymentCompany.balance)) : ""}
                            {paymentCompany && Number(paymentCompany.balance) > 0 ? " owed" : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {paymentDirectionEnabled && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Direction</label>
                                <Select value={paymentDirection} onValueChange={(value) => setPaymentDirection(value as "RECEIVED" | "MADE")}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        <SelectItem value="MADE">Dealer pays company</SelectItem>
                                        <SelectItem value="RECEIVED">Company pays Dealer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Date</label>
                            <NepaliDatePicker
                                onChange={({
                                    adDate,
                                }: {
                                    bsDate: string;
                                    adDate: string;
                                }) => {
                                    const ymd = adDate.includes("T") ? adDate.split("T")[0] : adDate;
                                    setPaymentDateAd(ymd);
                                }}
                                defaultDate={defaultBsDateForPicker(paymentDateAd) as any}
                                className="w-full rounded-md border border-input"
                                theme="light"
                                language="en"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount *</label>
                            <Input
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="Enter payment amount"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Payment Method</label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                                    <SelectItem value="MOBILE_PAYMENT">Mobile Payment</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Notes</label>
                            <Input
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                placeholder="Optional notes"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentCompany(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRecordPayment}
                            disabled={recordPaymentMutation.isPending}
                        >
                            {recordPaymentMutation.isPending
                                ? "Recording..."
                                : effectivePaymentDirection === "MADE"
                                    ? "Record payment made"
                                    : "Record payment received"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Manual Company Dialog */}
            {
                deleteManualConfirm && (
                    <Dialog open={!!deleteManualConfirm} onOpenChange={() => setDeleteManualConfirm(null)}>
                        <DialogContent className="bg-white">
                            <DialogHeader>
                                <DialogTitle>Delete Manual Company</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to delete &quot;{deleteManualConfirm.name}&quot;? This is only allowed when the company has no purchases/payments.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteManualConfirm(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="bg-red-600 text-white hover:bg-red-700"
                                    onClick={handleDeleteManualCompany}
                                    disabled={deleteManualMutation.isPending}
                                >
                                    {deleteManualMutation.isPending ? "Deleting..." : "Delete"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            }
        </div >
    );
}
