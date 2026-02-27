"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Plus,
    Search,
    Building2,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Eye,
    RefreshCw,
    Archive,
    ArchiveRestore,
    X,
    Wallet,
    CreditCard,
    Truck,
    ShoppingCart,
    Trash2,
    Edit,
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
import {
    useGetDealerVerificationRequests,
    useGetDealerCompanies,
    useCreateDealerVerificationRequest,
    useCancelDealerVerificationRequest,
    useArchiveDealerCompany,
    useUnarchiveDealerCompany,
    useGetArchivedDealerCompanies,
    type DealerVerificationRequest,
} from "@/fetchers/dealer/dealerVerificationQueries";
import { useGetAllCompanyAccounts } from "@/fetchers/dealer/dealerCompanyAccountQueries";
import { PublicCompanySearchSelect } from "@/common/components/forms/PublicCompanySearchSelect";
import { useI18n } from "@/i18n/useI18n";
import { DateDisplay } from "@/common/components/ui/date-display";
import {
    useGetManualCompanies,
    useCreateManualCompany,
    useUpdateManualCompany,
    useDeleteManualCompany,
    useRecordManualPurchase,
    useRecordManualCompanyPayment,
    type ManualCompany,
    type PurchaseItem,
} from "@/fetchers/dealer/dealerManualCompanyQueries";
import {
    useGetDealerProducts,
} from "@/fetchers/dealer/dealerProductQueries";

export default function DealerCompanyPage() {
    const { t } = useI18n();
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [viewTab, setViewTab] = useState<"active" | "archived">("active");
    const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; name: string } | null>(null);
    const [cancelConfirm, setCancelConfirm] = useState<{ id: string; companyName: string } | null>(null);

    // Manual company state
    const [isAddManualOpen, setIsAddManualOpen] = useState(false);
    const [manualForm, setManualForm] = useState({ name: "", phone: "", address: "" });
    const [purchaseCompany, setPurchaseCompany] = useState<ManualCompany | null>(null);
    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([{ productName: "", type: "FEED", unit: "kg", quantity: 0, costPrice: 0, sellingPrice: 0 }]);
    const [purchaseNotes, setPurchaseNotes] = useState("");
    const [paymentCompany, setPaymentCompany] = useState<ManualCompany | null>(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [paymentNotes, setPaymentNotes] = useState("");
    const [deleteManualConfirm, setDeleteManualConfirm] = useState<ManualCompany | null>(null);

    // Queries
    const { data: requestsData, isLoading: requestsLoading } =
        useGetDealerVerificationRequests();
    const { data: companiesData, isLoading: companiesLoading } = useGetDealerCompanies();
    const { data: archivedCompaniesData, isLoading: archivedLoading } = useGetArchivedDealerCompanies();
    const { data: accountsData } = useGetAllCompanyAccounts();
    const accounts = accountsData || [];

    // Dealer products for Quick Restock
    const { data: dealerProductsData } = useGetDealerProducts({ limit: 200 });
    const existingProducts = dealerProductsData?.data || [];

    // Mutations
    const createRequestMutation = useCreateDealerVerificationRequest();
    const cancelRequestMutation = useCancelDealerVerificationRequest();
    const archiveMutation = useArchiveDealerCompany();
    const unarchiveMutation = useUnarchiveDealerCompany();

    // Manual company queries & mutations
    const { data: manualCompaniesData, isLoading: manualLoading } = useGetManualCompanies();
    const createManualMutation = useCreateManualCompany();
    const deleteManualMutation = useDeleteManualCompany();
    const recordPurchaseMutation = useRecordManualPurchase();
    const recordPaymentMutation = useRecordManualCompanyPayment();
    const manualCompanies = manualCompaniesData || [];

    const requests = requestsData?.data || [];
    const connectedCompanies = companiesData?.data || [];
    const archivedCompanies = archivedCompaniesData?.data || [];

    // Filter out APPROVED requests from verification requests (they're shown in connected companies)
    // Note: REJECTED requests can be retried and will become PENDING, so we show both
    const verificationRequests = requests.filter(
        (request) => request.status === "PENDING" || request.status === "REJECTED"
    );

    // Filter verification requests based on status filter and search
    const filteredVerificationRequests = verificationRequests.filter((request) => {
        const matchesStatus =
            statusFilter === "ALL" || request.status === statusFilter;
        const matchesSearch = search
            ? request.company?.name
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||
            request.company?.address
                ?.toLowerCase()
                .includes(search.toLowerCase())
            : true;

        return matchesStatus && matchesSearch;
    });

    // Filter connected companies based on search
    const filteredConnectedCompanies = connectedCompanies.filter((company) => {
        const matchesSearch = search
            ? company.name?.toLowerCase().includes(search.toLowerCase()) ||
            company.address?.toLowerCase().includes(search.toLowerCase())
            : true;

        return matchesSearch;
    });

    // Group verification requests by status


    const handleApply = async () => {
        if (!selectedCompanyId) {
            toast.error("Please select a company");
            return;
        }

        try {
            await createRequestMutation.mutateAsync({
                companyId: selectedCompanyId,
            });
            toast.success("Verification request sent successfully");
            setIsApplyDialogOpen(false);
            setSelectedCompanyId(null);
        } catch (error: any) {
            toast.error(
                error.response?.data?.message ||
                "Failed to send verification request. Please check if you can retry (wait 1 hour after rejection, and ensure you haven't been rejected 3 times)."
            );
        }
    };

    const handleRetry = async (request: DealerVerificationRequest) => {
        if (!request.companyId) {
            toast.error("Company ID not found");
            return;
        }

        try {
            await createRequestMutation.mutateAsync({
                companyId: request.companyId,
            });
            toast.success("Retry request sent successfully");
        } catch (error: any) {
            toast.error(
                error.response?.data?.message ||
                "Failed to retry verification request. Please check if you can retry (wait 1 hour after rejection, and ensure you haven't been rejected 3 times)."
            );
        }
    };

    const canRetry = (request: DealerVerificationRequest): boolean => {
        if (request.status !== "REJECTED") return false;
        if (request.rejectedCount >= 3) return false;
        if (!request.lastRejectedAt) return true;

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const lastRejected = new Date(request.lastRejectedAt);
        return lastRejected < oneHourAgo;
    };

    const handleCancelRequest = async (requestId: string) => {
        try {
            await cancelRequestMutation.mutateAsync(requestId);
            toast.success("Verification request cancelled successfully");
            setCancelConfirm(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to cancel request");
        }
    };

    const handleArchive = async (connectionId: string) => {
        try {
            await archiveMutation.mutateAsync(connectionId);
            toast.success("Connection archived successfully");
            setArchiveConfirm(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to archive connection");
        }
    };

    const handleUnarchive = async (connectionId: string, companyName: string) => {
        try {
            await unarchiveMutation.mutateAsync(connectionId);
            toast.success(`${companyName} restored successfully`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to restore connection");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return (
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        <Clock className="mr-1 h-3 w-3" />
                        {t("dealer.company.badges.pending")}
                    </Badge>
                );
            case "APPROVED":
                return (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {t("dealer.company.badges.approved")}
                    </Badge>
                );
            case "REJECTED":
                return (
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                        <XCircle className="mr-1 h-3 w-3" />
                        {t("dealer.company.badges.rejected")}
                    </Badge>
                );
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const getRetryMessage = (request: DealerVerificationRequest): string => {
        if (request.rejectedCount >= 3) {
            return t("dealer.company.requests.card.cannotRetry");
        }
        if (request.lastRejectedAt) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const lastRejected = new Date(request.lastRejectedAt);
            if (lastRejected > oneHourAgo) {
                const minutesRemaining = Math.ceil(
                    (lastRejected.getTime() - oneHourAgo.getTime()) / (60 * 1000)
                );
                return t("dealer.company.requests.card.waitRetry", { minutes: minutesRemaining });
            }
        }
        return "";
    };

    // Get balance for a specific company
    const getCompanyBalance = (companyId: string) => {
        const account = accounts.find((a) => a.companyId === companyId);
        return account?.balance || 0;
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return `रू ${Math.abs(amount).toFixed(2)}`;
    };

    // Manual company handlers
    const handleCreateManualCompany = async () => {
        if (!manualForm.name.trim()) {
            toast.error("Company name is required");
            return;
        }
        try {
            await createManualMutation.mutateAsync(manualForm);
            toast.success("Manual company added successfully");
            setIsAddManualOpen(false);
            setManualForm({ name: "", phone: "", address: "" });
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
        try {
            await recordPurchaseMutation.mutateAsync({
                companyId: purchaseCompany.id,
                items: validItems,
                notes: purchaseNotes || undefined,
            });
            toast.success("Purchase recorded! Items added to inventory.");
            setPurchaseCompany(null);
            setPurchaseItems([{ productName: "", type: "FEED", unit: "kg", quantity: 0, costPrice: 0, sellingPrice: 0 }]);
            setPurchaseNotes("");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to record purchase");
        }
    };

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
            });
            toast.success("Payment recorded successfully");
            setPaymentCompany(null);
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

    if (requestsLoading || companiesLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">My Companies</h1>
                        <p className="text-muted-foreground">
                            Manage your company connections and verification requests
                        </p>
                    </div>
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
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        className="flex-1 sm:flex-none hover:bg-green-50 hover:text-green-700 border-green-200"
                        onClick={() => router.push("/dealer/dashboard/consignments")}
                    >
                        <Truck className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">{t("dealer.company.buttons.consignments")}</span>
                        <span className="sm:hidden">{t("dealer.company.buttons.consignments")}</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 sm:flex-none hover:bg-green-50 hover:text-green-700 border-green-200"
                        onClick={() => router.push("/dealer/dashboard/payments")}
                    >
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">{t("dealer.company.buttons.paymentRequest")}</span>
                        <span className="sm:hidden">{t("dealer.company.buttons.paymentRequest")}</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsApplyDialogOpen(true)}
                        className="flex-1 sm:flex-none hover:bg-green-50 hover:text-green-700 border-green-200"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">{t("dealer.company.buttons.apply")}</span>
                        <span className="sm:hidden">{t("dealer.company.buttons.apply")}</span>
                    </Button>
                </div>
            </div>



            {/* Tab Selector */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setViewTab("active")}
                    className={`px-4 py-2 font-medium transition-colors ${viewTab === "active"
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    {t("dealer.company.tabs.active")}
                </button>
                <button
                    onClick={() => setViewTab("archived")}
                    className={`px-4 py-2 font-medium transition-colors ${viewTab === "archived"
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    {t("dealer.company.tabs.archived", { count: archivedCompanies.length })}
                </button>
            </div>

            {viewTab === "active" ? (
                <>
                    {/* Connected Companies Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("dealer.company.connected.title")}</CardTitle>
                            <CardDescription>
                                {t("dealer.company.connected.subtitle", { count: filteredConnectedCompanies.length })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {filteredConnectedCompanies.length === 0 ? (
                                <div className="text-center py-8">
                                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">{t("dealer.company.connected.empty.title")}</h3>
                                    <p className="text-muted-foreground mb-4">
                                        {search
                                            ? t("dealer.company.connected.empty.descSearch")
                                            : t("dealer.company.connected.empty.descDefault")}
                                    </p>
                                    {!search && (
                                        <Button onClick={() => setIsApplyDialogOpen(true)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t("dealer.company.buttons.apply")}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {filteredConnectedCompanies.map((company) => (
                                        <Card key={company.id} className="relative overflow-hidden border-green-200 bg-green-50/30">
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <CardTitle className="text-lg">{company.name}</CardTitle>
                                                        {company.address && (
                                                            <CardDescription className="mt-1">
                                                                {company.address}
                                                            </CardDescription>
                                                        )}
                                                    </div>
                                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                                        <CheckCircle className="mr-1 h-3 w-3" />
                                                        {t("dealer.company.badges.connected")}
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                {(() => {
                                                    const balance = getCompanyBalance(company.id);
                                                    return (
                                                        <>
                                                            <div className="space-y-2 text-sm">
                                                                {/* Balance Display */}
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">{t("dealer.company.connected.card.balance")}</span>
                                                                    <span
                                                                        className={`font-bold ${balance > 0
                                                                            ? "text-red-600"
                                                                            : balance < 0
                                                                                ? "text-green-600"
                                                                                : ""
                                                                            }`}
                                                                    >
                                                                        {balance > 0
                                                                            ? `${formatCurrency(balance)} ${t("dealer.company.connected.card.owed")}`
                                                                            : balance < 0
                                                                                ? `${formatCurrency(balance)} ${t("dealer.company.connected.card.advance")}`
                                                                                : "रू 0.00"}
                                                                    </span>
                                                                </div>
                                                                {company.owner && (
                                                                    <>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-muted-foreground">{t("dealer.company.connected.card.owner")}</span>
                                                                            <span className="font-medium">{company.owner.name}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-muted-foreground">{t("dealer.company.connected.card.contact")}</span>
                                                                            <span className="font-medium">{company.owner.phone}</span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">{t("dealer.company.connected.card.connected")}</span>
                                                                    <span className="font-medium text-green-600">
                                                                        <DateDisplay date={company.connectedAt} />
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="mt-4 flex gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="flex-1"
                                                                    onClick={() => router.push(`/dealer/dashboard/companies/${company.id}/account`)}
                                                                >
                                                                    <Wallet className="mr-2 h-4 w-4" />
                                                                    {t("dealer.company.buttons.viewAccount")}
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="flex-1"
                                                                    onClick={() => {
                                                                        window.location.href = `/dealer/dashboard/company/${company.id}/catalog`;
                                                                    }}
                                                                >
                                                                    <Eye className="mr-2 h-4 w-4" />
                                                                    {t("dealer.company.buttons.viewCatalog")}
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setArchiveConfirm({ id: company.dealerCompanyId, name: company.name })}
                                                                    className="text-muted-foreground hover:text-foreground"
                                                                >
                                                                    <Archive className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Manual Companies Section */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Manual Companies</CardTitle>
                                    <CardDescription>
                                        Companies added manually for purchase tracking ({manualCompanies.length})
                                    </CardDescription>
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
                            {manualCompanies.length === 0 ? (
                                <div className="text-center py-8">
                                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No Manual Companies</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Add companies you purchase from that aren&apos;t on the platform
                                    </p>
                                    <Button onClick={() => setIsAddManualOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Manual Company
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {manualCompanies.map((company) => (
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
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setDeleteManualConfirm(company)}
                                                        className="text-muted-foreground hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Verification Requests Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("dealer.company.requests.title")}</CardTitle>
                            <CardDescription>
                                {t("dealer.company.requests.subtitle", { count: filteredVerificationRequests.length })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {filteredVerificationRequests.length === 0 ? (
                                <div className="text-center py-8">
                                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">{t("dealer.company.requests.empty.title")}</h3>
                                    <p className="text-muted-foreground mb-4">
                                        {search || statusFilter !== "ALL"
                                            ? t("dealer.company.requests.empty.descSearch")
                                            : t("dealer.company.requests.empty.descDefault")}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {filteredVerificationRequests.map((request) => (
                                        <Card key={request.id} className="relative">
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <CardTitle className="text-lg">
                                                            {request.company?.name || "Unknown Company"}
                                                        </CardTitle>
                                                        {request.company?.address && (
                                                            <CardDescription className="mt-1">
                                                                {request.company.address}
                                                            </CardDescription>
                                                        )}
                                                    </div>
                                                    {getStatusBadge(request.status)}
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">{t("dealer.company.requests.card.status")}</span>
                                                        <span className="font-medium">{request.status}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">{t("dealer.company.requests.card.applied")}</span>
                                                        <span className="font-medium">
                                                            <DateDisplay date={request.createdAt} />
                                                        </span>
                                                    </div>
                                                    {request.status === "REJECTED" && (
                                                        <>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">{t("dealer.company.requests.card.rejectionCount")}</span>
                                                                <span className="font-medium text-red-600">
                                                                    {request.rejectedCount}/3
                                                                </span>
                                                            </div>
                                                            {request.lastRejectedAt && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">{t("dealer.company.requests.card.lastRejected")}</span>
                                                                    <span className="font-medium">
                                                                        <DateDisplay date={request.lastRejectedAt} />
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                <div className="mt-4 flex gap-2">
                                                    {request.status === "REJECTED" && canRetry(request) && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 text-blue-600 hover:text-blue-700"
                                                            onClick={() => handleRetry(request)}
                                                            disabled={createRequestMutation.isPending}
                                                        >
                                                            <RefreshCw className="mr-2 h-4 w-4" />
                                                            {t("dealer.company.buttons.retry")}
                                                        </Button>
                                                    )}
                                                    {request.status === "REJECTED" && !canRetry(request) && (
                                                        <div className="flex-1">
                                                            <p className="text-xs text-red-600 text-center">
                                                                {getRetryMessage(request)}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {request.status === "PENDING" && (
                                                        <>
                                                            <div className="flex-1">
                                                                <p className="text-xs text-yellow-600 text-center font-medium">
                                                                    {t("dealer.company.requests.card.waiting")}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setCancelConfirm({ id: request.id, companyName: request.company?.name || "this company" })}
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <X className="mr-1 h-4 w-4" />
                                                                {t("dealer.company.buttons.cancel")}
                                                            </Button>
                                                        </>
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
            ) : (
                /* Archived Companies Tab */
                <Card>
                    <CardHeader>
                        <CardTitle>{t("dealer.company.archived.title")}</CardTitle>
                        <CardDescription>
                            {t("dealer.company.archived.subtitle", { count: archivedCompanies.length })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {archivedCompanies.length === 0 ? (
                            <div className="text-center py-8">
                                <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">{t("dealer.company.archived.empty.title")}</h3>
                                <p className="text-muted-foreground">
                                    {t("dealer.company.archived.empty.desc")}
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {archivedCompanies.map((company) => (
                                    <Card key={company.id} className="relative border-gray-300 bg-gray-50/30">
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <CardTitle className="text-lg">{company.name}</CardTitle>
                                                    {company.address && (
                                                        <CardDescription className="mt-1">
                                                            {company.address}
                                                        </CardDescription>
                                                    )}
                                                </div>
                                                <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200">
                                                    <Archive className="mr-1 h-3 w-3" />
                                                    {t("dealer.company.badges.archived")}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2 text-sm">
                                                {company.owner && (
                                                    <>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">{t("dealer.company.connected.card.owner")}</span>
                                                            <span className="font-medium">{company.owner.name}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">{t("dealer.company.connected.card.contact")}</span>
                                                            <span className="font-medium">{company.owner.phone}</span>
                                                        </div>
                                                    </>
                                                )}
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">{t("dealer.company.connected.card.connected")}</span>
                                                    <span className="font-medium">
                                                        <DateDisplay date={company.connectedAt} />
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full"
                                                    onClick={() => handleUnarchive(company.dealerCompanyId, company.name)}
                                                    disabled={unarchiveMutation.isPending}
                                                >
                                                    <ArchiveRestore className="mr-2 h-4 w-4" />
                                                    {t("dealer.company.buttons.restore")}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Archive Confirmation Dialog */}
            {archiveConfirm && (
                <Dialog open={!!archiveConfirm} onOpenChange={() => setArchiveConfirm(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t("dealer.company.dialogs.archive.title")}</DialogTitle>
                            <DialogDescription>
                                {t("dealer.company.dialogs.archive.description", { name: archiveConfirm.name })}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setArchiveConfirm(null)}>
                                {t("dealer.company.dialogs.archive.cancel")}
                            </Button>
                            <Button
                                onClick={() => handleArchive(archiveConfirm.id)}
                                disabled={archiveMutation.isPending}
                            >
                                {t("dealer.company.dialogs.archive.confirm")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )
            }

            {/* Cancel Request Confirmation Dialog */}
            {
                cancelConfirm && (
                    <Dialog open={!!cancelConfirm} onOpenChange={() => setCancelConfirm(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Cancel Verification Request</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to cancel your verification request to {cancelConfirm.companyName}?
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCancelConfirm(null)}>
                                    No, Keep It
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleCancelRequest(cancelConfirm.id)}
                                    disabled={cancelRequestMutation.isPending}
                                >
                                    {t("dealer.company.dialogs.cancelRequest.confirm")}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            }

            {/* Apply to Company Dialog */}
            <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
                <DialogContent className="max-w-2xl bg-white">
                    <DialogHeader>
                        <DialogTitle>{t("dealer.company.dialogs.apply.title")}</DialogTitle>
                        <DialogDescription>
                            {t("dealer.company.dialogs.apply.description")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("dealer.company.dialogs.apply.selectLabel")}</label>
                            <PublicCompanySearchSelect
                                value={selectedCompanyId || undefined}
                                onValueChange={(companyId) => setSelectedCompanyId(companyId || null)}
                                placeholder={t("dealer.company.dialogs.apply.placeholder")}
                            />
                            {selectedCompanyId && (
                                <p className="text-xs text-muted-foreground">
                                    {t("dealer.company.dialogs.apply.helpText")}
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsApplyDialogOpen(false);
                                setSelectedCompanyId(null);
                            }}
                            disabled={createRequestMutation.isPending}
                        >
                            {t("dealer.company.dialogs.archive.cancel")}
                        </Button>
                        <Button
                            onClick={handleApply}
                            disabled={!selectedCompanyId || createRequestMutation.isPending}
                            className="bg-primary"
                        >
                            {createRequestMutation.isPending ? t("dealer.company.dialogs.apply.sending") : t("dealer.company.dialogs.apply.confirm")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                        {/* Quick Restock: pick from existing products */}
                        {existingProducts.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm font-medium text-blue-800 mb-2">Quick Restock — Pick an existing product</p>
                                <Select
                                    onValueChange={(productId) => {
                                        const product = existingProducts.find((p: any) => p.id === productId);
                                        if (product) {
                                            // Add a new item pre-filled with existing product details
                                            const newItem: PurchaseItem = {
                                                productName: product.name,
                                                type: product.type,
                                                unit: product.unit,
                                                quantity: 0,
                                                costPrice: Number(product.costPrice),
                                                sellingPrice: Number(product.sellingPrice),
                                            };
                                            // Replace the first empty item or add to end
                                            const firstEmpty = purchaseItems.findIndex(i => !i.productName);
                                            if (firstEmpty >= 0) {
                                                const updated = [...purchaseItems];
                                                updated[firstEmpty] = newItem;
                                                setPurchaseItems(updated);
                                            } else {
                                                setPurchaseItems([...purchaseItems, newItem]);
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Select a product to restock..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white max-h-60">
                                        {existingProducts.map((product: any) => (
                                            <SelectItem key={product.id} value={product.id}>
                                                {product.name} — रू {Number(product.costPrice).toFixed(2)}/{product.unit} (Stock: {Number(product.currentStock).toFixed(2)})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-blue-600 mt-1">Just enter the quantity — all details are auto-filled from your existing product</p>
                            </div>
                        )}

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
                        <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                            <span className="font-medium">Grand Total</span>
                            <span className="text-lg font-bold">
                                रू {purchaseItems.reduce((sum, i) => sum + i.quantity * i.costPrice, 0).toFixed(2)}
                            </span>
                        </div>
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
                                    Are you sure you want to delete &quot;{deleteManualConfirm.name}&quot;? All purchase and payment history for this company will be removed. Inventory items will not be affected.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteManualConfirm(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
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
