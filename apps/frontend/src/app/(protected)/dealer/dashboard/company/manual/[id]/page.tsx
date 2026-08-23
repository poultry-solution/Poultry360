"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Building2,
    Phone,
    MapPin,
    ShoppingCart,
    Wallet,
    Calendar,
    Package,
    CreditCard,
    Edit,
    Trash2,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
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
    useGetManualCompanyStatement,
    useSetManualCompanyOpeningBalance,
    useUpdateManualCompany,
    manualCompanyKeys,
    useVoidManualPurchase,
    useVoidManualPayment,
} from "@/fetchers/dealer/dealerManualCompanyQueries";
import { DateDisplay } from "@/common/components/ui/date-display";
import { useQueryClient } from "@tanstack/react-query";

export default function ManualCompanyAccountPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [activeTab, setActiveTab] = useState<"purchases" | "payments" | "adjustments" | "voided">("purchases");
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
    const { data, isLoading } = useGetManualCompanyStatement(id, { includeVoided: true });
    const setOpeningMutation = useSetManualCompanyOpeningBalance();
    const updateCompanyMutation = useUpdateManualCompany();
    const voidPurchaseMutation = useVoidManualPurchase();
    const voidPaymentMutation = useVoidManualPayment();

    const company = data?.company;
    const transactions = data?.transactions || [];
    const voidedTransactions = (data as any)?.voidedTransactions || [];
    const openingBalance = data?.openingBalance;

    const formatCurrency = (amount: number) => {
        return `रू ${Math.abs(amount).toFixed(2)}`;
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
            await queryClient.invalidateQueries({ queryKey: manualCompanyKeys.statement(id) });
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
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => router.push("/dealer/dashboard/company")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Companies
                </Button>
            </div>

            {/* Company Info */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-blue-600" />
                                <CardTitle className="text-xl">{company.name}</CardTitle>
                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Manual</Badge>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                                {company.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5" />
                                        {company.phone}
                                    </span>
                                )}
                                {company.address && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {company.address}
                                    </span>
                                )}
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={openEditCompany}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* Balance Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-400">
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="text-sm text-muted-foreground">Opening balance</div>
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={openEditOpening}>
                                <Edit className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        <div
                            className={`text-2xl font-bold ${Number(openingBalance?.amount ?? 0) > 0
                                ? "text-red-600"
                                : Number(openingBalance?.amount ?? 0) < 0
                                    ? "text-green-600"
                                    : ""
                                }`}
                        >
                            {Number(openingBalance?.amount ?? 0) > 0
                                ? `${formatCurrency(Number(openingBalance?.amount))} owed`
                                : Number(openingBalance?.amount ?? 0) < 0
                                    ? `${formatCurrency(Number(openingBalance?.amount))} advance`
                                    : "रू 0.00"}
                        </div>
                        {openingBalance?.date && (
                            <div className="text-xs text-muted-foreground mt-1">
                                Set on <DateDisplay date={openingBalance.date} format="long" />
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-400">
                    <CardContent className="pt-4 pb-4">
                        <div className="text-sm text-muted-foreground">Balance</div>
                        <div className={`text-2xl font-bold ${company.balance > 0 ? "text-red-600" : company.balance < 0 ? "text-green-600" : ""
                            }`}>
                            {company.balance > 0
                                ? `${formatCurrency(company.balance)} owed`
                                : company.balance < 0
                                    ? `${formatCurrency(company.balance)} advance`
                                    : "रू 0.00"}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-400">
                    <CardContent className="pt-4 pb-4">
                        <div className="text-sm text-muted-foreground">Total Purchases</div>
                        <div className="text-2xl font-bold">{formatCurrency(company.totalPurchases)}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-400">
                    <CardContent className="pt-4 pb-4">
                        <div className="text-sm text-muted-foreground">Total Payments</div>
                        <div className="text-2xl font-bold">{formatCurrency(company.totalPayments)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Transaction History — Tabbed */}
            {(() => {
                const purchases = transactions.filter((t: any) => t.type === "PURCHASE");
                const payments = transactions.filter((t: any) => t.type === "PAYMENT");
                const adjustments = transactions.filter((t: any) => t.type === "OPENING_BALANCE" || t.type === "ADJUSTMENT");
                const voided = Array.isArray(voidedTransactions) ? voidedTransactions : [];

                return (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>Transaction History</CardTitle>
                            {/* Tabs */}
                            <div className="flex gap-2 border-b mt-2">
                                <button
                                    onClick={() => setActiveTab("purchases")}
                                    className={`px-4 py-2 font-medium transition-colors text-sm ${activeTab === "purchases"
                                        ? "border-b-2 border-orange-500 text-orange-600"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <ShoppingCart className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                                    Purchases ({purchases.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab("payments")}
                                    className={`px-4 py-2 font-medium transition-colors text-sm ${activeTab === "payments"
                                        ? "border-b-2 border-green-500 text-green-600"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <Wallet className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                                    Payments ({payments.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab("adjustments")}
                                    className={`px-4 py-2 font-medium transition-colors text-sm ${activeTab === "adjustments"
                                        ? "border-b-2 border-blue-500 text-blue-600"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <CreditCard className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                                    Adjustments ({adjustments.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab("voided")}
                                    className={`px-4 py-2 font-medium transition-colors text-sm ${activeTab === "voided"
                                        ? "border-b-2 border-gray-500 text-gray-700"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <Trash2 className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                                    Voided ({voided.length})
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Purchases Tab */}
                            {activeTab === "purchases" && (
                                purchases.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                        <p>No purchases recorded yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {purchases.map((txn: any) => (
                                            <div key={txn.id} className="border rounded-lg p-4 border-l-4 border-l-orange-400">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                                                            <ShoppingCart className="h-4 w-4 text-orange-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">Purchase</p>
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                <DateDisplay date={txn.date} format="long" />
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-lg font-bold text-orange-600">
                                                            + {formatCurrency(txn.amount)}
                                                        </p>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-muted-foreground hover:text-red-600"
                                                            onClick={() => {
                                                                setVoidReason("");
                                                                setVoidConfirm({
                                                                    kind: "PURCHASE",
                                                                    id: txn.id,
                                                                    date: txn.date,
                                                                    amount: Number(txn.amount),
                                                                });
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="mt-3 rounded-md border bg-gray-50 px-3 py-2 text-sm space-y-1">
                                                    {(() => {
                                                        const basicTotal = Array.isArray(txn.items)
                                                            ? txn.items.reduce((s: number, it: any) => s + Number(it.totalAmount || 0), 0)
                                                            : 0;
                                                        const tradeDiscount = Number(txn.tradeDiscountAmount || 0);
                                                        const netTotal = Number(txn.amount || 0);
                                                        return (
                                                            <>
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Basic total</span>
                                                                    <span className="font-medium">{formatCurrency(basicTotal)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Trade discount</span>
                                                                    <span className="font-medium text-green-700">- {formatCurrency(tradeDiscount)}</span>
                                                                </div>
                                                                <div className="flex justify-between border-t pt-1">
                                                                    <span className="font-medium">Net total</span>
                                                                    <span className="font-semibold">{formatCurrency(netTotal)}</span>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>

                                                {txn.items && txn.items.length > 0 && (
                                                    <div className="mt-3 border-t pt-3">
                                                        <p className="text-xs text-muted-foreground mb-2 font-medium">Items purchased:</p>
                                                        <div className="space-y-1.5">
                                                            {txn.items.map((item: any, idx: number) => (
                                                                <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                                                        <span className="font-medium">{item.productName}</span>
                                                                        <Badge variant="secondary" className="text-xs py-0">{item.type}</Badge>
                                                                    </div>
                                                                    <div className="text-right text-xs">
                                                                        <span>{Number(item.quantity).toFixed(2)} {item.unit}</span>
                                                                        <span className="mx-1">×</span>
                                                                        <span>रू {Number(item.costPrice).toFixed(2)}</span>
                                                                        <span className="font-medium ml-2">= रू {Number(item.totalAmount).toFixed(2)}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {txn.notes && (
                                                    <div className="mt-2 text-xs text-muted-foreground italic">Note: {txn.notes}</div>
                                                )}
                                                {txn.reference && (
                                                    <div className="mt-1 text-xs text-muted-foreground">Ref: {txn.reference}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}

                            {/* Payments Tab */}
                            {activeTab === "payments" && (
                                payments.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Wallet className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                        <p>No payments recorded yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {payments.map((txn: any) => (
                                            <div key={txn.id} className="border rounded-lg p-4 border-l-4 border-l-green-400">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                                            <Wallet className="h-4 w-4 text-green-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">Payment</p>
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                <DateDisplay date={txn.date} format="long" />
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex items-center gap-2">
                                                        <div>
                                                            <p className="text-lg font-bold text-green-600">
                                                                - {formatCurrency(txn.amount)}
                                                            </p>
                                                        {txn.paymentMethod && (
                                                            <Badge variant="secondary" className="text-xs mt-1">
                                                                <CreditCard className="h-3 w-3 mr-1" />
                                                                {txn.paymentMethod}
                                                            </Badge>
                                                        )}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-muted-foreground hover:text-red-600"
                                                            onClick={() => {
                                                                setVoidReason("");
                                                                setVoidConfirm({
                                                                    kind: "PAYMENT",
                                                                    id: txn.id,
                                                                    date: txn.date,
                                                                    amount: Number(txn.amount),
                                                                });
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {txn.balanceAfter !== undefined && (
                                                    <div className="mt-2 text-xs text-muted-foreground">
                                                        Balance after: रू {Number(txn.balanceAfter).toFixed(2)}
                                                    </div>
                                                )}
                                                {txn.notes && (
                                                    <div className="mt-1 text-xs text-muted-foreground italic">Note: {txn.notes}</div>
                                                )}
                                                {txn.reference && (
                                                    <div className="mt-1 text-xs text-muted-foreground">Ref: {txn.reference}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}

                            {/* Adjustments Tab */}
                            {activeTab === "adjustments" && (
                                adjustments.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                        <p>No adjustments yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {adjustments.map((txn: any) => (
                                            <div key={txn.id} className="border rounded-lg p-4 border-l-4 border-l-blue-400">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <CreditCard className="h-4 w-4 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">
                                                                {txn.type === "OPENING_BALANCE" ? "Opening balance" : "Adjustment"}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                <DateDisplay date={txn.date} format="long" />
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className={`text-lg font-bold ${Number(txn.amount) > 0 ? "text-red-600" : Number(txn.amount) < 0 ? "text-green-600" : "text-muted-foreground"}`}>
                                                        {Number(txn.amount) > 0 ? `+ ${formatCurrency(Number(txn.amount))}` : Number(txn.amount) < 0 ? `- ${formatCurrency(Number(txn.amount))}` : "रू 0.00"}
                                                    </p>
                                                </div>
                                                {txn.notes && (
                                                    <div className="mt-2 text-xs text-muted-foreground italic">Note: {txn.notes}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}

                            {/* Voided Tab */}
                            {activeTab === "voided" && (
                                voided.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                        <p>No voided records yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {voided
                                            .slice()
                                            .sort(
                                                (a: any, b: any) =>
                                                    new Date(b.voidedAt).getTime() -
                                                    new Date(a.voidedAt).getTime()
                                            )
                                            .map((v: any) => (
                                                <div key={`${v.kind}-${v.id}`} className="border rounded-lg p-4 border-l-4 border-l-gray-400">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                                                <Trash2 className="h-4 w-4 text-gray-600" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium">
                                                                        {v.kind === "PURCHASE" ? "Purchase" : "Payment"}
                                                                    </p>
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        Voided
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    Original: <DateDisplay date={v.date} format="long" />
                                                                </p>
                                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                    <Calendar className="h-3 w-3" />
                                                                    Voided: <DateDisplay date={v.voidedAt} format="long" />
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-gray-700">
                                                                {v.kind === "PURCHASE" ? "+ " : "- "}
                                                                {formatCurrency(Number(v.amount))}
                                                            </p>
                                                            {v.itemsCount != null && v.kind === "PURCHASE" ? (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Items: {v.itemsCount}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 text-xs text-muted-foreground">
                                                        Reason: {v.voidedReason ? v.voidedReason : "—"}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )
                            )}
                        </CardContent>
                    </Card>
                );
            })()}

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
