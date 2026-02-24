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
import { useGetManualCompanyStatement } from "@/fetchers/dealer/dealerManualCompanyQueries";

export default function ManualCompanyAccountPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [activeTab, setActiveTab] = useState<"purchases" | "payments">("purchases");

    const { data, isLoading } = useGetManualCompanyStatement(id);

    const company = data?.company;
    const transactions = data?.transactions || [];

    const formatCurrency = (amount: number) => {
        return `रू ${Math.abs(amount).toFixed(2)}`;
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
                    </div>
                </CardHeader>
            </Card>

            {/* Balance Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                                                                {new Date(txn.date).toLocaleDateString("en-US", {
                                                                    year: "numeric", month: "short", day: "numeric",
                                                                    hour: "2-digit", minute: "2-digit",
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="text-lg font-bold text-orange-600">
                                                        + {formatCurrency(txn.amount)}
                                                    </p>
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
                                                                {new Date(txn.date).toLocaleDateString("en-US", {
                                                                    year: "numeric", month: "short", day: "numeric",
                                                                    hour: "2-digit", minute: "2-digit",
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
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
                        </CardContent>
                    </Card>
                );
            })()}
        </div>
    );
}
