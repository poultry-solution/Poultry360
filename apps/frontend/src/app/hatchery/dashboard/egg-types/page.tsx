"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Badge } from "@/common/components/ui/badge";
import {
  useHatcheryEggTypes,
  useCreateHatcheryEggType,
  useUpdateHatcheryEggType,
  useDeleteHatcheryEggType,
  type HatcheryEggType,
} from "@/fetchers/hatchery/hatcheryBatchQueries";
import { DataTable, type Column } from "@/common/components/ui/data-table";

export default function HatcheryEggTypesPage() {
  const { data: types = [], isLoading } = useHatcheryEggTypes();
  const createMutation = useCreateHatcheryEggType();
  const updateMutation = useUpdateHatcheryEggType();
  const deleteMutation = useDeleteHatcheryEggType();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const hatchableExists = types.some((t) => t.isHatchable);

  async function handleCreate(isHatchable: boolean) {
    if (!newName.trim()) return;
    setFormError(null);
    try {
      await createMutation.mutateAsync({ name: newName.trim(), isHatchable });
      setNewName("");
    } catch (err: any) {
      setFormError(err?.response?.data?.error ?? "Failed to create egg type");
    }
  }

  async function handleUpdate() {
    if (!editingId || !editingName.trim()) return;
    try {
      await updateMutation.mutateAsync({ id: editingId, name: editingName.trim() });
      setEditingId(null);
      setEditingName("");
    } catch (err: any) {
      setFormError(err?.response?.data?.error ?? "Failed to update egg type");
    }
  }

  async function handleDelete(id: string) {
    setFormError(null);
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (err: any) {
      setFormError(err?.response?.data?.error ?? "Failed to delete egg type");
    }
  }

  const columns: Column<HatcheryEggType>[] = [
    {
      key: "name",
      label: "Name",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {editingId === row.id ? (
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="h-7 w-48 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            />
          ) : (
            <span className="font-medium">{row.name}</span>
          )}
          {row.isHatchable && (
            <Badge className="bg-green-100 text-green-800 text-xs border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Hatchable
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "__actions",
      label: "Actions",
      align: "right",
      render: (_, row) => {
        if (deleteConfirmId === row.id) {
          return (
            <div className="flex items-center gap-2 justify-end">
              <span className="text-sm text-red-600">Delete?</span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(row.id)}
                disabled={deleteMutation.isPending}
              >
                Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
            </div>
          );
        }

        if (editingId === row.id) {
          return (
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingId(row.id);
                setEditingName(row.name);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            {!row.isHatchable && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setDeleteConfirmId(row.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Egg Types</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage global egg types used across all batches. One HATCHABLE type is required.
        </p>
      </div>

      {/* Add form */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Add Egg Type</h2>
        {formError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {formError}
          </p>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="Type name (e.g. Rejected, Small, Cracked)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate(false)}
            className="flex-1"
          />
          <Button
            onClick={() => handleCreate(false)}
            disabled={!newName.trim() || createMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
          {!hatchableExists && (
            <Button
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => handleCreate(true)}
              disabled={!newName.trim() || createMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Add as Hatchable
            </Button>
          )}
        </div>
        {!hatchableExists && (
          <p className="text-xs text-amber-600">
            No HATCHABLE type yet. Create one to track hatchable eggs.
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <DataTable
          data={types}
          columns={columns}
          loading={isLoading}
          emptyMessage="No egg types yet. Add your first type above."
          getRowKey={(row) => row.id}
        />
      </div>
    </div>
  );
}
