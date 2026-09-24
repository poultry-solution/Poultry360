"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Calendar,
  Tractor,
  Users,
  MessageCircle,
  Globe,
  Clock,
  CircleDot,
  Layers,
  SlidersHorizontal,
  CreditCard,
  FlaskConical,
} from "lucide-react";
import {
  useGetAdminUserById,
  useGetAdminAccountUsage,
  useCreateAdminAccountPayment,
  useUpdateAdminNotes,
  useUpdateAdminTestAccount,
  useUpdateAdminUserFeature,
  type AdminAccountUsageSummary,
  type AdminUserDetail,
} from "@/fetchers/admin/userQueries";
import { toast } from "sonner";

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-blue-100 text-blue-800",
  MANAGER: "bg-purple-100 text-purple-800",
  DOCTOR: "bg-green-100 text-green-800",
  DEALER: "bg-orange-100 text-orange-800",
  COMPANY: "bg-indigo-100 text-indigo-800",
  HATCHERY: "bg-amber-100 text-amber-800",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-red-100 text-red-800",
  PENDING_VERIFICATION: "bg-yellow-100 text-yellow-800",
};

const USAGE_METRIC_STYLES: Record<
  string,
  { icon: typeof Users; color: string }
> = {
  farms: { icon: Tractor, color: "bg-emerald-100 text-emerald-700" },
  batches: { icon: Layers, color: "bg-sky-100 text-sky-700" },
  parent_batches: { icon: Layers, color: "bg-amber-100 text-amber-700" },
  incubation_runs: { icon: Layers, color: "bg-violet-100 text-violet-700" },
  customers: { icon: Users, color: "bg-orange-100 text-orange-700" },
  farmer_accounts: { icon: Tractor, color: "bg-emerald-100 text-emerald-700" },
  dealer_records: { icon: Users, color: "bg-orange-100 text-orange-700" },
  company_records: { icon: Building2, color: "bg-indigo-100 text-indigo-700" },
  suppliers: { icon: Building2, color: "bg-indigo-100 text-indigo-700" },
  parties: { icon: Users, color: "bg-orange-100 text-orange-700" },
  products: { icon: Layers, color: "bg-sky-100 text-sky-700" },
  raw_materials: { icon: Layers, color: "bg-amber-100 text-amber-700" },
  inventory_items: { icon: Layers, color: "bg-sky-100 text-sky-700" },
  purchases: { icon: Building2, color: "bg-indigo-100 text-indigo-700" },
  production_runs: { icon: Layers, color: "bg-violet-100 text-violet-700" },
  sales: { icon: Users, color: "bg-orange-100 text-orange-700" },
  listings: { icon: Building2, color: "bg-teal-100 text-teal-700" },
  staff_logins: { icon: Users, color: "bg-purple-100 text-purple-700" },
};

function StatCard({
  icon: Icon,
  value,
  label,
  color,
  last30Days,
}: {
  icon: typeof Users;
  value: number | string;
  label: string;
  color: string;
  last30Days?: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-4">
      <div className={`flex size-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
        {last30Days !== undefined && (
          <p className="mt-1 text-xs text-muted-foreground">
            +{last30Days} in last 30 days
          </p>
        )}
      </div>
    </div>
  );
}

function FarmsSection({ title, farms }: {
  title: string;
  farms: AdminUserDetail["ownedFarms"];
}) {
  if (farms.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tractor className="size-4" />
          {title}
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {farms.length} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Current birds</TableHead>
              <TableHead>Batches</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {farms.map((farm) => (
              <TableRow key={farm.id}>
                <TableCell>
                  <p className="font-medium">{farm.name}</p>
                  {farm.description && (
                    <p className="text-xs text-muted-foreground">{farm.description}</p>
                  )}
                </TableCell>
                <TableCell>{farm.capacity.toLocaleString()} birds</TableCell>
                <TableCell>
                  <p className="font-medium">
                    {farm.currentBirds.toLocaleString()} birds
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {farm.activeInitialBirds.toLocaleString()} placed in active batches
                  </p>
                </TableCell>
                <TableCell>
                  {farm.batches.length === 0 ? (
                    "--"
                  ) : (
                    <div className="space-y-1.5">
                      {farm.batches.map((batch) => (
                        <div key={batch.id} className="text-sm">
                          <p className="font-medium">
                            {batch.batchNumber}
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              {batch.batchType === "LAYERS" ? "Layer" : "Broiler"} · {batch.status.toLowerCase()}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {batch.currentBirds.toLocaleString()} current / {batch.initialChicks.toLocaleString()} placed
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(farm.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DealerAccountsSection({ accounts }: {
  accounts: AdminUserDetail["dealerAccounts"];
}) {
  if (accounts.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4" />
          Dealer Accounts
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {accounts.length} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Account Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.dealer.id}>
                <TableCell className="font-medium">{account.dealer.name}</TableCell>
                <TableCell className="text-muted-foreground">{account.dealer.contact}</TableCell>
                <TableCell className="text-muted-foreground">{account.dealer.address || "--"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(account.accountCreatedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DoctorConversationsSection({ conversations }: {
  conversations: AdminUserDetail["doctorConversations"];
}) {
  if (conversations.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="size-4" />
          Patient Conversations
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {conversations.length} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Farmer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.map((conv) => (
              <TableRow key={conv.id}>
                <TableCell className="font-medium">{conv.farmer.name}</TableCell>
                <TableCell className="text-muted-foreground">{conv.farmer.phone}</TableCell>
                <TableCell className="text-muted-foreground">{conv.subject || "--"}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    conv.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {conv.status}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(conv.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CustomerReferenceNotesSection({
  accountId,
  adminNotes,
}: {
  accountId: string;
  adminNotes: string | null;
}) {
  const updateNotes = useUpdateAdminNotes();
  const [notes, setNotes] = useState(adminNotes ?? "");

  const saveNotes = async () => {
    try {
      await updateNotes.mutateAsync({ accountId, adminNotes: notes });
      toast.success(notes.trim() ? "Customer reference notes saved" : "Customer reference notes cleared");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not save customer reference notes");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Customer reference notes</CardTitle>
        <CardDescription>Internal Admin context for pricing and future account reviews. The customer cannot see these notes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={notes}
          maxLength={4000}
          rows={6}
          placeholder="Record what the customer told us: farm or business capacity, current scale, nature of business, agreed price and why, expected growth, and what should trigger the next price review."
          onChange={(event) => setNotes(event.target.value)}
          disabled={updateNotes.isPending}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{notes.length.toLocaleString()} / 4,000 characters</p>
          <Button onClick={saveNotes} disabled={updateNotes.isPending}>
            {updateNotes.isPending ? "Saving..." : "Save notes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountPaymentsSection({
  accountId,
  isTestAccount,
  paymentStatus,
  payments,
}: {
  accountId: string;
  isTestAccount: boolean;
  paymentStatus: AdminUserDetail["paymentStatus"];
  payments: AdminUserDetail["accountPayments"];
}) {
  const createPayment = useCreateAdminAccountPayment();
  const updateTestAccount = useUpdateAdminTestAccount();
  const hasInitialPayment = payments.some((payment) => payment.type === "INITIAL");
  const [form, setForm] = useState({
    type: hasInitialPayment ? "MAINTENANCE" as const : "INITIAL" as const,
    amount: "",
    paidAt: new Date().toISOString().slice(0, 10),
  });

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !form.paidAt) {
      toast.error("Enter a positive amount and paid date");
      return;
    }

    try {
      await createPayment.mutateAsync({ accountId, type: form.type, amount, paidAt: form.paidAt });
      setForm({ type: "MAINTENANCE", amount: "", paidAt: new Date().toISOString().slice(0, 10) });
      toast.success("Payment recorded");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not record payment");
    }
  };

  const toggleTestAccount = async (nextValue: boolean) => {
    try {
      await updateTestAccount.mutateAsync({ accountId, isTestAccount: nextValue });
      toast.success(nextValue ? "Account marked as test" : "Test-account label removed");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not update test-account status");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <CreditCard className="size-4" />
          Customer payments
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              paymentStatus === "PAID"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {paymentStatus === "PAID" ? "PAID" : "NOT PAID"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-medium"><FlaskConical className="size-4" /> Test account</p>
            <p className="mt-1 text-sm text-muted-foreground">Adds a visible label in the Admin user list without changing access or billing.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            {isTestAccount ? "Marked" : "Not marked"}
            <input
              type="checkbox"
              checked={isTestAccount}
              disabled={updateTestAccount.isPending}
              onChange={(event) => toggleTestAccount(event.target.checked)}
            />
          </label>
        </div>

        <form onSubmit={submitPayment} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="payment-type">Payment type</Label>
            <select
              id="payment-type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as "INITIAL" | "MAINTENANCE" }))}
              disabled={createPayment.isPending}
            >
              <option value="INITIAL" disabled={hasInitialPayment}>First-time payment</option>
              <option value="MAINTENANCE">Annual maintenance</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount</Label>
            <Input
              id="payment-amount"
              required
              min="0.01"
              step="0.01"
              inputMode="decimal"
              type="number"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              disabled={createPayment.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-date">Paid date</Label>
            <Input
              id="payment-date"
              required
              max={new Date().toISOString().slice(0, 10)}
              type="date"
              value={form.paidAt}
              onChange={(event) => setForm((current) => ({ ...current, paidAt: event.target.value }))}
              disabled={createPayment.isPending}
            />
          </div>
          <Button disabled={createPayment.isPending}>
            {createPayment.isPending ? "Saving..." : "Record payment"}
          </Button>
        </form>

        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded. The account remains Not paid until a payment is entered.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid date</TableHead>
                  <TableHead>Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.type === "INITIAL" ? "First-time payment" : "Annual maintenance"}
                    </TableCell>
                    <TableCell>{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{new Date(payment.paidAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccountFeaturesSection({
  accountId,
  features,
}: {
  accountId: string;
  features: AdminUserDetail["accountFeatures"];
}) {
  const updateFeature = useUpdateAdminUserFeature();
  if (features.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="size-4" />
          Account Features
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {features.map((feature) => {
          const isUpdating =
            updateFeature.isPending &&
            updateFeature.variables?.featureKey === feature.key;
          return (
            <div
              key={feature.key}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{feature.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      feature.enabled
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {feature.enabled ? "ON" : "OFF"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
              <Button
                variant={feature.enabled ? "outline" : "default"}
                disabled={isUpdating}
                onClick={async () => {
                  try {
                    await updateFeature.mutateAsync({
                      accountId,
                      featureKey: feature.key,
                      enabled: !feature.enabled,
                    });
                    toast.success(
                      `${feature.name} turned ${feature.enabled ? "off" : "on"}`
                    );
                  } catch (error: any) {
                    toast.error(
                      error?.response?.data?.message ||
                        "Failed to update feature access"
                    );
                  }
                }}
              >
                {isUpdating
                  ? "Updating..."
                  : feature.enabled
                    ? "Turn Off"
                    : "Turn On"}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AccountUsageSection({
  usage,
  isLoading,
}: {
  usage?: AdminAccountUsageSummary;
  isLoading: boolean;
}) {
  if (!isLoading && (!usage || usage.metrics.length === 0)) return null;

  return (
    <section aria-labelledby="account-usage-heading">
      <div className="mb-3">
        <h2 id="account-usage-heading" className="text-lg font-semibold">
          Account usage
        </h2>
        <p className="text-sm text-muted-foreground">
          Lifetime records and new records from the last 30 days.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl border bg-white p-4"
              >
                <div className="size-10 rounded-lg bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-7 w-10 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
              </div>
            ))
          : usage?.metrics.map((usageMetric) => {
              const style = USAGE_METRIC_STYLES[usageMetric.key] ?? {
                icon: Users,
                color: "bg-gray-100 text-gray-700",
              };
              return (
                <StatCard
                  key={usageMetric.key}
                  icon={style.icon}
                  value={usageMetric.total}
                  label={usageMetric.label}
                  color={style.color}
                  last30Days={usageMetric.last30Days}
                />
              );
            })}
      </div>
    </section>
  );
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError, refetch } = useGetAdminUserById(id);
  const user = data?.data;
  const supportsAccountUsage =
    user?.role === "OWNER" ||
    user?.role === "DEALER" ||
    user?.role === "HATCHERY" ||
    user?.role === "COMPANY";
  const { data: usageData, isLoading: isUsageLoading } =
    useGetAdminAccountUsage(id, { enabled: supportsAccountUsage });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Back button skeleton */}
        <div className="h-9 w-32 rounded-md bg-muted" />

        {/* Hero card skeleton */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="h-2 bg-muted" />
          <div className="p-6">
            <div className="flex gap-6">
              <div className="size-16 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-48 rounded bg-muted" />
                  <div className="h-5 w-16 rounded-full bg-muted" />
                  <div className="h-5 w-16 rounded-full bg-muted" />
                </div>
                <div className="h-4 w-36 rounded bg-muted" />
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 pt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-5 w-32 rounded bg-muted" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border bg-white p-4">
              <div className="size-10 rounded-lg bg-muted" />
              <div className="space-y-1.5">
                <div className="h-7 w-10 rounded bg-muted" />
                <div className="h-3 w-14 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="rounded-xl border bg-white p-6 space-y-4">
          <div className="h-5 w-40 rounded bg-muted" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
              <div className="h-4 w-36 rounded bg-muted" />
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">
          {isError ? "Failed to load user" : "User not found"}
        </p>
        <div className="mt-4 flex gap-2">
          <Link href="/admin/dashboard/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1 size-4" />
              Back to Users
            </Button>
          </Link>
          {isError && (
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Compute stats for the stat cards
  const farmCount = user.ownedFarms.length + user.managedFarms.length;
  const batchCount =
    user.ownedFarms.reduce((s, f) => s + f._count.batches, 0) +
    user.managedFarms.reduce((s, f) => s + f._count.batches, 0);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin/dashboard/users">
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft className="size-4" />
          Back to Users
        </Button>
      </Link>

      {/* Profile Hero Card */}
      <Card className="overflow-hidden">
        {/* Colored top bar based on role */}
        <div
          className={`h-2 ${
            {
              OWNER: "bg-blue-500",
              MANAGER: "bg-purple-500",
              DOCTOR: "bg-green-500",
              DEALER: "bg-orange-500",
              COMPANY: "bg-indigo-500",
              HATCHERY: "bg-amber-500",
            }[user.role] ?? "bg-gray-500"
          }`}
        />
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar circle */}
            <div
              className={`flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-bold ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-800"}`}
            >
              {user.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {user.name}
                </h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[user.role] ?? ""}`}
                >
                  {user.role}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[user.status] ?? ""}`}
                >
                  {user.status === "PENDING_VERIFICATION" ? "PENDING" : user.status}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    user.paymentStatus === "PAID"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {user.paymentStatus === "PAID" ? "PAID" : "NOT PAID"}
                </span>
                {user.isTestAccount && (
                  <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800">
                    TEST ACCOUNT
                  </span>
                )}
                {user.isOnline && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    <CircleDot className="size-3" />
                    Online
                  </span>
                )}
              </div>

              {user.companyName && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {user.companyName}
                </p>
              )}

              {/* Info grid */}
              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="size-4 text-muted-foreground shrink-0" />
                  <span>{user.phone}</span>
                </div>
                {user.CompanyFarmLocation && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{user.CompanyFarmLocation}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="size-4 text-muted-foreground shrink-0" />
                  <span>{user.language} / {user.calendarType}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <span>
                    Joined{" "}
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {(user.lastSeen || !user.isOnline) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="size-4 shrink-0" />
                    <span>
                      {user.lastSeen
                        ? `Last seen ${new Date(user.lastSeen).toLocaleDateString()}`
                        : "Never seen"}
                    </span>
                  </div>
                )}
                {user.dealer && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{user.dealer.name}</span>
                  </div>
                )}
                {user.dealer?.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{user.dealer.address}</span>
                  </div>
                )}
                {user.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{user.company.name}</span>
                  </div>
                )}
                {user.company?.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{user.company.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CustomerReferenceNotesSection
        accountId={user.id}
        adminNotes={user.adminNotes}
      />

      <AccountPaymentsSection
        accountId={user.id}
        isTestAccount={user.isTestAccount}
        paymentStatus={user.paymentStatus}
        payments={user.accountPayments}
      />

      <AccountFeaturesSection
        accountId={user.id}
        features={user.accountFeatures}
      />

      <AccountUsageSection
        usage={usageData?.data}
        isLoading={supportsAccountUsage && isUsageLoading}
      />

      {/* Stat Cards Row */}
      {(user.role === "MANAGER" || user.role === "DOCTOR") && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {user.role === "MANAGER" && (
            <>
              <StatCard
                icon={Tractor}
                value={farmCount}
                label={farmCount !== 1 ? "Farms" : "Farm"}
                color="bg-emerald-100 text-emerald-700"
              />
              <StatCard
                icon={Layers}
                value={batchCount}
                label={batchCount !== 1 ? "Batches" : "Batch"}
                color="bg-sky-100 text-sky-700"
              />
              <StatCard
                icon={Users}
                value={user.dealerAccounts.length}
                label={user.dealerAccounts.length !== 1 ? "Dealers" : "Dealer"}
                color="bg-orange-100 text-orange-700"
              />
            </>
          )}
          {user.role === "DOCTOR" && (
            <StatCard
              icon={MessageCircle}
              value={user.doctorConversations.length}
              label={user.doctorConversations.length !== 1 ? "Patients" : "Patient"}
              color="bg-sky-100 text-sky-700"
            />
          )}
        </div>
      )}

      {/* Account Tables */}
      <FarmsSection title="Owned Farms" farms={user.ownedFarms} />
      <FarmsSection title="Managed Farms" farms={user.managedFarms} />
      <DealerAccountsSection accounts={user.dealerAccounts} />
      <DoctorConversationsSection conversations={user.doctorConversations} />
    </div>
  );
}
