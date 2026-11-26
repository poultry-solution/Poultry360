"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, ChevronRight, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DateInput } from "@/common/components/ui/date-input";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/common/components/ui/dialog";
import {
  useHatcheryParties,
  useCreateHatcheryParty,
  useAddHatcheryPartyPayment,
  type HatcheryParty,
} from "@/fetchers/hatchery/hatcheryPartyQueries";
import { useGetCashflowAccountOptions } from "@/fetchers/hatchery/hatcheryCashflowQueries";
import { AccountPicker } from "@/components/cashflow/AccountPicker";
import axiosInstance from "@/common/lib/axios";
import { BusinessDownloadDialog, fetchAllPages } from "@/components/downloads/BusinessDownloadDialog";
import { formatRupeesExact, nepalPhoneDigits } from "@/common/lib/utils";
import { toNepalDayAd, getNepalTodayAd } from "@/common/lib/nepali-date";

export default function HatcheryPartiesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  // Null = no payment modal open; otherwise = which party the payment is for.
  // Lets the dealer record payments without navigating into the detail page.
  const [paymentTarget, setPaymentTarget] = useState<HatcheryParty | null>(null);

  const { data, isLoading } = useHatcheryParties(search || undefined, page, 10);
  const createParty = useCreateHatcheryParty();
  const total = Number(data?.total ?? 0);
  const currentPage = Math.max(1, Number(data?.page ?? page));
  const pageLimit = Math.max(1, Number(data?.limit ?? 10));
  const totalPages = Math.max(1, Math.ceil(total / pageLimit));

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    openingBalance: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    await createParty.mutateAsync({
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim() || undefined,
      openingBalance: form.openingBalance ? parseFloat(form.openingBalance) : 0,
    });
    setForm({ name: "", phone: "", address: "", openingBalance: "" });
    setShowModal(false);
  };

  const downloadParties = async () => {
    const rows = await fetchAllPages(async (downloadPage, limit) => {
      const { data: response } = await axiosInstance.get("/hatchery/parties", { params: { page: downloadPage, limit, search: search || undefined } });
      return { rows: response.parties || [], total: response.total };
    });
    return {
      columns: [
        { label: "Name", value: (row: HatcheryParty) => row.name },
        { label: "Phone", value: (row: HatcheryParty) => row.phone },
        { label: "Address", value: (row: HatcheryParty) => row.address || "" },
        { label: "Balance", value: (row: HatcheryParty) => Number(row.balance || 0).toFixed(2) },
        { label: "Added", value: (row: HatcheryParty) => toNepalDayAd(row.createdAt) },
      ],
      rows,
      summary: [{ label: "Total parties", value: rows.length }],
    };
  };

  const columns: Column<HatcheryParty>[] = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    {
      key: "balance",
      label: "Outstanding Balance",
      render: (_, row) => (
        <span className={Number(row.balance) > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
          {formatRupeesExact(row.balance)}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (_, row) => <DateDisplay date={row.createdAt} />,
    },
    {
      key: "id",
      label: "",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPaymentTarget(row)}
            title="Record payment"
            aria-label="Record payment"
          >
            <DollarSign className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/hatchery/dashboard/parties/${row.id}`)}
            title="Open party"
            aria-label="Open party"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Parties</h1>
          <span className="text-sm text-muted-foreground">
            ({data?.total ?? 0} total)
          </span>
        </div>
        <div className="flex gap-2">
          <BusinessDownloadDialog title="parties" fileName="hatchery-parties" getData={downloadParties} hasDateFilter={false} />
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Party
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search by name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        data={data?.parties ?? []}
        loading={isLoading}
        getRowKey={(r) => r.id}
      />

      <LedgerPagination
        page={currentPage}
        totalPages={totalPages}
        totalRows={total}
        pageLimit={pageLimit}
        onPageChange={setPage}
        loading={isLoading}
      />

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Party</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Party name"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone *</label>
              <Input
                inputMode="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    // Use the shared Nepal-phone helper so a pasted "+977
                    // 9812345678" normalises to the 10-digit mobile instead
                    // of being sliced to "9779812345" (previous `.slice(0,
                    // 10)` dropped the mobile and kept the country code).
                    phone: nepalPhoneDigits(e.target.value),
                  }))
                }
                placeholder="98XXXXXXXX"
                required
              />
              {form.phone.length > 0 && form.phone.length !== 10 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Phone should be 10 digits
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Opening balance (रू)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.openingBalance}
                onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Amount already owed to you before using this system.
              </p>
            </div>

            {createParty.isError && (
              <p className="text-sm text-red-500">
                {(createParty.error as any)?.response?.data?.error ?? "Failed to create party"}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createParty.isPending}>
                {createParty.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {paymentTarget && (
        <RecordPaymentModal
          party={paymentTarget}
          onClose={() => setPaymentTarget(null)}
        />
      )}
    </div>
  );
}

/**
 * Compact payment-record modal that opens from the parties list. Same shape as
 * the detail-page modal (date, amount, AccountPicker, note) but scoped to a
 * single clicked party so the dealer doesn't have to drill in just to record
 * a payment. The `useAddHatcheryPartyPayment(party.id)` hook is bound to the
 * party id via this component — parent only mounts when `party` exists so the
 * hook always has a real id.
 */
function RecordPaymentModal({
  party,
  onClose,
}: {
  party: HatcheryParty;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ date: "", amount: "", note: "" });
  const [accountId, setAccountId] = useState("");
  const addPayment = useAddHatcheryPartyPayment(party.id);
  const cashflowAccountsQ = useGetCashflowAccountOptions();
  const cashflowAccounts = cashflowAccountsQ.data ?? [];

  // Default Cash once options load so the form is usable without the user
  // having to open the picker first.
  useEffect(() => {
    if (!accountId && cashflowAccounts.length > 0) {
      const cash = cashflowAccounts.find((a) => a.type === "CASH");
      if (cash) setAccountId(cash.id);
    }
  }, [accountId, cashflowAccounts]);

  // Prefill today's Nepal day on mount so the submit guard doesn't silently
  // block Save when the dealer leaves the visible default untouched.
  useEffect(() => {
    if (!form.date) setForm((f) => ({ ...f, date: getNepalTodayAd() }));
  }, [form.date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.amount) return;
    try {
      await addPayment.mutateAsync({
        date: form.date,
        amount: parseFloat(form.amount),
        note: form.note || undefined,
        accountId: accountId || undefined,
      });
      toast.success(`Payment recorded for ${party.name}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to record payment");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment — {party.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Outstanding</span>
              <span
                className={
                  Number(party.balance) > 0
                    ? "font-semibold text-red-600"
                    : "font-semibold text-green-600"
                }
              >
                {formatRupeesExact(party.balance)}
              </span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Date *</label>
            <DateInput
              value={form.date}
              onChange={(v) => setForm((f) => ({ ...f, date: v }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Amount (रू) *</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>
          {cashflowAccounts.some((a) => a.type === "BANK" && a.archivedAt === null) && (
            <div>
              <label className="text-sm font-medium">Paid into</label>
              <AccountPicker
                accounts={cashflowAccounts}
                value={accountId}
                onChange={setAccountId}
                autoHideSingleCash
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Note</label>
            <Input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Optional note"
            />
          </div>
          {addPayment.isError && (
            <p className="text-sm text-red-500">
              {(addPayment.error as any)?.response?.data?.error ?? "Failed to record payment"}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={addPayment.isPending}>
              {addPayment.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
