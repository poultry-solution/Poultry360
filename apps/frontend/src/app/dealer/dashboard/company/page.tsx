"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Calendar from "@sbmdkl/nepali-datepicker-reactjs";
import "@sbmdkl/nepali-datepicker-reactjs/dist/index.css";
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
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Badge } from "@/common/components/ui/badge";
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
    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([{ productName: "", type: "FEED", unit: "kg", quantity: 0, costPrice: 0, sellingPrice: 0 }]);
    const [purchaseNotes, setPurchaseNotes] = useState("");
    const [paymentCompany, setPaymentCompany] = useState<ManualCompany | null>(null);
    const [paymentDateAd, setPaymentDateAd] = useState(getTodayLocalDate());
    const [paymentAmount, setPaymentAmount] = useState("");
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
    const archiveManualMutation = useArchiveManualCompany();
    const unarchiveManualMutation = useUnarchiveManualCompany();
    const manualCompanies = manualCompaniesData || [];

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
                items: validItems,
                notes: purchaseNotes || undefined,
                date: new Date((purchaseDateAd || getTodayLocalDate()) + "T12:00:00").toISOString(),
                tradeDiscountAmount: purchaseTradeDiscount || 0,
            });
            toast.success("Purchase recorded! Items added to inventory.");
            setPurchaseCompany(null);
            setPurchaseItems([{ productName: "", type: "FEED", unit: "kg", quantity: 0, costPrice: 0, sellingPrice: 0 }]);
            setPurchaseNotes("");
            setPurchaseTradeDiscount(0);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to record purchase");
        }
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
            setPaymentMethod("CASH");
            setPaymentNotes("");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to record payment");
        }
    };

    const addPurchaseItem = () => {
        setPurchaseItems([...purchaseItems, { productName: "", type: "FEED", unit: "kg", quantity: 0, costPrice: 0, sellingPrice: 0 }]);
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

    if (manualLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Companies</h1>
                    <p className="text-muted-foreground">
                        Manage manual company accounts, purchases, and payments
                    </p>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center py-8">Loading...</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("dealer.company.title")}</h1>
                    <p className="text-sm md:text-base text-muted-foreground">
                        {t("dealer.company.subtitle")}
                    </p>
                </div>
            </div>

            <>
                    <Card>
                        <CardContent className="pt-4 pb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search companies by name, phone, or address"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Manual Companies Section */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Manual Companies</CardTitle>
                                    <CardDescription>
                                        Companies managed directly for purchase tracking ({filteredManualCompanies.length})
                                    </CardDescription>
                                    <div className="flex gap-2 border-b mt-3">
                                        <button
                                            onClick={() => setManualTab("active")}
                                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${manualTab === "active"
                                                ? "border-b-2 border-primary text-primary"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            Active
                                        </button>
                                        <button
                                            onClick={() => setManualTab("archived")}
                                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${manualTab === "archived"
                                                ? "border-b-2 border-primary text-primary"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            Archived
                                        </button>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => setIsAddManualOpen(true)}
                                    size="sm"
                                    className="hover:bg-green-50 hover:text-green-700 border-green-200"
                                    variant="outline"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Company
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredManualCompanies.length === 0 ? (
                                <div className="text-center py-8">
                                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">
                                        {search
                                            ? "No Matching Companies"
                                            : manualTab === "archived"
                                                ? "No Archived Manual Companies"
                                                : "No Manual Companies"}
                                    </h3>
                                    <p className="text-muted-foreground mb-4">
                                        {search
                                            ? "Try a different search term."
                                            : "Add companies you purchase from and manage them manually."}
                                    </p>
                                    <Button onClick={() => setIsAddManualOpen(true)} disabled={manualTab === "archived"}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Manual Company
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {filteredManualCompanies.map((company) => (
                                        <Card key={company.id} className="relative overflow-hidden border-blue-200 bg-blue-50/30">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <CardTitle className="text-lg">{company.name}</CardTitle>
                                                        {company.phone && (
                                                            <CardDescription className="mt-1 flex items-center gap-1">
                                                                <Phone className="h-3 w-3" />
                                                                {company.phone}
                                                            </CardDescription>
                                                        )}
                                                        {company.address && (
                                                            <CardDescription className="mt-0.5 flex items-center gap-1">
                                                                <MapPin className="h-3 w-3" />
                                                                {company.address}
                                                            </CardDescription>
                                                        )}
                                                    </div>
                                                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                                        Manual
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-2">
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Balance</span>
                                                        <span className={`font-bold ${Number(company.balance) > 0 ? "text-red-600" :
                                                            Number(company.balance) < 0 ? "text-green-600" : ""
                                                            }`}>
                                                            {Number(company.balance) > 0
                                                                ? `${formatCurrency(Number(company.balance))} owed`
                                                                : Number(company.balance) < 0
                                                                    ? `${formatCurrency(Number(company.balance))} advance`
                                                                    : "रू 0.00"}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Total Purchases</span>
                                                        <span className="font-medium">{formatCurrency(Number(company.totalPurchases))}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Total Payments</span>
                                                        <span className="font-medium">{formatCurrency(Number(company.totalPayments))}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => {
                                                            setPurchaseCompany(company);
                                                            setPurchaseItems([{ productName: "", type: "FEED", unit: "kg", quantity: 0, costPrice: 0, sellingPrice: 0 }]);
                                                            setPurchaseNotes("");
                                                        }}
                                                    >
                                                        <ShoppingCart className="mr-2 h-4 w-4" />
                                                        Purchase
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => {
                                                            setPaymentCompany(company);
                                                            setPaymentDateAd(getTodayLocalDate());
                                                            setPaymentAmount("");
                                                            setPaymentNotes("");
                                                        }}
                                                    >
                                                        <Wallet className="mr-2 h-4 w-4" />
                                                        Pay
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.push(`/dealer/dashboard/company/manual/${company.id}`)}
                                                    >
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Account
                                                    </Button>
                                                    {manualTab === "archived" ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={async () => {
                                                                try {
                                                                    await unarchiveManualMutation.mutateAsync(company.id);
                                                                    toast.success("Manual company unarchived");
                                                                } catch (error: any) {
                                                                    toast.error(error.response?.data?.message || "Failed to unarchive");
                                                                }
                                                            }}
                                                            className="text-muted-foreground hover:text-foreground"
                                                        >
                                                            <ArchiveRestore className="h-4 w-4" />
                                                        </Button>
                                                    ) : (company._count?.purchases || 0) > 0 || (company._count?.payments || 0) > 0 ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={async () => {
                                                                try {
                                                                    await archiveManualMutation.mutateAsync(company.id);
                                                                    toast.success("Manual company archived");
                                                                } catch (error: any) {
                                                                    toast.error(error.response?.data?.message || "Failed to archive");
                                                                }
                                                            }}
                                                            className="text-muted-foreground hover:text-foreground"
                                                        >
                                                            <Archive className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDeleteManualConfirm(company)}
                                                            className="text-muted-foreground hover:text-red-600"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
            </>

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
            <Dialog open={!!purchaseCompany} onOpenChange={() => setPurchaseCompany(null)}>
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
                            <Calendar
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
                                theme="dark"
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
                        <Button variant="outline" onClick={() => setPurchaseCompany(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRecordPurchase}
                            disabled={recordPurchaseMutation.isPending}
                        >
                            {recordPurchaseMutation.isPending ? "Recording..." : "Record Purchase"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Record Payment Dialog */}
            <Dialog open={!!paymentCompany} onOpenChange={() => setPaymentCompany(null)}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Record Payment to {paymentCompany?.name}</DialogTitle>
                        <DialogDescription>
                            Current balance: {paymentCompany ? formatCurrency(Number(paymentCompany.balance)) : ""}
                            {paymentCompany && Number(paymentCompany.balance) > 0 ? " owed" : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Date</label>
                            <Calendar
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
                                theme="dark"
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
                            {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
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
