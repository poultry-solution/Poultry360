"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle, Loader2, Tag } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import {
  useHatcheryEggTypes,
  useCreateHatcheryEggType,
  useUpdateHatcheryEggType,
  useDeleteHatcheryEggType,
  useHatcheryEggInventory,
  type HatcheryEggType,
  type HatcheryEggStockRow,
} from "@/fetchers/hatchery/hatcheryBatchQueries";
import { DataTable, type Column } from "@/common/components/ui/data-table";

function errorText(err: any, fallback: string) {
  const data = err?.response?.data;
  return data?.message ?? data?.error ?? fallback;
}

export default function HatcheryEggTypesPage() {
  const { data: types = [], isLoading } = useHatcheryEggTypes();
  // Read only: eggs of each type in stock across all batches.
  const { data: stockRes } = useHatcheryEggInventory({ page: 1, limit: 500 });
  const createMutation = useCreateHatcheryEggType();
  const updateMutation = useUpdateHatcheryEggType();
  const deleteMutation = useDeleteHatcheryEggType();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const hatchableExists = types.some((t) => t.isHatchable);

  const stockByType = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const row of (stockRes?.data ?? []) as HatcheryEggStockRow[]) {
      totals[row.eggTypeId] = (totals[row.eggTypeId] ?? 0) + Number(row.currentStock || 0);
    }
    return totals;
  }, [stockRes?.data]);

  async function handleCreate(isHatchable: boolean) {
    if (!newName.trim() || createMutation.isPending) return;
    setFormError(null);
    try {
      await createMutation.mutateAsync({ name: newName.trim(), isHatchable });
      setNewName("");
    } catch (err: any) {
      setFormError(errorText(err, "Could not add the egg type. Please try again."));
    }
  }

  async function handleUpdate() {
    if (!editingId || !editingName.trim() || updateMutation.isPending) return;
    setFormError(null);
    try {
      await updateMutation.mutateAsync({ id: editingId, name: editingName.trim() });
      setEditingId(null);
      setEditingName("");
    } catch (err: any) {
      setFormError(errorText(err, "Could not rename the egg type. Please try again."));
    }
  }

  async function handleDelete(id: string) {
    setFormError(null);
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (err: any) {
      setFormError(errorText(err, "Could not delete the egg type. Please try again."));
    }
  }

  const iconButton =
    "inline-flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700";

  const columns: Column<HatcheryEggType>[] = [
    {
      key: "name",
      label: "Name",
      render: (_, row) =>
        editingId === row.id ? (
          <Input
            autoFocus
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className="h-8 w-full max-w-56 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleUpdate();
              if (e.key === "Escape") setEditingId(null);
            }}
          />
        ) : (
          <span className="font-medium text-gray-900">{row.name}</span>
        ),
    },
    {
      key: "isHatchable",
      label: "Use",
      render: (_, row) =>
        row.isHatchable ? (
          <span className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[11px] font-medium text-green-800">
            <CheckCircle className="h-3 w-3" /> Hatchable · can be set
          </span>
        ) : (
          <span className="inline-flex rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
            For sale
          </span>
        ),
    },
    {
      key: "stock",
      label: "In stock",
      align: "right",
      render: (_, row) => {
        const n = stockByType[row.id] ?? 0;
        return <span className={n === 0 ? "text-gray-300" : "font-medium"}>{n.toLocaleString()}</span>;
      },
    },
    {
      key: "__actions",
      label: "",
      align: "right",
      render: (_, row) => {
        if (deleteConfirmId === row.id) {
          return (
            <div className="flex justify-end gap-1.5">
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2 text-xs"
                onClick={() => handleDelete(row.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
            </div>
          );
        }

        if (editingId === row.id) {
          return (
            <div className="flex justify-end gap-1.5">
              <Button size="sm" className="h-7 px-2 text-xs" onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              className={iconButton}
              aria-label="Rename"
              title="Rename"
              onClick={() => {
                setEditingId(row.id);
                setEditingName(row.name);
                setDeleteConfirmId(null);
              }}
            >
              <Pencil className="h-4 w-4" />
            </button>
            {row.isHatchable ? (
              <span className="inline-flex h-8 w-8" title="The hatchable type can't be deleted" />
            ) : (
              <button
                type="button"
                className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                aria-label="Delete"
                title="Delete"
                onClick={() => {
                  setDeleteConfirmId(row.id);
                  setEditingId(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="max-w-3xl space-y-4 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Tag className="h-6 w-6 text-gray-500" />
          Egg types
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          The kinds of eggs you collect. Hatchable eggs can be set in incubators. Other types (table, cracked …) are only for sale.
        </p>
      </div>

      {/* Add form */}
      <form
        className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleCreate(false);
        }}
      >
        <h2 className="font-semibold text-gray-900">Add egg type</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-xs font-medium text-gray-600">Name</span>
            <Input
              placeholder="e.g. Small, Double yolk, Dirty"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setFormError(null);
              }}
              className="h-10"
            />
          </label>
          <Button type="submit" className="h-10" disabled={!newName.trim() || createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add
              </>
            )}
          </Button>
          {!hatchableExists && (
            <Button
              type="button"
              variant="outline"
              className="h-10 border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => handleCreate(true)}
              disabled={!newName.trim() || createMutation.isPending}
            >
              <CheckCircle className="h-4 w-4" />
              Add as hatchable
            </Button>
          )}
        </div>
        {!hatchableExists && (
          <p className="text-xs text-amber-600">
            You have no hatchable type yet. Add one so eggs can be set in incubators.
          </p>
        )}
        {formError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
        )}
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <DataTable
          data={types}
          columns={columns}
          loading={isLoading}
          emptyMessage="Add your first egg type, e.g. Hatchable, Table, Cracked."
          getRowKey={(row) => row.id}
        />
      </div>
    </div>
  );
}
