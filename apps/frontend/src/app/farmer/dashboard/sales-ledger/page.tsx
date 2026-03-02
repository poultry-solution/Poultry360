"use client";

import { useState, useEffect, useMemo } from "react";
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
  Download,
  TrendingUp,
  Users,
  DollarSign,
  CreditCard,
  Calendar,
  Loader2,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Receipt,
  AlertCircle,
} from "lucide-react";
import {
  useSalesManagement,
  useGetCustomersForSales,
  useGetEggInventory,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useGetSalePayments,
} from "@/fetchers/sale/saleQueries";

import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { useGetUserFarms } from "@/fetchers/farms/farmQueries";
import { useGetEggTypes } from "@/fetchers/eggTypes/eggTypeQueries";
import { toast } from "sonner";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DateInput } from "@/common/components/ui/date-input";
import { ImageUpload } from "@/common/components/ui/image-upload";

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

export default function SalesLedgerPage() {
  // State management
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);
  const [partyToDelete, setPartyToDelete] = useState<string | null>(null);
  const [selectedParty, setSelectedParty] = useState<any>(null);

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
    date: new Date().toISOString().split("T")[0],
    remaining: false,
    customerId: "",
    customerName: "",
    contact: "",
    customerCategory: "Chicken",
    balance: "",
  });

  const [partyForm, setPartyForm] = useState({
    name: "",
    phone: "",
    category: "Chicken",
    address: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
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

  // Ensure default date when modal opens (same as home page)
  useEffect(() => {
    if (isSaleModalOpen) {
      if (!saleForm.date) {
        const today = new Date().toISOString().split("T")[0];
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
    const paidAmount = sales
      .filter((sale: any) => sale.isCredit)
      .reduce(
        (sum: number, sale: any) => sum + Number(sale.paidAmount || 0),
        0
      );
    const dueAmount = creditAmount - paidAmount;

    return {
      totalSales,
      totalAmount,
      creditSales,
      creditAmount,
      paidAmount,
      dueAmount,
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
    if (!saleForm.farmId) errors.farmId = "Please select a farm";
    if (!saleForm.batchId) errors.batchId = "Please select a batch";
    if (saleForm.itemType === "EGGS") {
      const validLines = saleForm.eggLineItems.filter(
        (l) => l.eggTypeId && Number(l.quantity) > 0 && Number(l.unitPrice) > 0
      );
      if (validLines.length === 0) {
        errors.eggLineItems = "Add at least one egg line (type, quantity, rate)";
      }
    } else {
      if (!saleForm.rate) errors.rate = "Please enter rate";
      if (!saleForm.quantity) errors.quantity = "Please enter quantity";
    }
    if (saleForm.itemType === "Chicken_Meat") {
      if (!saleForm.weight) errors.weight = "Weight required for Chicken_Meat";
    }
    if (!saleForm.date) errors.date = "Please select a date";

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
          "Please select existing customer or enter new customer name";
      }
      if (!saleForm.customerId && !saleForm.contact) {
        errors.contact = "Contact number required for new customer";
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
      const saleData: any = {
        date: saleForm.date
          ? `${saleForm.date}T00:00:00.000Z`
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
        toast.success("Sale updated successfully");
      } else {
        await createSale(saleData);
        toast.success("Sale created successfully");
      }

      setIsSaleModalOpen(false);
      setEditingSaleId(null);
      resetSaleForm();
      setCustomerSearch("");
      setErrors({});
    } catch (error) {
      console.error("Sale submission error:", error);
      setErrors({
        general: "Failed to create sale. Please try again.",
      });
    }
  };

  const handlePartySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPartyId) {
        await updateCustomerMutation.mutateAsync({
          id: editingPartyId,
          data: partyForm,
        });
        toast.success("Party updated successfully");
      } else {
        await createCustomerMutation.mutateAsync(partyForm);
        toast.success("Party created successfully");
      }

      setIsPartyModalOpen(false);
      setEditingPartyId(null);
      setPartyForm({
        name: "",
        phone: "",
        category: "Chicken",
        address: "",
      });
    } catch (error) {
      console.error("Party submission error:", error);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePayment() || !selectedParty) return;

    try {
      // Find the first credit sale for this customer to add payment to
      const customerSale = sales.find(
        (sale: any) => sale.isCredit && sale.customerId === selectedParty.id
      );

      if (!customerSale) {
        toast.error("No credit sales found for this customer");
        return;
      }

      // Add payment using the existing addPayment function
      await addPayment({
        saleId: customerSale.id,
        data: {
          amount: Number(paymentForm.amount),
          date: paymentForm.date,
          description: paymentForm.description,
          receiptUrl: paymentForm.receiptUrl,
        },
      });

      toast.success("Payment recorded successfully!");
      setIsPaymentModalOpen(false);
      setPaymentForm({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        reference: "",
        receiptUrl: "",
      });
      setSelectedParty(null);
      setPaymentErrors({});
    } catch (error) {
      console.error("Failed to record payment:", error);
      toast.error("Failed to record payment");
    }
  };

  const validatePayment = (): boolean => {
    const errors: Record<string, string> = {};
    if (!paymentForm.amount) errors.amount = "Amount is required";
    if (!paymentForm.date) errors.date = "Date is required";
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
      toast.success("Party deleted successfully");
    } catch (error) {
      console.error("Delete party error:", error);
      toast.error("Failed to delete party");
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
    });
    setIsPartyModalOpen(true);
  };

  const resetSaleForm = () => {
    setSaleForm((prev) => ({
      ...prev,
      itemType: "Chicken_Meat",
      eggTypeId: "",
      eggLineItems: [{ eggTypeId: "", quantity: "", unitPrice: "" }],
      rate: "",
      quantity: "",
      weight: "",
      date: new Date().toISOString().split("T")[0],
      remaining: false,
      customerId: "",
      customerName: "",
      contact: "",
      customerCategory: "Chicken",
      balance: "",
    }));
    setCustomerSearch("");
    setErrors({});
  };

  // Table columns
  const salesColumns = [
    {
      key: "date",
      label: "Date",
      type: "date" as const,
      width: "120px",
      render: (value: string) => <DateDisplay date={value} format="short" />,
    },
    {
      key: "itemType",
      label: "Item Type",
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
      label: "Customer",
      width: "150px",
      render: (_: any, row: any) => row.customer?.name || "—",
    },
    {
      key: "quantity",
      label: "Qty",
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
      label: "Weight (kg)",
      width: "100px",
      align: "center" as const,
      render: (value: number | null) => (
        <span className="text-sm">{value ? `${Number(value).toFixed(2)} kg` : "—"}</span>
      ),
    },
    {
      key: "unitPrice",
      label: "Rate",
      type: "currency" as const,
      width: "100px",
      align: "right" as const,
    },
    {
      key: "amount",
      label: "Total",
      type: "currency" as const,
      width: "120px",
      align: "right" as const,
    },
    {
      key: "isCredit",
      label: "Credit",
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
          {value ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "paidAmount",
      label: "Paid",
      type: "currency" as const,
      width: "100px",
      align: "right" as const,
      render: (value: number | null) => (value != null ? `₹${Number(value).toLocaleString()}` : "—"),
    },
    {
      key: "dueAmount",
      label: "Due",
      type: "currency" as const,
      width: "100px",
      align: "right" as const,
      render: (value: number | null) => (value != null ? `₹${Number(value).toLocaleString()}` : "—"),
    },
    {
      key: "transactions",
      label: "Transactions",
      type: "actions" as const,
      align: "center" as const,
      width: "120px",
      render: (_: any, row: any) => (
        <span className="text-sm text-muted-foreground">
          {row.payments?.length ?? 0} payment{(row.payments?.length ?? 0) !== 1 ? "s" : ""}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
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
      label: "Name",
      width: "200px",
    },
    {
      key: "phone",
      label: "Phone",
      width: "150px",
    },
    {
      key: "category",
      label: "Category",
      width: "120px",
      render: (value: string) => <Badge variant="outline">{value}</Badge>,
    },
    {
      key: "balance",
      label: "Balance",
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
      key: "transactions",
      label: "Transactions",
      type: "actions" as const,
      align: "center" as const,
      width: "120px",
      render: (_: any, row: any) => {
        // Count total transactions for this customer
        const customerTransactions = sales.filter(
          (sale: any) => sale.isCredit && sale.customerId === row.id
        );

        const totalPayments = customerTransactions.reduce(
          (sum: number, sale: any) => sum + (sale.payments?.length || 0),
          0
        );

        return (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs hover:bg-blue-50 hover:border-blue-300"
            onClick={() => {
              setSelectedParty(row);
              setIsPaymentModalOpen(true);
            }}
          >
            View ({totalPayments})
          </Button>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      type: "actions" as const,
      width: "120px",
      align: "right" as const,
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
            onClick={() => {
              setSelectedParty(row);
              setPaymentForm({
                amount: "",
                date: new Date().toISOString().split("T")[0],
                description: `Payment from ${row.name}`,
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
        <span className="ml-2">Loading sales ledger...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sales Ledger</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage sales, customers, and payments.
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
            <span className="hidden sm:inline">Add </span>Party
          </Button>
          <Button
            size="sm"
            className="text-xs md:text-sm bg-primary hover:bg-primary/90"
            onClick={() => setIsSaleModalOpen(true)}
          >
            <Plus className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">New </span>Sale
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg overflow-x-auto">
        {[
          { id: "overview", label: "Overview", shortLabel: "Stats", icon: TrendingUp },
          { id: "sales", label: "Sales", shortLabel: "Sales", icon: Receipt },
          { id: "parties", label: "Parties", shortLabel: "Parties", icon: Users },
          { id: "payments", label: "Payments", shortLabel: "Pay", icon: CreditCard },
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
                  Sales
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
                  Credit
                </CardTitle>
                <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold">
                  {salesStats.creditSales}
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground">
                  रू{salesStats.dueAmount.toLocaleString()} due
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
                <CardTitle className="text-[10px] md:text-sm font-medium">
                  Parties
                </CardTitle>
                <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold">
                  {partyStats.totalParties}
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground">
                  {partyStats.partiesWithBalance} owe
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
                <CardTitle className="text-[10px] md:text-sm font-medium">
                  Due
                </CardTitle>
                <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold text-red-600">
                  <span className="hidden md:inline">रू</span>{partyStats.totalBalance.toLocaleString()}
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground">
                  Outstanding
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Sales */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Recent Sales</CardTitle>
              <CardDescription className="text-xs md:text-sm">Latest transactions</CardDescription>
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
          {/* Filters */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Filter className="h-4 w-4 md:h-5 md:w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                <div className="col-span-2 md:col-span-1">
                  <Label htmlFor="search" className="text-xs md:text-sm">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search..."
                      value={salesFilters.search}
                      onChange={(e) =>
                        handleSalesFilterChange("search", e.target.value)
                      }
                      className="pl-9 h-8 md:h-10 text-xs md:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="itemType" className="text-xs md:text-sm">Type</Label>
                  <Select
                    value={salesFilters.itemType}
                    onValueChange={(value) => handleSalesFilterChange("itemType", value)}
                  >
                    <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Chicken_Meat">Meat</SelectItem>
                      <SelectItem value="EGGS">Eggs</SelectItem>
                      <SelectItem value="CHICKS">Chicks</SelectItem>
                      <SelectItem value="FEED">Feed</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="isCredit" className="text-xs md:text-sm">Payment</Label>
                  <Select
                    value={salesFilters.isCredit}
                    onValueChange={(value) => handleSalesFilterChange("isCredit", value)}
                  >
                    <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="false">Cash</SelectItem>
                      <SelectItem value="true">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate" className="text-xs md:text-sm">From</Label>
                  <DateInput
                    value={salesFilters.startDate}
                    onChange={(v) =>
                      handleSalesFilterChange(
                        "startDate",
                        v.includes("T") ? v.split("T")[0] : v
                      )
                    }
                    className="[&_input]:h-8 [&_input]:md:h-10 [&_input]:text-xs [&_input]:md:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-xs md:text-sm">To</Label>
                  <DateInput
                    value={salesFilters.endDate}
                    onChange={(v) =>
                      handleSalesFilterChange(
                        "endDate",
                        v.includes("T") ? v.split("T")[0] : v
                      )
                    }
                    className="[&_input]:h-8 [&_input]:md:h-10 [&_input]:text-xs [&_input]:md:text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 md:h-10 text-xs"
                    onClick={() =>
                      setSalesFilters({
                        search: "",
                        itemType: "",
                        isCredit: "",
                        startDate: "",
                        endDate: "",
                        customerId: "",
                      })
                    }
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sales Table */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Sales Records</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {pagination?.total || 0} total
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
                      <span>Total: {salesStats.totalSales}</span>
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
          {/* Party Filters */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Filter className="h-4 w-4 md:h-5 md:w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <div className="col-span-2 md:col-span-1">
                  <Label htmlFor="partySearch" className="text-xs md:text-sm">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="partySearch"
                      placeholder="Search..."
                      value={partyFilters.search}
                      onChange={(e) =>
                        handlePartyFilterChange("search", e.target.value)
                      }
                      className="pl-9 h-8 md:h-10 text-xs md:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="category" className="text-xs md:text-sm">Category</Label>
                  <Select
                    value={partyFilters.category}
                    onValueChange={(value) => handlePartyFilterChange("category", value)}
                  >
                    <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Chicken">Chicken</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="hasBalance" className="text-xs md:text-sm">Balance</Label>
                  <Select
                    value={partyFilters.hasBalance}
                    onValueChange={(value) => handlePartyFilterChange("hasBalance", value)}
                  >
                    <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Has Due</SelectItem>
                      <SelectItem value="false">Cleared</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 md:h-10 text-xs"
                    onClick={() =>
                      setPartyFilters({
                        search: "",
                        category: "",
                        hasBalance: "",
                      })
                    }
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parties Table */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Parties</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {partyStats.totalParties} total, {partyStats.partiesWithBalance} owe
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {customersLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-sm">Loading...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable
                    data={customers || []}
                    columns={partyColumns}
                    showFooter={true}
                    footerContent={
                      <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground">
                        <span>Total: {partyStats.totalParties}</span>
                        <span>
                          Due: रू{partyStats.totalBalance.toLocaleString()}
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
          {/* Payment Filters */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Filter className="h-4 w-4 md:h-5 md:w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                <div className="col-span-2 md:col-span-2">
                  <Label htmlFor="paymentSearch" className="text-xs md:text-sm">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="paymentSearch"
                      placeholder="Search description or customer..."
                      value={paymentFilters.search}
                      onChange={(e) =>
                        handlePaymentFilterChange("search", e.target.value)
                      }
                      className="pl-9 h-8 md:h-10 text-xs md:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="paymentStartDate" className="text-xs md:text-sm">From</Label>
                  <DateInput
                    value={paymentFilters.startDate}
                    onChange={(v) =>
                      handlePaymentFilterChange(
                        "startDate",
                        v.includes("T") ? v.split("T")[0] : v
                      )
                    }
                    className="[&_input]:h-8 [&_input]:md:h-10 [&_input]:text-xs [&_input]:md:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="paymentEndDate" className="text-xs md:text-sm">To</Label>
                  <DateInput
                    value={paymentFilters.endDate}
                    onChange={(v) =>
                      handlePaymentFilterChange(
                        "endDate",
                        v.includes("T") ? v.split("T")[0] : v
                      )
                    }
                    className="[&_input]:h-8 [&_input]:md:h-10 [&_input]:text-xs [&_input]:md:text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 md:h-10 text-xs"
                    onClick={() =>
                      setPaymentFilters({
                        search: "",
                        startDate: "",
                        endDate: "",
                      })
                    }
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments Table */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Recent Payments</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {paymentsPagination?.total || 0} total records
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-sm">Loading payments...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable
                    data={payments}
                    columns={[
                      {
                        key: "date",
                        label: "Date",
                        width: "120px",
                        render: (value: string) => <DateDisplay date={value} format="short" />,
                      },
                      {
                        key: "sale",
                        label: "Customer",
                        width: "200px",
                        render: (sale: any) => sale?.customer?.name || "—",
                      },
                      {
                        key: "description",
                        label: "Description",
                        width: "250px",
                        render: (value: string) => value || "Payment",
                      },
                      {
                        key: "amount",
                        label: "Amount",
                        type: "currency" as const,
                        width: "120px",
                        align: "right" as const,
                      },
                      {
                        key: "receiptUrl",
                        label: "Receipt",
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
                              <Eye className="h-3 w-3 mr-1" /> View
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          ),
                      },
                    ]}
                    showFooter={true}
                    footerContent={
                      <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground w-full">
                        <span>Total Records: {paymentsPagination?.total || 0}</span>
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
        title={editingSaleId ? "Edit Sale" : "Add New Sale"}
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
                  💡 <strong>Smart Form:</strong> Farm and batch selections are
                  remembered for your next sale to save time!
                </p>
              </div>

              {/* Farm Selection */}
              <div>
                <Label htmlFor="farmId">Select Farm *</Label>
                <Select
                  value={saleForm.farmId}
                  onValueChange={(value) => {
                    const event = { target: { name: 'farmId', value } } as any;
                    updateSaleField(event);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a farm" />
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
                <Label htmlFor="batchId">Select Batch *</Label>
                <Select
                  value={saleForm.batchId}
                  onValueChange={(value) => {
                    const event = { target: { name: 'batchId', value } } as any;
                    updateSaleField(event);
                  }}
                  disabled={!saleForm.farmId}
                >
                  <SelectTrigger className={!saleForm.farmId ? "opacity-50" : ""}>
                    <SelectValue placeholder="Choose a batch" />
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
                <Label htmlFor="itemType">Item Type</Label>
                <Select
                  value={saleForm.itemType}
                  onValueChange={(value) => {
                    const event = { target: { name: 'itemType', value } } as any;
                    updateSaleField(event);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="EGGS">Eggs</SelectItem>
                    <SelectItem value="Chicken_Meat">Layers (Meat)</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {saleForm.itemType === "EGGS" && (
                <div className="space-y-3">
                  <Label>Egg lines (type, quantity, rate per unit)</Label>
                  {eggInventory?.types && eggInventory.types.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Available: {eggInventory.types.map((t: { name: string; quantity: number }) => `${t.name} ${t.quantity}`).join(" · ")}
                    </p>
                  )}
                  {saleForm.eggLineItems.map((line, idx) => (
                    <div key={idx} className="flex flex-wrap items-end gap-2 p-2 border rounded-md bg-gray-50/50">
                      <div className="flex-1 min-w-[120px]">
                        <Label className="text-xs">Type</Label>
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
                            <SelectValue placeholder="Egg type" />
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
                        <Label className="text-xs">Qty</Label>
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
                        <Label className="text-xs">Rate (₹)</Label>
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
                    Add line
                  </Button>
                  {errors.eggLineItems && (
                    <p className="text-xs text-red-600">{errors.eggLineItems}</p>
                  )}
                </div>
              )}

              {saleForm.itemType !== "EGGS" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rate">Rate (₹)</Label>
                    <Input
                      id="rate"
                      name="rate"
                      type="number"
                      value={saleForm.rate}
                      onChange={updateSaleField}
                      placeholder="Rate per unit"
                    />
                    {errors.rate && (
                      <p className="text-xs text-red-600 mt-1">{errors.rate}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="quantity">
                      {saleForm.itemType === "Chicken_Meat"
                        ? "Quantity (Birds)"
                        : "Quantity (Units)"}
                    </Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      value={saleForm.quantity}
                      onChange={updateSaleField}
                      placeholder={
                        saleForm.itemType === "Chicken_Meat"
                          ? "Number of birds"
                          : "Number of units"
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
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      name="weight"
                      type="number"
                      step="0.01"
                      value={saleForm.weight}
                      onChange={updateSaleField}
                      placeholder="Total weight in kg"
                    />
                    {errors.weight && (
                      <p className="text-xs text-red-600 mt-1">{errors.weight}</p>
                    )}
                    {saleForm.itemType === "Chicken_Meat" &&
                      saleForm.quantity &&
                      saleForm.weight && (
                        <p className="text-xs text-green-600 mt-1">
                          Avg weight per bird:{" "}
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
                    Total Amount
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
                    ? "Sum of (quantity × rate) per line"
                    : saleForm.itemType === "Chicken_Meat"
                      ? "Calculated as rate × weight"
                      : "Calculated as rate × quantity"}
                </p>
              </div>

              <div>
                <DateInput
                  label="Date"
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
                  Remaining balance?
                </label>
              </div>

              {saleForm.remaining && (
                <div className="grid md:grid-cols-2 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="customerSearch">Search Customer</Label>
                    <div className="relative">
                      <Input
                        id="customerSearch"
                        name="customerSearch"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search existing customers..."
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
                              No customers found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      value={saleForm.customerName}
                      onChange={updateSaleField}
                      placeholder="Enter new customer name"
                    />
                    {errors.customerName && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.customerName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="contact">Contact *</Label>
                    <Input
                      id="contact"
                      name="contact"
                      value={saleForm.contact}
                      onChange={updateSaleField}
                      placeholder="Phone number"
                      required
                    />
                    {errors.contact && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.contact}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="customerCategory">Customer Category</Label>
                    <Select
                      value={saleForm.customerCategory || "Chicken"}
                      onValueChange={(value) => {
                        const event = { target: { name: 'customerCategory', value } } as any;
                        updateSaleField(event);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Chicken">Chicken</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="balance">Amount Paid (Optional)</Label>
                    <Input
                      id="balance"
                      name="balance"
                      type="number"
                      value={saleForm.balance}
                      onChange={updateSaleField}
                      placeholder="Amount paid (leave empty for full credit)"
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
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingSaleId ? "Updating..." : "Creating..."}
                </>
              ) : editingSaleId ? (
                "Update Sale"
              ) : (
                "Create Sale"
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
        title={editingPartyId ? "Edit Party" : "Add New Party"}
      >
        <form onSubmit={handlePartySubmit}>
          <ModalContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="partyName">Name</Label>
                <Input
                  id="partyName"
                  value={partyForm.name}
                  onChange={(e) =>
                    setPartyForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter party name"
                />
              </div>
              <div>
                <Label htmlFor="partyPhone">Phone</Label>
                <Input
                  id="partyPhone"
                  value={partyForm.phone}
                  onChange={(e) =>
                    setPartyForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="partyCategory">Category</Label>
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
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Chicken">Chicken</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="partyAddress">Address</Label>
                <Input
                  id="partyAddress"
                  value={partyForm.address}
                  onChange={(e) =>
                    setPartyForm((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="Enter address (optional)"
                />
              </div>
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
              Cancel
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
                  {editingPartyId ? "Updating..." : "Creating..."}
                </>
              ) : editingPartyId ? (
                "Update Party"
              ) : (
                "Create Party"
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
            date: new Date().toISOString().split("T")[0],
            description: "",
            reference: "",
            receiptUrl: "",
          });
          setPaymentErrors({});
        }}
        title={`Record Payment - ${selectedParty?.name || ""}`}
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
                    Outstanding Balance: ₹
                    {Number(selectedParty.balance || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Phone: {selectedParty.phone}
                  </p>
                </div>
              )}

              {/* Transaction History */}
              {selectedParty && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Recent Transactions</h4>
                  <div className="max-h-32 overflow-y-auto border rounded-md">
                    {sales
                      .filter(
                        (sale: any) =>
                          sale.isCredit && sale.customerId === selectedParty.id
                      )
                      .slice(0, 3)
                      .map((sale: any) => (
                        <div
                          key={sale.id}
                          className="p-2 border-b last:border-b-0 text-xs"
                        >
                          <div className="flex justify-between">
                            <span>
                              Sale: ₹{Number(sale.amount).toLocaleString()}
                            </span>
                            <span className="text-gray-500">
                              <DateDisplay date={sale.date} format="short" />
                            </span>
                          </div>
                          {sale.payments && sale.payments.length > 0 && (
                            <div className="text-green-600 mt-1">
                              Payments: {sale.payments.length} (₹
                              {sale.payments
                                .reduce(
                                  (sum: number, p: any) =>
                                    sum + Number(p.amount),
                                  0
                                )
                                .toLocaleString()}
                              )
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="amount">Payment Amount *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  value={paymentForm.amount}
                  onChange={updatePaymentField}
                  placeholder="Enter payment amount"
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
                  label="Payment Date *"
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
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={paymentForm.description}
                  onChange={updatePaymentField}
                  placeholder="Payment description"
                />
              </div>

              <div>
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  name="reference"
                  value={paymentForm.reference}
                  onChange={updatePaymentField}
                  placeholder="Receipt number or reference"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Receipt (Optional)</Label>
                <ImageUpload
                  value={paymentForm.receiptUrl || ""}
                  onChange={(url) =>
                    setPaymentForm((prev) => ({ ...prev, receiptUrl: url }))
                  }
                  folder="payment-receipts"
                  placeholder="Upload receipt"
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
                  date: new Date().toISOString().split("T")[0],
                  description: "",
                  reference: "",
                  receiptUrl: "",
                });
                setPaymentErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isAddingPayment}
            >
              {isAddingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Payment"
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
            <AlertDialogTitle>Delete Party</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this party? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteParty}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
