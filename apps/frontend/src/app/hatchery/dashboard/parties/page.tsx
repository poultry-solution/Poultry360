"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, ChevronRight, X, Loader2 } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { DateDisplay } from "@/common/components/ui/date-display";
import {
  useHatcheryParties,
  useCreateHatcheryParty,
  type HatcheryParty,
} from "@/fetchers/hatchery/hatcheryPartyQueries";

export default function HatcheryPartiesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useHatcheryParties(search || undefined);
  const createParty = useCreateHatcheryParty();

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

  const columns: Column<HatcheryParty>[] = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    {
      key: "balance",
      label: "Outstanding Balance",
      render: (_, row) => (
        <span className={Number(row.balance) > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
          Rs {Number(row.balance).toFixed(2)}
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
        <Button variant="ghost" size="sm" onClick={() => router.push(`/hatchery/dashboard/parties/${row.id}`)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
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
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Party
        </Button>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Party</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

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
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone number (unique)"
                  required
                />
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
                <label className="text-sm font-medium">Opening Balance (Rs)</label>
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

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createParty.isPending}>
                  {createParty.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
