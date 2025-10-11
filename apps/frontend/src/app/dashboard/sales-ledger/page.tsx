"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
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
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "@/fetchers/sale/saleQueries";
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { useGetUserFarms } from "@/fetchers/farms/farmQueries";
import { toast } from "sonner";
import { DateDisplay } from "@/components/ui/date-display";

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

export default function SalesLedgerPage() {
  // State management
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);
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

  // Form states
  const [saleForm, setSaleForm] = useState({
    farmId: "",
    batchId: "",
    itemType: "Chicken_Meat",
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
    useGetCustomersForSales(partyFilters.search);

  // Fetch farms and batches for sale form (same as home page)
  const { data: batchesResponse } = useGetAllBatches();
  const { data: farmsResponse } = useGetUserFarms("all");

  const activeBatches = batchesResponse?.data || [];
  const farms = farmsResponse?.data || [];

  // Customer management mutations
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();

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
    if (!saleForm.rate) errors.rate = "Please enter rate";
    if (!saleForm.quantity) errors.quantity = "Please enter quantity";
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
      // Validate that paid amount doesn't exceed total amount
      const totalAmount =
        saleForm.itemType === "Chicken_Meat"
          ? Number(saleForm.rate || 0) * Number(saleForm.weight || 0)
          : Number(saleForm.rate || 0) * Number(saleForm.quantity || 0);
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
      // Calculate amount based on itemType (align with home page)
      const quantity = parseFloat(saleForm.quantity);
      const weight =
        saleForm.itemType === "Chicken_Meat"
          ? parseFloat(saleForm.weight)
          : null;
      const unitPrice = parseFloat(saleForm.rate);
      const amount =
        saleForm.itemType === "Chicken_Meat"
          ? unitPrice * (weight || 0)
          : unitPrice * quantity;

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
        weight,
        unitPrice,
        description: undefined,
        isCredit,
        paidAmount,
        farmId: saleForm.farmId,
        batchId: saleForm.batchId,
        itemType: saleForm.itemType,
      };

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
        },
      });

      toast.success("Payment recorded successfully!");
      setIsPaymentModalOpen(false);
      setPaymentForm({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        reference: "",
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

  const handleDeleteParty = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this party?")) {
      try {
        await deleteCustomerMutation.mutateAsync(id);
        toast.success("Party deleted successfully");
      } catch (error) {
        console.error("Delete party error:", error);
        toast.error("Failed to delete party");
      }
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
      // Keep farmId and batchId for smart persistence
      farmId: prev.farmId,
      batchId: prev.batchId,
      itemType: "Chicken_Meat",
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
      width: "80px",
      align: "center" as const,
    },
    {
      key: "weight",
      label: "Weight",
      width: "100px",
      align: "center" as const,
      render: (value: number | null) => (
        <span className="text-sm">{value ? `${value} kg` : "—"}</span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      type: "currency" as const,
      width: "120px",
      align: "right" as const,
    },
    {
      key: "isCredit",
      label: "Type",
      width: "100px",
      render: (value: boolean) => (
        <Badge variant={value ? "secondary" : "default"}>
          {value ? "Credit" : "Cash"}
        </Badge>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Ledger</h1>
          <p className="text-muted-foreground">
            Manage your sales, customers, and payments in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsPartyModalOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Party
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={() => setIsSaleModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Sale
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        {[
          { id: "overview", label: "Overview", icon: TrendingUp },
          { id: "sales", label: "Sales", icon: Receipt },
          { id: "parties", label: "Parties", icon: Users },
          { id: "payments", label: "Payments", icon: CreditCard },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.id as TabType)}
            className="flex items-center gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Sales Statistics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Sales
                </CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {salesStats.totalSales}
                </div>
                <p className="text-xs text-muted-foreground">
                  ₹{salesStats.totalAmount.toLocaleString()} total value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Credit Sales
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {salesStats.creditSales}
                </div>
                <p className="text-xs text-muted-foreground">
                  ₹{salesStats.creditAmount.toLocaleString()} outstanding
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Parties
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {partyStats.totalParties}
                </div>
                <p className="text-xs text-muted-foreground">
                  {partyStats.partiesWithBalance} with outstanding balance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Outstanding
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₹{partyStats.totalBalance.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total outstanding amount
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>Latest sales transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={sales.slice(0, 5)}
                columns={salesColumns.filter((col) => col.key !== "actions")}
                showFooter={false}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sales Tab */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Sales Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search sales..."
                      value={salesFilters.search}
                      onChange={(e) =>
                        handleSalesFilterChange("search", e.target.value)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="itemType">Item Type</Label>
                  <select
                    id="itemType"
                    value={salesFilters.itemType}
                    onChange={(e) =>
                      handleSalesFilterChange("itemType", e.target.value)
                    }
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="Chicken_Meat">Chicken Meat</option>
                    <option value="EGGS">Eggs</option>
                    <option value="CHICKS">Chicks</option>
                    <option value="FEED">Feed</option>
                    <option value="MEDICINE">Medicine</option>
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="isCredit">Payment Type</Label>
                  <select
                    id="isCredit"
                    value={salesFilters.isCredit}
                    onChange={(e) =>
                      handleSalesFilterChange("isCredit", e.target.value)
                    }
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">All</option>
                    <option value="false">Cash</option>
                    <option value="true">Credit</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={salesFilters.startDate}
                    onChange={(e) =>
                      handleSalesFilterChange("startDate", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={salesFilters.endDate}
                    onChange={(e) =>
                      handleSalesFilterChange("endDate", e.target.value)
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
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
            <CardHeader>
              <CardTitle>Sales Records</CardTitle>
              <CardDescription>
                {pagination?.total || 0} total sales found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={sales}
                columns={salesColumns}
                showFooter={true}
                footerContent={
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Total Sales: {salesStats.totalSales}</span>
                    <span>
                      Total Amount: ₹{salesStats.totalAmount.toLocaleString()}
                    </span>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Parties Tab */}
      {activeTab === "parties" && (
        <div className="space-y-6">
          {/* Party Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Party Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="partySearch">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="partySearch"
                      placeholder="Search parties..."
                      value={partyFilters.search}
                      onChange={(e) =>
                        handlePartyFilterChange("search", e.target.value)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={partyFilters.category}
                    onChange={(e) =>
                      handlePartyFilterChange("category", e.target.value)
                    }
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">All Categories</option>
                    <option value="Chicken">Chicken</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="hasBalance">Balance Status</Label>
                  <select
                    id="hasBalance"
                    value={partyFilters.hasBalance}
                    onChange={(e) =>
                      handlePartyFilterChange("hasBalance", e.target.value)
                    }
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">All</option>
                    <option value="true">Has Balance</option>
                    <option value="false">No Balance</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
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
            <CardHeader>
              <CardTitle>Customer Parties</CardTitle>
              <CardDescription>
                {partyStats.totalParties} total parties,{" "}
                {partyStats.partiesWithBalance} with outstanding balance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading parties...</span>
                </div>
              ) : (
                <DataTable
                  data={customers || []}
                  columns={partyColumns}
                  showFooter={true}
                  footerContent={
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Total Parties: {partyStats.totalParties}</span>
                      <span>
                        Total Outstanding: ₹
                        {partyStats.totalBalance.toLocaleString()}
                      </span>
                    </div>
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Management</CardTitle>
              <CardDescription>
                Track and manage customer payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Payment Management
                </h3>
                <p className="text-muted-foreground mb-4">
                  Payment tracking and management features coming soon.
                </p>
                <Button onClick={() => setActiveTab("parties")}>
                  View Parties with Outstanding Balance
                </Button>
              </div>
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
                <select
                  id="farmId"
                  name="farmId"
                  value={saleForm.farmId}
                  onChange={updateSaleField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  required
                >
                  <option value="">Choose a farm</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
                {errors.farmId && (
                  <p className="text-xs text-red-600 mt-1">{errors.farmId}</p>
                )}
              </div>

              {/* Batch Selection */}
              <div>
                <Label htmlFor="batchId">Select Batch *</Label>
                <select
                  id="batchId"
                  name="batchId"
                  value={saleForm.batchId}
                  onChange={updateSaleField}
                  disabled={!saleForm.farmId}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">Choose a batch</option>
                  {activeBatches
                    .filter(
                      (batch) =>
                        batch.status === "ACTIVE" &&
                        (!saleForm.farmId || batch.farmId === saleForm.farmId)
                    )
                    .map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchNumber} - {batch.farm.name}
                      </option>
                    ))}
                </select>
                {errors.batchId && (
                  <p className="text-xs text-red-600 mt-1">{errors.batchId}</p>
                )}
              </div>

              <div>
                <Label htmlFor="itemType">Item Type</Label>
                <select
                  id="itemType"
                  name="itemType"
                  value={saleForm.itemType}
                  onChange={updateSaleField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="Chicken_Meat">Chicken_Meat</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

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

              {["Chicken_Meat", "FEED", "MEDICINE"].includes(
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
                    {(() => {
                      const rate = Number(saleForm.rate || 0);
                      const quantity = Number(saleForm.quantity || 0);
                      const weight = Number(saleForm.weight || 0);

                      if (
                        ["Chicken_Meat", "FEED", "MEDICINE"].includes(
                          saleForm.itemType
                        )
                      ) {
                        return (rate * weight).toLocaleString();
                      } else {
                        return (rate * quantity).toLocaleString();
                      }
                    })()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {["Chicken_Meat", "FEED", "MEDICINE"].includes(
                    saleForm.itemType
                  )
                    ? "Calculated as rate : weight"
                    : "Calculated as rate : quantity"}
                </p>
              </div>

              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={saleForm.date}
                  onChange={updateSaleField}
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
                    <select
                      id="customerCategory"
                      name="customerCategory"
                      value={saleForm.customerCategory || "Chicken"}
                      onChange={updateSaleField}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      <option value="Chicken">Chicken</option>
                      <option value="Other">Other</option>
                    </select>
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
                <select
                  id="partyCategory"
                  value={partyForm.category}
                  onChange={(e) =>
                    setPartyForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="Chicken">Chicken</option>
                  <option value="Other">Other</option>
                </select>
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
                <Label htmlFor="date">Payment Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={paymentForm.date}
                  onChange={updatePaymentField}
                  required
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
    </div>
  );
}
