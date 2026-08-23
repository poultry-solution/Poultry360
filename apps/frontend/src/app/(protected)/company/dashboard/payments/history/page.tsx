"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Calendar as CalendarIcon,
    Search,
    Eye,
    FileText,
    DollarSign,
    Filter,
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
import { DataTable, Column } from "@/common/components/ui/data-table";
import { Badge } from "@/common/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/common/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/common/components/ui/dialog";
import { useGetAllCompanyPayments } from "@/fetchers/company/companyDealerAccountQueries";
import { useGetCompanyDealers } from "@/fetchers/company/companyDealerQueries";
import Image from "next/image";
import { DateDisplay } from "@/common/components/ui/date-display";

export default function AllPaymentsPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [selectedDealerId, setSelectedDealerId] = useState<string>("ALL");
    const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);

    // Queries
    const { data: paymentsData, isLoading: paymentsLoading } =
        useGetAllCompanyPayments({
            page,
            limit: 50,
            dealerId: selectedDealerId !== "ALL" ? selectedDealerId : undefined,
        });

    const { data: dealersData } = useGetCompanyDealers({ limit: 100 });
    const dealers = dealersData?.data || [];

    const payments = paymentsData?.data || [];
    const pagination = paymentsData?.pagination || {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1,
    };

    const formatCurrency = (amount: number) => {
        return `रू ${amount.toFixed(2)}`;
    };

    const formatPaymentMethod = (method: string) => {
        if (!method) return "N/A";
        return method
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
    };

    // Filter payments based on search (client-side for now as API search isn't implemented)
    const filteredPayments = payments.filter((payment: any) => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            payment.dealerName?.toLowerCase().includes(searchLower) ||
            payment.reference?.toLowerCase().includes(searchLower) ||
            payment.notes?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-8 w-8"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Payment History</h1>
                        <p className="text-sm text-muted-foreground">
                            View all verified payments from dealers
                        </p>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-1">
                            <div className="relative flex-1 md:max-w-xs">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search dealer, reference..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select
                                value={selectedDealerId}
                                onValueChange={setSelectedDealerId}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-muted-foreground" />
                                        <SelectValue placeholder="Filter by Dealer" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Dealers</SelectItem>
                                    {dealers.map((dealer: any) => (
                                        <SelectItem key={dealer.id} value={dealer.id}>
                                            {dealer.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Total: <span className="font-medium text-foreground">{pagination.total}</span> payments
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <DataTable
                        data={filteredPayments}
                        loading={paymentsLoading}
                        emptyMessage="No payments found."
                        columns={[
                            {
                                key: "paymentDate",
                                label: "Date",
                                width: "120px",
                                render: (val) => (
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                        <DateDisplay date={val} />
                                    </div>
                                ),
                            },
                            {
                                key: "dealerName",
                                label: "Dealer",
                                width: "180px",
                                render: (val, row) => (
                                    <div>
                                        <div className="font-medium">{val}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {row.dealerContact}
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                key: "amount",
                                label: "Amount",
                                align: "right",
                                width: "120px",
                                render: (val) => (
                                    <span className="font-bold text-green-600">
                                        {formatCurrency(val)}
                                    </span>
                                ),
                            },
                            {
                                key: "paymentMethod",
                                label: "Method",
                                width: "120px",
                                render: (val) => (
                                    <Badge variant="outline">{formatPaymentMethod(val)}</Badge>
                                ),
                            },
                            {
                                key: "reference",
                                label: "Reference",
                                width: "150px",
                                render: (val) => (
                                    <div className="text-sm">
                                        {val || <span className="text-muted-foreground">-</span>}
                                    </div>
                                ),
                            },
                            {
                                key: "notes",
                                label: "Notes",
                                render: (val) => (
                                    <div className="text-sm text-muted-foreground truncate max-w-[200px]" title={val}>
                                        {val || "-"}
                                    </div>
                                ),
                            },
                            {
                                key: "receiptImageUrl",
                                label: "Receipt",
                                align: "center",
                                width: "80px",
                                render: (val) =>
                                    val ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setViewReceiptUrl(val)}
                                        >
                                            <FileText className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">-</span>
                                    ),
                            },
                        ] as Column[]}
                    />
                </CardContent>
            </Card>

            {/* View Receipt Dialog */}
            <Dialog
                open={!!viewReceiptUrl}
                onOpenChange={(open) => !open && setViewReceiptUrl(null)}
            >
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Payment Receipt</DialogTitle>
                        <DialogDescription>
                            View the uploaded receipt for this payment
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative aspect-video w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                        {viewReceiptUrl && (
                            <Image
                                src={viewReceiptUrl}
                                alt="Payment Receipt"
                                fill
                                className="object-contain"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
