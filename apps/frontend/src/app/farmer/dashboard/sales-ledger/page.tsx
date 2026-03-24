"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Label } from "@/common/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import { DataTable } from "@/common/components/ui/data-table";
import {
  Plus,
  Search,
  Filter,

  TrendingUp,
  Users,

  CreditCard,

  Loader2,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Receipt,
  AlertCircle,
  X,
} from "lucide-react";
import {
  useSalesManagement,
  useGetCustomersForSales,
  useGetEggInventory,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useGetSalePayments,
  useGetCustomer,
  useAddCustomerPayment,
  useSoftDeleteCustomerPayment,
} from "@/fetchers/sale/saleQueries";

import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { useGetUserFarms } from "@/fetchers/farms/farmQueries";
import { useGetEggTypes } from "@/fetchers/eggTypes/eggTypeQueries";
import { toast } from "sonner";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DateInput } from "@/common/components/ui/date-input";
import { ImageUpload } from "@/common/components/ui/image-upload";
import { useI18n } from "@/i18n/useI18n";
import { getTodayLocalDate } from "@/common/lib/utils";

// Types
type TabType = "overview" | "sales" | "parties" | "payments";

interface SalesFilters {
  search: string;
  itemType: string;
  isCredit: string;
  startDate: string;
  endDate: string;
  customerId: string;
}

interface PartyFilters {
  search: string;
  category: string;
  hasBalance: string;
}

interface PaymentFilters {
  search: string;
  startDate: string;
  endDate: string;
}

const OPEN_MODAL_PARAM = "openModal";

export default function SalesLedgerPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  // State management
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  // Party details is now a dedicated page (see /sales-ledger/party/[partyId])
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);
  const [partyToDelete, setPartyToDelete] = useState<string | null>(null);
  const [selectedParty, setSelectedParty] = useState<any>(null);

  // Payment delete mode
  const [showDeletedPayments, setShowDeletedPayments] = useState(false);
  const [isPaymentDeleteMode, setIsPaymentDeleteMode] = useState(false);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());
  const [isConfirmPaymentDeleteOpen, setIsConfirmPaymentDeleteOpen] = useState(false);
  const [isPaymentPasswordModalOpen, setIsPaymentPasswordModalOpen] = useState(false);
  const [paymentDeletePasswordForm, setPaymentDeletePasswordForm] = useState({ password: "" });
  const [paymentDeleteError, setPaymentDeleteError] = useState<{ message: string } | null>(null);
  const softDeletePayment = useSoftDeleteCustomerPayment();

  // Filters
  const [salesFilters, setSalesFilters] = useState<SalesFilters>({
    search: "",
    itemType: "",
    isCredit: "",
    startDate: "",
    endDate: "",
    customerId: "",
  });

  const [partyFilters, setPartyFilters] = useState<PartyFilters>({
    search: "",
    category: "",
    hasBalance: "",
  });

  const [paymentFilters, setPaymentFilters] = useState<PaymentFilters>({
    search: "",
    startDate: "",
    endDate: "",
  });

  type EggLineRow = { eggTypeId: string; quantity: string; unitPrice: string };
  // Form states
  const [saleForm, setSaleForm] = useState<{
    farmId: string;
    batchId: string;
    itemType: string;
    eggTypeId: string;
    eggLineItems: EggLineRow[];
    rate: string;
    quantity: string;
    weight: string;
    date: string;
    remaining: boolean;
    customerId: string;
    customerName: string;
    contact: string;
    customerCategory: string;
    balance: string;
  }>({
    farmId: "",
    batchId: "",
    itemType: "Chicken_Meat",
    eggTypeId: "",
    eggLineItems: [{ eggTypeId: "", quantity: "", unitPrice: "" }],
    rate: "",
    quantity: "",
    weight: "",
    date: getTodayLocalDate(),
    remaining: false,
    customerId: "",
    customerName: "",
    contact: "",
    customerCategory: "Chicken",
    balance: "",
  });

  const [useCustomInvoice, setUseCustomInvoice] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const [partyForm, setPartyForm] = useState({
    name: "",
    phone: "",
    category: "Chicken",
    address: "",
    openingBalanceAmount: "",
    openingBalanceDirection: "OWED" as "OWED" | "ADVANCE",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: getTodayLocalDate(),
    description: "",
    reference: "",
    receiptUrl: "",
  });

  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>(
    {}
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Customer search for sales (same as home page)
  const [customerSearch, setCustomerSearch] = useState("");

  // Open Add Sale modal when navigating from home quick action (?openModal=sale)
  useEffect(() => {
    const openModal = searchParams.get(OPEN_MODAL_PARAM);
    if (openModal === "sale") {
      setIsSaleModalOpen(true);
      router.replace("/farmer/dashboard/sales-ledger", { scroll: false });
    }
  }, [searchParams, router]);

  // Ensure default date when modal opens (same as home page)
  useEffect(() => {
    if (isSaleModalOpen) {
      if (!saleForm.date) {
        const today = getTodayLocalDate();
        setSaleForm((p) => ({ ...p, date: today }));
      }
    }
  }, [isSaleModalOpen, saleForm.date]);

  // Data fetching
  const {
    sales,
    pagination,
    categories,
    isLoading,
    error,
    createSale,
    updateSale,
    deleteSale,
    addPayment,
    isCreating,
    isUpdating,
    isDeleting,
    isAddingPayment,
  } = useSalesManagement({
    ...salesFilters,
    isCredit: salesFilters.isCredit
      ? salesFilters.isCredit === "true"
      : undefined,
    page: 1,
    limit: 50,
  });

  const { data: customers, isLoading: customersLoading } =
    useGetCustomersForSales(partyFilters.search, {
      enabled: true,
    });

  const { data: eggTypesData } = useGetEggTypes({ enabled: true });
  const eggTypes = eggTypesData?.data ?? [];
  const { data: eggInventoryResponse } = useGetEggInventory({
    batchId: saleForm.batchId || null,
    enabled: isSaleModalOpen && saleForm.itemType === "EGGS",
  });
  const eggInventory = eggInventoryResponse?.data;

  // Fetch farms and batches for sale form (same as home page)
  const { data: batchesResponse } = useGetAllBatches();
  const { data: farmsResponse } = useGetUserFarms("all");

  const activeBatches = batchesResponse?.data || [];
  const farms = farmsResponse?.data || [];

  // Customer management mutations
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();
  const addCustomerPayment = useAddCustomerPayment();

  const selectedPartyId = selectedParty?.id as string | undefined;

  const { data: editingPartyDetail } = useGetCustomer(editingPartyId || "", {
    enabled: isPartyModalOpen && !!editingPartyId,
  });
  const editingPartyFull = editingPartyDetail?.data;

  // Fetch payments
  const { data: paymentsResponse, isLoading: paymentsLoading } = useGetSalePayments({
    page: 1,
    limit: 50,
    search: paymentFilters.search,
    startDate: paymentFilters.startDate,
    endDate: paymentFilters.endDate,
  }, {
    enabled: activeTab === "payments",
  });
  const payments = paymentsResponse?.data || [];
  const paymentsPagination = paymentsResponse?.pagination;

  // Computed values
  const salesStats = useMemo(() => {
    const totalSales = sales.length;
    const totalAmount = sales.reduce(
      (sum: number, sale: any) => sum + Number(sale.amount),
      0
    );
    const creditSales = sales.filter((sale: any) => sale.isCredit).length;
    const creditAmount = sales
      .filter((sale: any) => sale.isCredit)
      .reduce((sum: number, sale: any) => sum + Number(sale.amount), 0);

    return {
      totalSales,
      totalAmount,
      creditSales,
      creditAmount,
      cashSales: totalSales - creditSales,
      cashAmount: totalAmount - creditAmount,
    };
  }, [sales]);

  const partyStats = useMemo(() => {
    if (!customers)
      return { totalParties: 0, totalBalance: 0, partiesWithBalance: 0 };

    const totalParties = customers.length;
    const totalBalance = customers.reduce(
      (sum: number, customer: any) => sum + Number(customer.balance || 0),
      0
    );
    const partiesWithBalance = customers.filter(
      (customer: any) => Number(customer.balance || 0) > 0
    ).length;

    return { totalParties, totalBalance, partiesWithBalance };
  }, [customers]);

  // Event handlers
  const handleSalesFilterChange = (key: keyof SalesFilters, value: string) => {
    setSalesFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handlePartyFilterChange = (key: keyof PartyFilters, value: string) => {
    setPartyFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handlePaymentFilterChange = (key: keyof PaymentFilters, value: string) => {
    setPaymentFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Payment delete mode handlers
  function toggleAllPayments() {
    const selectablePayments = payments.filter(
      (p: any) => p.source === "CUSTOMER_RECEIPT" && !p.deletedAt
    );
    if (!selectablePayments.length) return;
    if (selectedPaymentIds.size === selectablePayments.length) {
      setSelectedPaymentIds(new Set());
    } else {
      setSelectedPaymentIds(new Set(selectablePayments.map((p: any) => p.id)));
    }
  }

  function toggleOnePayment(row: any) {
    setSelectedPaymentIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
  }

  function exitPaymentDeleteMode() {
    setIsPaymentDeleteMode(false);
    setSelectedPaymentIds(new Set());
  }

  async function confirmDeletePayments() {
    if (selectedPaymentIds.size === 0) return;
    setIsConfirmPaymentDeleteOpen(false);
    setIsPaymentPasswordModalOpen(true);
  }

  async function handlePaymentDeletePasswordConfirm() {
    if (selectedPaymentIds.size === 0 || !paymentDeletePasswordForm.password) return;

    // Build a map of id -> customerId before deleting
    const idToCustomerId = new Map<string, string>();
    for (const p of payments) {
      if (selectedPaymentIds.has(p.id) && p.customerId) {
        idToCustomerId.set(p.id, p.customerId);
      }
    }

    const ids = Array.from(selectedPaymentIds);
    let failed = 0;
    let firstErrorMessage: string | null = null;

    try {
      for (const entryId of ids) {
        const customerId = idToCustomerId.get(entryId);
        if (!customerId) {
          failed += 1;
          continue;
        }
        try {
          await softDeletePayment.mutateAsync({
            customerId,
            transactionId: entryId,
            password: paymentDeletePasswordForm.password,
          });
        } catch (e: any) {
          failed += 1;
          const msg = e?.response?.data?.message;
          if (msg && !firstErrorMessage) firstErrorMessage = msg;
        }
      }

      exitPaymentDeleteMode();
      setIsPaymentPasswordModalOpen(false);
      setPaymentDeletePasswordForm({ password: "" });

      if (failed === 0) {
        toast.success("Payments deleted successfully");
      } else {
        setPaymentDeleteError({
          message: firstErrorMessage || `Failed to delete ${failed} payment(s)`,
        });
      }
    } catch (error) {
      toast.error("Password verification failed");
      setIsPaymentPasswordModalOpen(false);
      setPaymentDeletePasswordForm({ password: "" });
    }
  }

  // Handle sale form field updates (same as home page)
  const updateSaleField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setSaleForm((p) => ({
      ...p,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));

    // If farm is changed, reset batch selection (same as home page)
    if (name === "farmId") {
      setSaleForm((p) => ({ ...p, batchId: "" }));
    }
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 Sales form submitted", saleForm);

    // Validation (same as home page)
    const errors: Record<string, string> = {};
    if (!saleForm.farmId) errors.farmId = t("farmer.salesLedger.validation.selectFarm");
    if (!saleForm.batchId) errors.batchId = t("farmer.salesLedger.validation.selectBatch");
    if (saleForm.itemType === "EGGS") {
      const validLines = saleForm.eggLineItems.filter(
        (l) => l.eggTypeId && Number(l.quantity) > 0 && Number(l.unitPrice) > 0
      );
      if (validLines.length === 0) {
        errors.eggLineItems = t("farmer.salesLedger.validation.addEggLine");
      }
    } else {
      if (!saleForm.rate) errors.rate = t("farmer.salesLedger.validation.enterRate");
      if (!saleForm.quantity) errors.quantity = t("farmer.salesLedger.validation.enterQuantity");
    }
    if (saleForm.itemType === "Chicken_Meat") {
      if (!saleForm.weight) errors.weight = t("farmer.salesLedger.validation.weightRequired");
    }
    if (!saleForm.date) errors.date = t("farmer.salesLedger.validation.selectDate");

    // Sanity check for Chicken_Meat
    if (saleForm.itemType === "Chicken_Meat") {
      const quantityNum = Number(saleForm.quantity || 0);
      const weightNum = Number(saleForm.weight || 0);
      if (quantityNum > 0 && weightNum > 0) {
        const avgWeightPerBird = weightNum / quantityNum;
        if (avgWeightPerBird < 0.5 || avgWeightPerBird > 5) {
          errors.weight = `Average weight per bird (${avgWeightPerBird.toFixed(2)}kg) seems unrealistic. Please check your values.`;
        }
      }
    }

    // Customer validation for credit sales (align with home page)
    if (saleForm.remaining) {
      if (!saleForm.customerId && !saleForm.customerName) {
        errors.customerName =
          t("farmer.salesLedger.validation.selectOrEnterCustomer");
      }
      if (!saleForm.customerId && !saleForm.contact) {
        errors.contact = t("farmer.salesLedger.validation.contactRequired");
      }
      let totalAmount: number;
      if (saleForm.itemType === "EGGS" && saleForm.eggLineItems.length > 0) {
        totalAmount = saleForm.eggLineItems.reduce(
          (s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0),
          0
        );
      } else {
        totalAmount =
          saleForm.itemType === "Chicken_Meat"
            ? Number(saleForm.rate || 0) * Number(saleForm.weight || 0)
            : Number(saleForm.rate || 0) * Number(saleForm.quantity || 0);
      }
      const paidAmount = Number(saleForm.balance || 0);
      if (paidAmount > totalAmount) {
        errors.balance = `Paid amount cannot exceed total amount of ₹${totalAmount.toLocaleString()}`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return;
    }

    try {
      let amount: number;
      let quantity: number;
      let unitPrice: number;
      let weight: number | null = null;

      if (saleForm.itemType === "EGGS") {
        const validLines = saleForm.eggLineItems.filter(
          (l) => l.eggTypeId && Number(l.quantity) > 0 && Number(l.unitPrice) > 0
        );
        quantity = validLines.reduce((s, l) => s + Number(l.quantity), 0);
        amount = validLines.reduce(
          (s, l) => s + Number(l.quantity) * Number(l.unitPrice),
          0
        );
        unitPrice = validLines.length > 0 ? Number(validLines[0].unitPrice) : 0;
      } else {
        quantity = parseFloat(saleForm.quantity);
        weight =
          saleForm.itemType === "Chicken_Meat"
            ? parseFloat(saleForm.weight)
            : null;
        unitPrice = parseFloat(saleForm.rate);
        amount =
          saleForm.itemType === "Chicken_Meat"
            ? unitPrice * (weight || 0)
            : unitPrice * quantity;
      }

      const paidAmount = saleForm.remaining
        ? saleForm.balance
          ? parseFloat(saleForm.balance)
          : 0
        : amount;

      const isCredit = saleForm.remaining;

      // Create sale data (same structure as home page) - backend will resolve categoryId
      const saleDateRaw = saleForm.date || "";
      const saleDateOnly = saleDateRaw.includes("T") ? saleDateRaw.split("T")[0] : saleDateRaw;
      const saleData: any = {
        date: saleDateOnly
          ? `${saleDateOnly}T00:00:00.000Z`
          : new Date().toISOString(),
        amount,
        quantity,
        weight: weight ?? undefined,
        unitPrice,
        description: undefined,
        isCredit,
        paidAmount,
        farmId: saleForm.farmId,
        batchId: saleForm.batchId,
        itemType: saleForm.itemType,
        ...(invoiceNumber.trim() ? { invoiceNumber: invoiceNumber.trim() } : {}),
      };
      if (saleForm.itemType === "EGGS") {
        const validLines = saleForm.eggLineItems.filter(
          (l) => l.eggTypeId && Number(l.quantity) > 0 && Number(l.unitPrice) > 0
        );
        if (validLines.length > 0) {
          saleData.eggLineItems = validLines.map((l) => ({
            eggTypeId: l.eggTypeId,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
          }));
        } else if (saleForm.eggTypeId) {
          saleData.eggTypeId = saleForm.eggTypeId;
        }
      }

      // Handle customer data (same as home page)
      if (saleForm.customerId) {
        saleData.customerId = saleForm.customerId;
      } else if (
        saleForm.remaining &&
        saleForm.customerName &&
        saleForm.contact
      ) {
        saleData.customerData = {
          name: saleForm.customerName,
          phone: saleForm.contact,
          category: saleForm.customerCategory,
          address: "",
        };
      }

      console.log("🚀 Sending sale data to API:", saleData);

      if (editingSaleId) {
        await updateSale({ id: editingSaleId, data: saleData });
        toast.success(t("farmer.salesLedger.toast.saleUpdated"));
      } else {
        await createSale(saleData);
        toast.success(t("farmer.salesLedger.toast.saleCreated"));
      }

      setIsSaleModalOpen(false);
      setEditingSaleId(null);
      resetSaleForm();
      setCustomerSearch("");
      setErrors({});
    } catch (error) {
      console.error("Sale submission error:", error);
      setErrors({
        general: t("farmer.salesLedger.failedCreateSale"),
      });
    }
  };

  const handlePartySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPartyId) {
        await updateCustomerMutation.mutateAsync({
          id: editingPartyId,
          data: {
            name: partyForm.name,
            phone: partyForm.phone,
            category: partyForm.category,
            address: partyForm.address,
          },
        });
        toast.success(t("farmer.salesLedger.toast.partyUpdated"));
      } else {
        const amt = Number(partyForm.openingBalanceAmount || 0);
        const hasOpening = Number.isFinite(amt) && amt !== 0;
        const openingBalance = hasOpening
          ? partyForm.openingBalanceDirection === "OWED"
            ? Math.abs(amt)
            : -Math.abs(amt)
          : undefined;

        await createCustomerMutation.mutateAsync({
          name: partyForm.name,
          phone: partyForm.phone,
          category: partyForm.category,
          address: partyForm.address,
          ...(openingBalance !== undefined && { openingBalance }),
          ...(openingBalance !== undefined && { openingBalanceNotes: "Opening balance" }),
        } as any);
        toast.success(t("farmer.salesLedger.toast.partyCreated"));
      }

      setIsPartyModalOpen(false);
      setEditingPartyId(null);
      setPartyForm({
        name: "",
        phone: "",
        category: "Chicken",
        address: "",
        openingBalanceAmount: "",
        openingBalanceDirection: "OWED",
      });
    } catch (error) {
      console.error("Party submission error:", error);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePayment() || !selectedParty) return;

    try {
      await addCustomerPayment.mutateAsync({
        customerId: selectedParty.id,
        data: {
          amount: Number(paymentForm.amount),
          date: paymentForm.date,
          description: paymentForm.description,
          reference: paymentForm.reference || undefined,
          receiptUrl: paymentForm.receiptUrl || undefined,
        },
      });

      toast.success(t("farmer.salesLedger.toast.paymentRecorded"));
      setIsPaymentModalOpen(false);
      setPaymentForm({
        amount: "",
        date: getTodayLocalDate(),
        description: "",
        reference: "",
        receiptUrl: "",
      });
      setSelectedParty(null);
      setPaymentErrors({});
    } catch (error) {
      console.error("Failed to record payment:", error);
      toast.error(t("farmer.salesLedger.toast.paymentFailed"));
    }
  };

  const validatePayment = (): boolean => {
    const errors: Record<string, string> = {};
    if (!paymentForm.amount) errors.amount = t("farmer.salesLedger.validation.amountRequired");
    if (!paymentForm.date) errors.date = t("farmer.salesLedger.validation.dateRequired");
    if (selectedParty && Number(paymentForm.amount) > selectedParty.balance) {
      errors.amount = `Amount cannot exceed balance of ₹${selectedParty.balance.toLocaleString()}`;
    }
    setPaymentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updatePaymentField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (paymentErrors[name]) {
      setPaymentErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleDeleteParty = (id: string) => {
    setPartyToDelete(id);
  };

  const confirmDeleteParty = async () => {
    if (!partyToDelete) return;
    try {
      await deleteCustomerMutation.mutateAsync(partyToDelete);
      toast.success(t("farmer.salesLedger.toast.partyDeleted"));
    } catch (error) {
      console.error("Delete party error:", error);
      toast.error(t("farmer.salesLedger.toast.deletePartyFailed"));
    } finally {
      setPartyToDelete(null);
    }
  };

  const handleEditParty = (party: any) => {
    setEditingPartyId(party.id);
    setPartyForm({
      name: party.name || "",
      phone: party.phone || "",
      category: party.category || "Chicken",
      address: party.address || "",
      openingBalanceAmount: "",
      openingBalanceDirection: "OWED",
    });
    setIsPartyModalOpen(true);
  };

  const handleViewParty = (party: any) => {
    if (!party?.id) return;
    router.push(`/farmer/dashboard/sales-ledger/party/${party.id}`);
  };

  // Opening balance edit is handled on the party details page.

  const resetSaleForm = () => {
    setSaleForm((prev) => ({
      ...prev,
      itemType: "Chicken_Meat",
      eggTypeId: "",
      eggLineItems: [{ eggTypeId: "", quantity: "", unitPrice: "" }],
      rate: "",
      quantity: "",
      weight: "",
      date: getTodayLocalDate(),
      remaining: false,
      customerId: "",
      customerName: "",
      contact: "",
      customerCategory: "Chicken",
      balance: "",
    }));
    setCustomerSearch("");
    setUseCustomInvoice(false);
    setInvoiceNumber("");
    setErrors({});
  };

  // Table columns
  const salesColumns = [
    {
      key: "date",
      label: t("farmer.salesLedger.table.date"),
      type: "date" as const,
      width: "120px",
      render: (value: string) => <DateDisplay date={value} format="short" />,
    },
    {
      key: "invoiceNumber",
      label: "Invoice",
      width: "100px",
      render: (value: string | null) => (
        <span className="text-xs font-medium">{value || "—"}</span>
      ),
    },
    {
      key: "itemType",
      label: t("farmer.salesLedger.table.itemType"),
      type: "badge" as const,
      width: "120px",
      render: (value: string) => {
        const colors: Record<string, string> = {
          Chicken_Meat: "bg-green-100 text-green-800",
          EGGS: "bg-yellow-100 text-yellow-800",
          CHICKS: "bg-blue-100 text-blue-800",
          FEED: "bg-orange-100 text-orange-800",
          MEDICINE: "bg-red-100 text-red-800",
          EQUIPMENT: "bg-purple-100 text-purple-800",
          OTHER: "bg-gray-100 text-gray-800",
        };
        return (
          <Badge className={colors[value] || "bg-gray-100 text-gray-800"}>
            {value}
          </Badge>
        );
      },
    },
    {
      key: "customer",
      label: t("farmer.salesLedger.table.customer"),
      width: "150px",
      render: (_: any, row: any) => row.customer?.name || "—",
    },
    {
      key: "quantity",
      label: t("farmer.salesLedger.table.qty"),
      type: "number" as const,
      width: "120px",
      align: "center" as const,
      render: (value: unknown, row: any) => {
        const lines = row?.eggLines as { quantity: number; eggType?: { name: string } }[] | undefined;
        if (lines && lines.length > 0) {
          const breakdown = lines.map((l) => `${l.eggType?.name ?? "—"} ${l.quantity}`).join(", ");
          return (
            <div className="text-center">
              <div className="font-medium">{Number(row?.quantity ?? value ?? 0).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{breakdown}</div>
            </div>
          );
        }
        return <span>{value != null ? Number(value).toLocaleString() : "—"}</span>;
      },
    },
    {
      key: "weight",
      label: t("farmer.salesLedger.table.weightKg"),
      width: "100px",
      align: "center" as const,
      render: (value: number | null) => (
        <span className="text-sm">{value ? `${Number(value).toFixed(2)} kg` : "—"}</span>
      ),
    },
    {
      key: "unitPrice",
      label: t("farmer.salesLedger.table.rate"),
      type: "currency" as const,
      width: "140px",
      align: "right" as const,
      render: (value: unknown, row: any) => {
        const lines = row?.eggLines as { quantity: number; unitPrice?: number | string; eggType?: { name: string } }[] | undefined;
        if (lines && lines.length > 0) {
          const breakdown = lines
            .map((l) => {
              const name = l.eggType?.name ?? "—";
              const rate = Number(l.unitPrice ?? 0);
              return `${name} ₹${rate.toLocaleString()}`;
            })
            .join(", ");
          return (
            <div className="text-right">
              <div className="text-xs text-muted-foreground whitespace-normal">{breakdown}</div>
            </div>
          );
        }
        return value != null ? `₹${Number(value).toLocaleString()}` : "—";
      },
    },
    {
      key: "amount",
      label: t("farmer.salesLedger.table.total"),
      type: "currency" as const,
      width: "120px",
      align: "right" as const,
    },
    {
      key: "isCredit",
      label: t("farmer.salesLedger.table.credit"),
      width: "80px",
      align: "center" as const,
      render: (value: boolean) => (
        <Badge
          variant="secondary"
          className={
            value
              ? "bg-orange-100 text-orange-800"
              : "bg-gray-100 text-gray-800"
          }
        >
          {value ? t("farmer.salesLedger.table.yes") : t("farmer.salesLedger.table.no")}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: t("farmer.salesLedger.table.actions"),
      type: "actions" as const,
      width: "120px",
      align: "right" as const,
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              setEditingSaleId(row.id);
              setIsSaleModalOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300"
            onClick={() => deleteSale(row.id)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const partyColumns = [
    {
      key: "name",
      label: t("farmer.salesLedger.table.name"),
      width: "200px",
    },
    {
      key: "phone",
      label: t("farmer.salesLedger.table.phone"),
      width: "150px",
    },
    {
      key: "category",
      label: t("farmer.salesLedger.category"),
      width: "120px",
      render: (value: string) => <Badge variant="outline">{value}</Badge>,
    },
    {
      key: "balance",
      label: t("farmer.salesLedger.balance"),
      type: "currency" as const,
      width: "120px",
      align: "right" as const,
      render: (value: number) => (
        <span
          className={value > 0 ? "text-red-600 font-medium" : "text-green-600"}
        >
          ₹{value.toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("farmer.salesLedger.table.actions"),
      type: "actions" as const,
      width: "120px",
      align: "right" as const,
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => handleViewParty(row)}
            title={t("farmer.salesLedger.table.view")}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
            onClick={() => {
              setSelectedParty(row);
              setPaymentForm({
                amount: "",
                date: getTodayLocalDate(),
                description: t("farmer.salesLedger.paymentFrom", { name: row.name }),
                reference: "",
                receiptUrl: "",
              });
              setPaymentErrors({});
              setIsPaymentModalOpen(true);
            }}
            disabled={Number(row.balance || 0) <= 0}
          >
            <Receipt className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => handleEditParty(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300"
            onClick={() => handleDeleteParty(row.id)}
            disabled={deleteCustomerMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{t("farmer.salesLedger.loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("farmer.salesLedger.title")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("farmer.salesLedger.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs md:text-sm hover:bg-green-50 hover:text-green-700 border-green-200"
            onClick={() => setIsPartyModalOpen(true)}
          >
            <UserPlus className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
            {t("farmer.salesLedger.addParty")}
          </Button>
          <Button
            size="sm"
            className="text-xs md:text-sm bg-primary hover:bg-primary/90"
            onClick={() => setIsSaleModalOpen(true)}
          >
            <Plus className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
            {t("farmer.salesLedger.newSale")}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg overflow-x-auto">
        {[
          { id: "overview", label: t("farmer.salesLedger.tabs.overview"), shortLabel: t("farmer.salesLedger.tabs.overviewShort"), icon: TrendingUp },
          { id: "sales", label: t("farmer.salesLedger.tabs.sales"), shortLabel: t("farmer.salesLedger.tabs.sales"), icon: Receipt },
          { id: "parties", label: t("farmer.salesLedger.tabs.parties"), shortLabel: t("farmer.salesLedger.tabs.parties"), icon: Users },
          { id: "payments", label: t("farmer.salesLedger.tabs.payments"), shortLabel: t("farmer.salesLedger.tabs.payShort"), icon: CreditCard },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.id as TabType)}
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap"
          >
            <tab.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-4 md:space-y-6">
          {/* Sales Statistics */}
          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
                <CardTitle className="text-[10px] md:text-sm font-medium">
                  {t("farmer.salesLedger.overview.sales")}
                </CardTitle>
                <Receipt className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold">
                  {salesStats.totalSales}
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground">
                  रू{salesStats.totalAmount.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
                <CardTitle className="text-[10px] md:text-sm font-medium">
                  {t("farmer.salesLedger.overview.credit")}
                </CardTitle>
                <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold">
                  {salesStats.creditSales}
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground">
                  रू{salesStats.creditAmount.toLocaleString()} {t("farmer.salesLedger.overview.dueLabel")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
                <CardTitle className="text-[10px] md:text-sm font-medium">
                  {t("farmer.salesLedger.overview.parties")}
                </CardTitle>
                <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold">
                  {partyStats.totalParties}
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground">
                  {partyStats.partiesWithBalance} {t("farmer.salesLedger.overview.owe")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
                <CardTitle className="text-[10px] md:text-sm font-medium">
                  {t("farmer.salesLedger.overview.due")}
                </CardTitle>
                <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold text-red-600">
                  <span className="hidden md:inline">रू</span>{partyStats.totalBalance.toLocaleString()}
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground">
                  {t("farmer.salesLedger.overview.outstanding")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Sales */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">{t("farmer.salesLedger.overview.recentSales")}</CardTitle>
              <CardDescription className="text-xs md:text-sm">{t("farmer.salesLedger.overview.latestTransactions")}</CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
              <div className="overflow-x-auto">
                <DataTable
                  data={sales.slice(0, 5)}
                  columns={salesColumns.filter((col) => col.key !== "actions")}
                  showFooter={false}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sales Tab */}
      {activeTab === "sales" && (
        <div className="space-y-4 md:space-y-6">
          {/* Sales Table */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">{t("farmer.salesLedger.salesRecords")}</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {pagination?.total || 0} {t("farmer.salesLedger.total")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="overflow-x-auto">
                <DataTable
                  data={sales}
                  columns={salesColumns}
                  showFooter={true}
                  footerContent={
                    <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground">
                      <span>{t("farmer.salesLedger.table.total")}: {salesStats.totalSales}</span>
                      <span>
                        रू{salesStats.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Parties Tab */}
      {activeTab === "parties" && (
        <div className="space-y-4 md:space-y-6">
          {/* Parties Table */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">{t("farmer.salesLedger.partiesTitle")}</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {partyStats.totalParties} {t("farmer.salesLedger.total")}, {partyStats.partiesWithBalance} {t("farmer.salesLedger.overview.owe")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {customersLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-sm">{t("common.loading")}</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable
                    data={customers || []}
                    columns={partyColumns}
                    showFooter={true}
                    footerContent={
                      <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground">
                        <span>{t("farmer.salesLedger.table.total")}: {partyStats.totalParties}</span>
                        <span>
                          {t("farmer.salesLedger.table.due")}: रू{partyStats.totalBalance.toLocaleString()}
                        </span>
                      </div>
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payments Tab */}
      {/* Payments Tab */}
          {activeTab === "payments" && (
        <div className="space-y-4 md:space-y-6">
          {/* Payments Table */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base md:text-lg">{t("farmer.salesLedger.recentPayments")}</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    {paymentsPagination?.total || 0} {t("farmer.salesLedger.totalRecords")}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {isPaymentDeleteMode ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={exitPaymentDeleteMode}
                      >
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                      <Button
                        className="bg-red-600 hover:bg-red-700 text-white h-7 text-xs"
                        size="sm"
                        disabled={selectedPaymentIds.size === 0 || softDeletePayment.isPending}
                        onClick={() => setIsConfirmPaymentDeleteOpen(true)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        {selectedPaymentIds.size}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-7 text-xs ${showDeletedPayments ? "bg-gray-100" : ""}`}
                        onClick={() => setShowDeletedPayments((v) => !v)}
                      >
                        <Eye className="h-3 w-3 mr-1 sm:mr-0" />
                        <span className="hidden sm:inline sm:ml-1">{showDeletedPayments ? "Hide Deleted" : "Show Deleted"}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setIsPaymentDeleteMode(true)}
                        disabled={payments.length === 0}
                      >
                        <Trash2 className="h-3 w-3 mr-1 sm:mr-0" />
                        <span className="hidden sm:inline sm:ml-1">Delete Entries</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-sm">{t("farmer.salesLedger.loadingPayments")}</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable
                    data={showDeletedPayments ? payments : payments.filter((p: any) => !p.deletedAt)}
                    columns={[
                      {
                        key: "date",
                        label: t("farmer.salesLedger.table.date"),
                        width: "120px",
                        render: (value: string) => <DateDisplay date={value} format="short" />,
                      },
                      {
                        key: "sale",
                        label: t("farmer.salesLedger.table.customer"),
                        width: "200px",
                        render: (sale: any) => sale?.customer?.name || "—",
                      },
                      {
                        key: "description",
                        label: t("farmer.salesLedger.table.description"),
                        width: "250px",
                        render: (value: string) => value || t("farmer.salesLedger.table.paymentLabel"),
                      },
                      {
                        key: "amount",
                        label: t("farmer.salesLedger.table.amount"),
                        type: "currency" as const,
                        width: "120px",
                        align: "right" as const,
                      },
                      {
                        key: "receiptUrl",
                        label: t("farmer.salesLedger.table.receipt"),
                        width: "100px",
                        align: "center" as const,
                        render: (value: string) =>
                          value ? (
                            <a
                              href={value}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 text-xs border rounded-md hover:bg-gray-50 text-blue-600"
                            >
                              <Eye className="h-3 w-3 mr-1" /> {t("farmer.salesLedger.table.view")}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          ),
                      },
                    ]}
                    selectable={isPaymentDeleteMode}
                    isAllSelected={
                      payments.filter((p: any) => p.source === "CUSTOMER_RECEIPT" && !p.deletedAt).length > 0 &&
                      selectedPaymentIds.size === payments.filter((p: any) => p.source === "CUSTOMER_RECEIPT" && !p.deletedAt).length
                    }
                    onToggleAll={toggleAllPayments}
                    isRowSelected={(row: any) => selectedPaymentIds.has(row.id)}
                    onToggleRow={toggleOnePayment}
                    getRowKey={(row: any) => row.id}
                    isRowSelectable={(row: any) => row.source === "CUSTOMER_RECEIPT" && !row.deletedAt}
                    rowClassName={(row: any) => row.deletedAt ? "opacity-40" : ""}
                    showFooter={true}
                    footerContent={
                      <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground w-full">
                        <span>{t("farmer.salesLedger.totalRecords")}: {paymentsPagination?.total || 0}</span>
                      </div>
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sale Modal */}
      <Modal
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false);
          setEditingSaleId(null);
          resetSaleForm();
          setCustomerSearch("");
          setErrors({});
        }}
        title={editingSaleId ? t("farmer.salesLedger.saleModal.editSale") : t("farmer.salesLedger.saleModal.addNewSale")}
      >
        <form onSubmit={handleSaleSubmit}>
          <ModalContent>
            <div className="space-y-4">
              {errors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}

              {/* Smart persistence info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  {t("farmer.salesLedger.saleModal.smartForm")}
                </p>
              </div>

              {/* Custom Invoice Number (Toggle) */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border transition-colors ${
                    useCustomInvoice
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50"
                  }`}
                  onClick={() => {
                    setUseCustomInvoice(!useCustomInvoice);
                    if (useCustomInvoice) setInvoiceNumber("");
                  }}
                >
                  <div className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center ${
                    useCustomInvoice ? "bg-primary border-primary" : "border-muted-foreground/50"
                  }`}>
                    {useCustomInvoice && <span className="text-white text-[10px] leading-none">✓</span>}
                  </div>
                  Custom invoice number
                </button>
                {useCustomInvoice ? (
                  <Input
                    placeholder="e.g. BILL-001"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="max-w-[200px] h-8 text-sm"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">Invoice will be auto-generated (e.g. INV-001)</span>
                )}
              </div>

              {/* Farm Selection */}
              <div>
                <Label htmlFor="farmId">{t("farmer.salesLedger.saleModal.selectFarm")}</Label>
                <Select
                  value={saleForm.farmId}
                  onValueChange={(value) => {
                    const event = { target: { name: 'farmId', value } } as any;
                    updateSaleField(event);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("farmer.salesLedger.saleModal.chooseFarm")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {farms.map((farm) => (
                      <SelectItem key={farm.id} value={farm.id}>
                        {farm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.farmId && (
                  <p className="text-xs text-red-600 mt-1">{errors.farmId}</p>
                )}
              </div>

              {/* Batch Selection */}
              <div>
                <Label htmlFor="batchId">{t("farmer.salesLedger.saleModal.selectBatch")}</Label>
                <Select
                  value={saleForm.batchId}
                  onValueChange={(value) => {
                    const event = { target: { name: 'batchId', value } } as any;
                    updateSaleField(event);
                  }}
                  disabled={!saleForm.farmId}
                >
                  <SelectTrigger className={!saleForm.farmId ? "opacity-50" : ""}>
                    <SelectValue placeholder={t("farmer.salesLedger.saleModal.chooseBatch")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {activeBatches
                      .filter(
                        (batch) =>
                          batch.status === "ACTIVE" &&
                          (!saleForm.farmId || batch.farmId === saleForm.farmId)
                      )
                      .map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.batchNumber} - {batch.farm.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.batchId && (
                  <p className="text-xs text-red-600 mt-1">{errors.batchId}</p>
                )}
              </div>

              <div>
                <Label htmlFor="itemType">{t("farmer.salesLedger.saleModal.itemType")}</Label>
                <Select
                  value={saleForm.itemType}
                  onValueChange={(value) => {
                    const event = { target: { name: 'itemType', value } } as any;
                    updateSaleField(event);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("farmer.salesLedger.saleModal.selectItemType")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="EGGS">{t("farmer.salesLedger.eggs")}</SelectItem>
                    <SelectItem value="Chicken_Meat">Chicken/Layer (Meat)</SelectItem>
                    <SelectItem value="OTHER">{t("farmer.salesLedger.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {saleForm.itemType === "EGGS" && (
                <div className="space-y-3">
                  <Label>{t("farmer.salesLedger.saleModal.eggLines")}</Label>
                  {eggInventory?.types && eggInventory.types.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("farmer.salesLedger.saleModal.available")} {eggInventory.types.map((typ: { name: string; quantity: number }) => `${typ.name} ${typ.quantity}`).join(" · ")}
                    </p>
                  )}
                  {saleForm.eggLineItems.map((line, idx) => (
                    <div key={idx} className="flex flex-wrap items-end gap-2 p-2 border rounded-md bg-gray-50/50">
                      <div className="flex-1 min-w-[120px]">
                        <Label className="text-xs">{t("farmer.salesLedger.saleModal.type")}</Label>
                        <Select
                          value={line.eggTypeId}
                          onValueChange={(value) => {
                            setSaleForm((p) => ({
                              ...p,
                              eggLineItems: p.eggLineItems.map((l, i) =>
                                i === idx ? { ...l, eggTypeId: value } : l
                              ),
                            }));
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={t("farmer.salesLedger.saleModal.eggType")} />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {eggTypes.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">{t("farmer.salesLedger.table.qty")}</Label>
                        <Input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => {
                            setSaleForm((p) => ({
                              ...p,
                              eggLineItems: p.eggLineItems.map((l, i) =>
                                i === idx ? { ...l, quantity: e.target.value } : l
                              ),
                            }));
                          }}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                      <div className="w-28">
                        <Label className="text-xs">{t("farmer.salesLedger.saleModal.rateRupee")}</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => {
                            setSaleForm((p) => ({
                              ...p,
                              eggLineItems: p.eggLineItems.map((l, i) =>
                                i === idx ? { ...l, unitPrice: e.target.value } : l
                              ),
                            }));
                          }}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          setSaleForm((p) => ({
                            ...p,
                            eggLineItems: p.eggLineItems.filter((_, i) => i !== idx),
                          }));
                        }}
                        disabled={saleForm.eggLineItems.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSaleForm((p) => ({
                        ...p,
                        eggLineItems: [...p.eggLineItems, { eggTypeId: "", quantity: "", unitPrice: "" }],
                      }));
                    }}
                  >
                    {t("farmer.salesLedger.saleModal.addLine")}
                  </Button>
                  {errors.eggLineItems && (
                    <p className="text-xs text-red-600">{errors.eggLineItems}</p>
                  )}
                </div>
              )}

              {saleForm.itemType !== "EGGS" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rate">{t("farmer.salesLedger.saleModal.rateRupee")}</Label>
                    <Input
                      id="rate"
                      name="rate"
                      type="number"
                      value={saleForm.rate}
                      onChange={updateSaleField}
                      placeholder={t("farmer.salesLedger.saleModal.ratePerUnit")}
                    />
                    {errors.rate && (
                      <p className="text-xs text-red-600 mt-1">{errors.rate}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="quantity">
                      {saleForm.itemType === "Chicken_Meat"
                        ? t("farmer.salesLedger.saleModal.quantityBirds")
                        : t("farmer.salesLedger.saleModal.quantityUnits")}
                    </Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      value={saleForm.quantity}
                      onChange={updateSaleField}
                      placeholder={
                        saleForm.itemType === "Chicken_Meat"
                          ? t("farmer.salesLedger.saleModal.numberOfBirds")
                          : t("farmer.salesLedger.saleModal.numberOfUnits")
                      }
                    />
                    {errors.quantity && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.quantity}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {["Chicken_Meat"].includes(
                saleForm.itemType
              ) && (
                  <div>
                    <Label htmlFor="weight">{t("farmer.salesLedger.saleModal.weightKg")}</Label>
                    <Input
                      id="weight"
                      name="weight"
                      type="number"
                      step="0.01"
                      value={saleForm.weight}
                      onChange={updateSaleField}
                      placeholder={t("farmer.salesLedger.saleModal.totalWeightKg")}
                    />
                    {errors.weight && (
                      <p className="text-xs text-red-600 mt-1">{errors.weight}</p>
                    )}
                    {saleForm.itemType === "Chicken_Meat" &&
                      saleForm.quantity &&
                      saleForm.weight && (
                        <p className="text-xs text-green-600 mt-1">
                          {t("farmer.salesLedger.saleModal.avgWeightPerBird")}{" "}
                          {(
                            Number(saleForm.weight) / Number(saleForm.quantity)
                          ).toFixed(2)}{" "}
                          kg
                        </p>
                      )}
                  </div>
                )}

              {/* Total Preview */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {t("farmer.salesLedger.saleModal.totalAmount")}
                  </span>
                  <span className="text-lg font-bold text-green-700">
                    ₹
                    {saleForm.itemType === "EGGS"
                      ? saleForm.eggLineItems
                          .reduce(
                            (s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0),
                            0
                          )
                          .toLocaleString()
                      : (() => {
                          const rate = Number(saleForm.rate || 0);
                          const quantity = Number(saleForm.quantity || 0);
                          const weight = Number(saleForm.weight || 0);
                          if (saleForm.itemType === "Chicken_Meat" && weight) {
                            return (rate * weight).toLocaleString();
                          }
                          return (rate * quantity).toLocaleString();
                        })()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {saleForm.itemType === "EGGS"
                    ? t("farmer.salesLedger.saleModal.sumOfLines")
                    : saleForm.itemType === "Chicken_Meat"
                      ? t("farmer.salesLedger.saleModal.calculatedRateWeight")
                      : t("farmer.salesLedger.saleModal.calculatedRateQty")}
                </p>
              </div>

              <div>
                <DateInput
                  label={t("farmer.salesLedger.saleModal.date")}
                  value={saleForm.date}
                  onChange={(v) =>
                    setSaleForm((p) => ({
                      ...p,
                      date: v.includes("T") ? v.split("T")[0] : v,
                    }))
                  }
                />
                {errors.date && (
                  <p className="text-xs text-red-600 mt-1">{errors.date}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="remaining"
                    checked={saleForm.remaining}
                    onChange={(e) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        remaining: e.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                  {t("farmer.salesLedger.saleModal.remainingBalance")}
                </label>
              </div>

              {saleForm.remaining && (
                <div className="grid md:grid-cols-2 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="customerSearch">{t("farmer.salesLedger.saleModal.searchCustomer")}</Label>
                    <div className="relative">
                      <Input
                        id="customerSearch"
                        name="customerSearch"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder={t("farmer.salesLedger.saleModal.searchExistingCustomers")}
                        className="pr-8"
                      />
                      {customerSearch && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                          {customers && customers.length > 0 ? (
                            customers.map((customer: any) => (
                              <div
                                key={customer.id}
                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onClick={() => {
                                  setSaleForm((prev) => ({
                                    ...prev,
                                    customerId: customer.id,
                                    customerName: customer.name,
                                    contact: customer.phone,
                                    customerCategory:
                                      customer.category || "Chicken",
                                  }));
                                  setCustomerSearch("");
                                }}
                              >
                                <div className="font-medium">
                                  {customer.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {customer.phone}
                                </div>
                                {customer.category && (
                                  <div className="text-xs text-blue-600">
                                    {customer.category}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-gray-500 text-sm">
                              {t("farmer.salesLedger.saleModal.noCustomersFound")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customerName">{t("farmer.salesLedger.saleModal.customerName")}</Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      value={saleForm.customerName}
                      onChange={updateSaleField}
                      placeholder={t("farmer.salesLedger.saleModal.enterNewCustomerName")}
                    />
                    {errors.customerName && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.customerName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="contact">{t("farmer.salesLedger.saleModal.contact")}</Label>
                    <Input
                      id="contact"
                      name="contact"
                      value={saleForm.contact}
                      onChange={updateSaleField}
                      placeholder={t("farmer.salesLedger.saleModal.phoneNumber")}
                      required
                    />
                    {errors.contact && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.contact}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="customerCategory">{t("farmer.salesLedger.saleModal.customerCategory")}</Label>
                    <Select
                      value={saleForm.customerCategory || "Chicken"}
                      onValueChange={(value) => {
                        const event = { target: { name: 'customerCategory', value } } as any;
                        updateSaleField(event);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("farmer.salesLedger.saleModal.selectCategory")} />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Chicken">Chicken</SelectItem>
                        <SelectItem value="Eggs">Eggs</SelectItem>
                        <SelectItem value="Layer">Layer</SelectItem>
                        <SelectItem value="Other">{t("farmer.salesLedger.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="balance">{t("farmer.salesLedger.saleModal.amountPaidOptional")}</Label>
                    <Input
                      id="balance"
                      name="balance"
                      type="number"
                      value={saleForm.balance}
                      onChange={updateSaleField}
                      placeholder={t("farmer.salesLedger.saleModal.amountPaidPlaceholder")}
                    />
                    {errors.balance && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.balance}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsSaleModalOpen(false);
                setEditingSaleId(null);
                resetSaleForm();
                setCustomerSearch("");
                setErrors({});
              }}
            >
              {t("farmer.salesLedger.saleModal.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingSaleId ? t("farmer.salesLedger.saleModal.updating") : t("farmer.salesLedger.saleModal.creating")}
                </>
              ) : editingSaleId ? (
                t("farmer.salesLedger.saleModal.updateSale")
              ) : (
                t("farmer.salesLedger.saleModal.createSale")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Party Modal */}
      <Modal
        isOpen={isPartyModalOpen}
        onClose={() => {
          setIsPartyModalOpen(false);
          setEditingPartyId(null);
        }}
        title={editingPartyId ? t("farmer.salesLedger.partyModal.editParty") : t("farmer.salesLedger.partyModal.addNewParty")}
      >
        <form onSubmit={handlePartySubmit}>
          <ModalContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="partyName">{t("farmer.salesLedger.partyModal.name")}</Label>
                <Input
                  id="partyName"
                  value={partyForm.name}
                  onChange={(e) =>
                    setPartyForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t("farmer.salesLedger.partyModal.enterPartyName")}
                />
              </div>
              <div>
                <Label htmlFor="partyPhone">{t("farmer.salesLedger.partyModal.phone")}</Label>
                <Input
                  id="partyPhone"
                  value={partyForm.phone}
                  onChange={(e) =>
                    setPartyForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder={t("farmer.salesLedger.partyModal.enterPhoneNumber")}
                />
              </div>
              <div>
                <Label htmlFor="partyCategory">{t("farmer.salesLedger.partyModal.category")}</Label>
                <Select
                  value={partyForm.category}
                  onValueChange={(value) =>
                    setPartyForm((prev) => ({
                      ...prev,
                      category: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("farmer.salesLedger.partyModal.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Chicken">Chicken</SelectItem>
                    <SelectItem value="Eggs">Eggs</SelectItem>
                    <SelectItem value="Layer">Layer</SelectItem>
                    <SelectItem value="Other">{t("farmer.salesLedger.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="partyAddress">{t("farmer.salesLedger.partyModal.address")}</Label>
                <Input
                  id="partyAddress"
                  value={partyForm.address}
                  onChange={(e) =>
                    setPartyForm((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder={t("farmer.salesLedger.partyModal.enterAddressOptional")}
                />
              </div>
              {!editingPartyId && (
                <>
                  <div>
                    <Label>Opening balance (optional)</Label>
                    <Input
                      value={partyForm.openingBalanceAmount}
                      onChange={(e) =>
                        setPartyForm((prev) => ({
                          ...prev,
                          openingBalanceAmount: e.target.value,
                        }))
                      }
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Direction</Label>
                    <Select
                      value={partyForm.openingBalanceDirection}
                      onValueChange={(value) =>
                        setPartyForm((prev) => ({
                          ...prev,
                          openingBalanceDirection: value as "OWED" | "ADVANCE",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWED">Party owes me</SelectItem>
                        <SelectItem value="ADVANCE">I owe party (credit/advance)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {editingPartyId && (
                <div className="md:col-span-2 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">Opening balance</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{Math.abs(Number(editingPartyFull?.openingBalance?.amount ?? 0)).toLocaleString()}{" "}
                        {Number(editingPartyFull?.openingBalance?.amount ?? 0) > 0
                          ? "(Party owes me)"
                          : Number(editingPartyFull?.openingBalance?.amount ?? 0) < 0
                            ? "(I owe party)"
                            : "(Not set)"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/farmer/dashboard/sales-ledger/party/${editingPartyId}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View & edit
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPartyModalOpen(false);
                setEditingPartyId(null);
              }}
            >
              {t("farmer.salesLedger.partyModal.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={
                createCustomerMutation.isPending ||
                updateCustomerMutation.isPending
              }
            >
              {createCustomerMutation.isPending ||
                updateCustomerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingPartyId ? t("farmer.salesLedger.saleModal.updating") : t("farmer.salesLedger.saleModal.creating")}
                </>
              ) : editingPartyId ? (
                t("farmer.salesLedger.partyModal.updateParty")
              ) : (
                t("farmer.salesLedger.partyModal.createParty")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedParty(null);
          setPaymentForm({
            amount: "",
            date: getTodayLocalDate(),
            description: "",
            reference: "",
            receiptUrl: "",
          });
          setPaymentErrors({});
        }}
        title={t("farmer.salesLedger.paymentModal.title", { name: selectedParty?.name || "" })}
      >
        <form onSubmit={handlePaymentSubmit}>
          <ModalContent>
            <div className="space-y-4">
              {selectedParty && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-900">
                    {selectedParty.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t("farmer.salesLedger.paymentModal.outstandingBalance")} ₹
                    {Number(selectedParty.balance || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("farmer.salesLedger.paymentModal.phone")} {selectedParty.phone}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="amount">{t("farmer.salesLedger.paymentModal.paymentAmount")}</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  value={paymentForm.amount}
                  onChange={updatePaymentField}
                  placeholder={t("farmer.salesLedger.paymentModal.enterPaymentAmount")}
                  required
                />
                {paymentErrors.amount && (
                  <p className="text-xs text-red-600 mt-1">
                    {paymentErrors.amount}
                  </p>
                )}
              </div>

              <div>
                <DateInput
                  label={t("farmer.salesLedger.paymentModal.paymentDate")}
                  value={paymentForm.date}
                  onChange={(v) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      date: v.includes("T") ? v.split("T")[0] : v,
                    }))
                  }
                />
                {paymentErrors.date && (
                  <p className="text-xs text-red-600 mt-1">
                    {paymentErrors.date}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">{t("farmer.salesLedger.paymentModal.description")}</Label>
                <Input
                  id="description"
                  name="description"
                  value={paymentForm.description}
                  onChange={updatePaymentField}
                  placeholder={t("farmer.salesLedger.paymentModal.paymentDescription")}
                />
              </div>

              <div>
                <Label htmlFor="reference">{t("farmer.salesLedger.paymentModal.reference")}</Label>
                <Input
                  id="reference"
                  name="reference"
                  value={paymentForm.reference}
                  onChange={updatePaymentField}
                  placeholder={t("farmer.salesLedger.paymentModal.referencePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("farmer.salesLedger.paymentModal.paymentReceiptOptional")}</Label>
                <ImageUpload
                  value={paymentForm.receiptUrl || ""}
                  onChange={(url) =>
                    setPaymentForm((prev) => ({ ...prev, receiptUrl: url }))
                  }
                  folder="payment-receipts"
                  placeholder={t("farmer.salesLedger.paymentModal.uploadReceipt")}
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPaymentModalOpen(false);
                setSelectedParty(null);
                setPaymentForm({
                  amount: "",
                  date: getTodayLocalDate(),
                  description: "",
                  reference: "",
                  receiptUrl: "",
                });
                setPaymentErrors({});
              }}
            >
              {t("farmer.salesLedger.paymentModal.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isAddingPayment}
            >
              {isAddingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.salesLedger.paymentModal.recording")}
                </>
              ) : (
                t("farmer.salesLedger.paymentModal.recordPayment")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <AlertDialog
        open={!!partyToDelete}
        onOpenChange={(open) => !open && setPartyToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("farmer.salesLedger.deleteParty.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("farmer.salesLedger.deleteParty.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("farmer.salesLedger.deleteParty.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteParty}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {t("farmer.salesLedger.deleteParty.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Payments Modal */}
      <Modal
        isOpen={isConfirmPaymentDeleteOpen}
        onClose={() => setIsConfirmPaymentDeleteOpen(false)}
        title={`Delete ${selectedPaymentIds.size} payment(s)?`}
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground">
            This will soft-delete the selected payments and reverse their effect on customer balances. Deleted payments will remain visible (dimmed) for audit purposes.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsConfirmPaymentDeleteOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={confirmDeletePayments}
            disabled={softDeletePayment.isPending}
          >
            {softDeletePayment.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Payment Delete Password Modal */}
      <Modal
        isOpen={isPaymentPasswordModalOpen}
        onClose={() => {
          setIsPaymentPasswordModalOpen(false);
          setPaymentDeletePasswordForm({ password: "" });
        }}
        title="Confirm Password"
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>
                  You are about to delete {selectedPaymentIds.size} payment(s). This will reverse the balance for affected customers.
                </strong>
              </p>
            </div>
            <div>
              <Label htmlFor="payment-delete-password">Enter your password to confirm</Label>
              <Input
                id="payment-delete-password"
                type="password"
                value={paymentDeletePasswordForm.password}
                onChange={(e) => setPaymentDeletePasswordForm({ password: e.target.value })}
                placeholder="Enter password"
                required
                className="mt-1"
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsPaymentPasswordModalOpen(false);
              setPaymentDeletePasswordForm({ password: "" });
            }}
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handlePaymentDeletePasswordConfirm}
            disabled={!paymentDeletePasswordForm.password || softDeletePayment.isPending}
          >
            {softDeletePayment.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
              </>
            ) : (
              "Confirm Delete"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Payment Delete Error Modal */}
      <Modal
        isOpen={!!paymentDeleteError}
        onClose={() => setPaymentDeleteError(null)}
        title="Delete Failed"
      >
        <ModalContent>
          <div className="space-y-4">
            <p className="text-sm text-red-600">{paymentDeleteError?.message}</p>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setPaymentDeleteError(null)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div >
  );
}
