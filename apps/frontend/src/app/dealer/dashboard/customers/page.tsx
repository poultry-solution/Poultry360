"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Users, Edit, Trash2, Phone, MapPin, Link2, CheckCircle2, DollarSign } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/common/components/ui/label";
import { Badge } from "@/common/components/ui/badge";
import { toast } from "sonner";
import axiosInstance from "@/common/lib/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetDealerFarmerRequests, useGetConnectedFarmers } from "@/fetchers/dealer/dealerFarmerQueries";
import { DealerAddPaymentDialog } from "@/components/dealer/DealerAddPaymentDialog";
import { useI18n } from "@/i18n/useI18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  category?: string;
  balance: number;
  source?: string; // "MANUAL" | "CONNECTED"
  farmerId?: string; // Link to farmer for connected customers
  createdAt: Date;
  partyType?: "CUSTOMER" | "FARMER"; // For farmers from ledger parties
}

export default function DealerCustomersPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Add Payment dialog
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    category: "",
    openingBalanceAmount: "",
    openingBalanceDirection: "OWED" as "OWED" | "ADVANCE",
  });

  // Get customers
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["dealer-customers", search],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/dealer/sales/customers", {
        params: search ? { search } : {},
      });
      return data;
    },
  });

  // Get connected farmers (to show farmers who might not have Customer records yet)
  const { data: connectedFarmersData, isLoading: farmersLoading } = useGetConnectedFarmers();

  // Get ledger parties (includes both customers and farmers with transactions)
  const { data: ledgerPartiesData, isLoading: ledgerLoading } = useQuery({
    queryKey: ["dealer-ledger-parties", search],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/dealer/ledger/parties", {
        params: search ? { search } : {},
      });
      return data;
    },
  });

  // Get pending verification requests count
  const { data: verificationData } = useGetDealerFarmerRequests({
    status: "PENDING",
    limit: 1,
  });
  const pendingVerificationCount = verificationData?.pagination?.total || 0;

  const isLoading = customersLoading || farmersLoading || ledgerLoading;

  // Combine customers and farmers
  const manualCustomers: Customer[] = customersData?.data || [];
  const ledgerParties: any[] = ledgerPartiesData?.data || [];
  const connectedFarmers = connectedFarmersData?.data || [];

  // Create a map of existing customers by ID
  const customerMap = new Map<string, Customer>();
  manualCustomers.forEach((c) => customerMap.set(c.id, c));

  // Add farmers from ledger parties who aren't already customers
  ledgerParties.forEach((party) => {
    if (party.partyType === "FARMER" && !customerMap.has(party.id)) {
      // Check if this farmer is connected
      const isConnected = connectedFarmers.some((f) => f.id === party.id);
      if (isConnected) {
        customerMap.set(party.id, {
          id: party.id,
          name: party.name,
          phone: party.contact || "",
          address: party.address,
          balance: party.balance || 0,
          source: "CONNECTED",
          farmerId: party.id,
          partyType: "FARMER",
          createdAt: new Date(),
        });
      }
    }
  });

  // Convert map to array and sort
  const allCustomers = Array.from(customerMap.values()).sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const queryClient = useQueryClient();

  // Create customer mutation
  const createMutation = useMutation({
    mutationFn: async (input: typeof formData) => {
      const { data } = await axiosInstance.post("/dealer/sales/customers", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealer-customers"] });
      toast.success(t("dealer.customers.messages.createSuccess"));
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("dealer.customers.messages.createFailed"));
    },
  });

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/sales/customers/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealer-customers"] });
      toast.success(t("dealer.customers.messages.deleteSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("dealer.customers.messages.deleteFailed"));
    },
  });

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        address: customer.address || "",
        category: customer.category || "",
        openingBalanceAmount: "",
        openingBalanceDirection: "OWED",
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: "",
        phone: "",
        address: "",
        category: "",
        openingBalanceAmount: "",
        openingBalanceDirection: "OWED",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
    setFormData({
      name: "",
      phone: "",
      address: "",
      category: "",
      openingBalanceAmount: "",
      openingBalanceDirection: "OWED",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast.error(t("dealer.customers.messages.required"));
      return;
    }

    if (editingCustomer) {
      // Update customer (if endpoint exists)
      toast.info(t("dealer.customers.messages.updateSoon"));
    } else {
      const amtRaw = Number(formData.openingBalanceAmount || 0);
      if (Number.isNaN(amtRaw) || amtRaw < 0) {
        toast.error("Opening balance must be a non-negative number");
        return;
      }
      const openingBalance =
        amtRaw === 0
          ? 0
          : formData.openingBalanceDirection === "ADVANCE"
            ? -amtRaw
            : amtRaw;
      createMutation.mutate({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        category: formData.category,
        openingBalance,
      } as any);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t("dealer.customers.messages.deleteConfirm", { name }))) return;
    deleteMutation.mutate(id);
  };

  const customers = allCustomers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("dealer.customers.title")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("dealer.customers.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="flex-1 sm:flex-none hover:bg-green-50 hover:text-green-700 border-green-200"
          >
            <Link href="/dealer/dashboard/payment-requests">
              <DollarSign className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t("dealer.customers.buttons.paymentRequest")}</span>
              <span className="sm:hidden">{t("dealer.customers.buttons.paymentRequestMobile")}</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex-1 sm:flex-none relative hover:bg-green-50 hover:text-green-700 border-green-200"
          >
            <Link href="/dealer/dashboard/customers/verification">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t("dealer.customers.buttons.verification")}</span>
              <span className="sm:hidden">{t("dealer.customers.buttons.verificationMobile")}</span>
              {pendingVerificationCount > 0 && (
                <Badge className="ml-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                  {pendingVerificationCount}
                </Badge>
              )}
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenDialog()}
            className="flex-1 sm:flex-none hover:bg-green-50 hover:text-green-700 border-green-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t("dealer.customers.buttons.add")}</span>
            <span className="sm:hidden">{t("dealer.customers.buttons.addMobile")}</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("dealer.customers.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table - Unified DataTable */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base md:text-lg">{t("dealer.customers.table.title")}</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {t(customers.length === 1 ? "dealer.customers.table.description" : "dealer.customers.table.descriptionPlural", { count: customers.length, singular_customer: "customer" })}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddPaymentOpen(true)}
              className="w-full sm:w-auto hover:bg-green-50 hover:text-green-700 border-green-200"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              {t("dealer.customers.addPayment")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={customers}
            loading={isLoading}
            emptyMessage={t("dealer.customers.table.empty")}
            columns={[
              {
                key: 'name',
                label: t("dealer.customers.table.name"),
                width: '160px',
                render: (val, row) => (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{val}</span>
                    {(row.source === "CONNECTED" || row.partyType === "FARMER") && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px] px-1"
                      >
                        <Link2 className="h-2.5 w-2.5 mr-0.5" />
                        <span className="hidden sm:inline">{t("dealer.customers.table.connected")}</span>
                      </Badge>
                    )}
                  </div>
                )
              },
              {
                key: 'phone',
                label: t("dealer.customers.table.phone"),
                width: '120px',
                render: (val) => (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{val}</span>
                  </div>
                )
              },
              {
                key: 'address',
                label: t("dealer.customers.table.address"),
                width: '150px',
                render: (val) => val ? (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate max-w-[120px]">{val}</span>
                  </div>
                ) : '-'
              },
              {
                key: 'balance',
                label: t("dealer.customers.table.balance"),
                align: 'right',
                width: '130px',
                render: (val) => (
                  <span className={
                    val > 0 ? "text-red-600 font-semibold" :
                      val < 0 ? "text-green-600 font-semibold" : ""
                  }>
                    {val > 0
                      ? t("dealer.customers.table.due", { amount: `रू ${Math.abs(val).toFixed(2)}` })
                      : val < 0
                        ? t("dealer.customers.table.adv", { amount: `रू ${Math.abs(val).toFixed(2)}` })
                        : "रू 0.00"}
                  </span>
                )
              },
              {
                key: 'actions',
                label: t("dealer.customers.table.actions"),
                align: 'right',
                width: '140px',
                render: (_, row) => (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => router.push(`/dealer/dashboard/customers/${row.id}/account`)}
                    >
                      <span className="hidden sm:inline">{t("dealer.customers.table.view")}</span>
                      <span className="sm:hidden">{t("dealer.customers.table.viewMobile")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleOpenDialog(row)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDelete(row.id, row.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                )
              }
            ] as Column[]}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? t("dealer.customers.dialog.editTitle") : t("dealer.customers.dialog.addTitle")}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer
                  ? t("dealer.customers.dialog.editDescription")
                  : t("dealer.customers.dialog.addDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("dealer.customers.dialog.name")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("dealer.customers.dialog.namePlaceholder")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("dealer.customers.dialog.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder={t("dealer.customers.dialog.phonePlaceholder")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t("dealer.customers.dialog.address")}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder={t("dealer.customers.dialog.addressPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">{t("dealer.customers.dialog.category")}</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder={t("dealer.customers.dialog.categoryPlaceholder")}
                />
              </div>

              {!editingCustomer && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-2">
                    <Label>Opening balance (optional)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.openingBalanceAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, openingBalanceAmount: e.target.value })
                      }
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use this if you already had an outstanding balance before using Poultry360.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Direction</Label>
                    <Select
                      value={formData.openingBalanceDirection}
                      onValueChange={(v) =>
                        setFormData({ ...formData, openingBalanceDirection: v as any })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWED">Customer owes me</SelectItem>
                        <SelectItem value="ADVANCE">I owe customer (advance/credit)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                {t("dealer.customers.dialog.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? t("dealer.customers.dialog.saving")
                  : editingCustomer
                    ? t("dealer.customers.dialog.update")
                    : t("dealer.customers.dialog.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DealerAddPaymentDialog
        open={isAddPaymentOpen}
        onOpenChange={setIsAddPaymentOpen}
        mode="select"
        customers={customers
          .filter(c => c.source !== "CONNECTED")
          .map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            balance: c.balance,
          }))}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ["dealer-customers"] });
          await queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] }); // Catches dealer-ledger-parties and others
          await queryClient.invalidateQueries({ queryKey: ["dealer-ledger-parties"] }); // Explicitly just in case
          await queryClient.invalidateQueries({ queryKey: ["dealer-farmers"] });
        }}
      />
    </div>
  );
}
