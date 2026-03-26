"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FlaskConical, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Badge } from "@/common/components/ui/badge";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/common/components/ui/dialog";
import {
  useIncubationBatches,
  useCreateIncubationBatch,
  useHatchableStock,
  type IncubationBatch,
  type IncubationStage,
} from "@/fetchers/hatchery/hatcheryIncubationQueries";
import { useHatcheryBatches } from "@/fetchers/hatchery/hatcheryBatchQueries";

const STAGE_LABELS: Record<IncubationStage, string> = {
  SETTER: "Setter",
  CANDLING: "Candling",
  HATCHER: "Hatcher",
  COMPLETED: "Completed",
};

const STAGE_COLORS: Record<IncubationStage, string> = {
  SETTER: "bg-blue-100 text-blue-800",
  CANDLING: "bg-yellow-100 text-yellow-800",
  HATCHER: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-green-100 text-green-800",
};

function StagePreview({ parentBatchId }: { parentBatchId: string }) {
  const { data } = useHatchableStock(parentBatchId);
  if (!parentBatchId) return null;
  return (
    <p className="text-xs text-muted-foreground mt-1">
      Available hatchable eggs:{" "}
      <span className="font-semibold text-foreground">{data?.stock ?? "—"}</span>
      {data?.eggTypeName ? ` (${data.eggTypeName})` : ""}
    </p>
  );
}

export default function IncubationsPage() {
  const router = useRouter();
  const [stageFilter, setStageFilter] = useState<IncubationStage | "">("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useIncubationBatches({
    stage: stageFilter || undefined,
    search: search || undefined,
    limit: 50,
  });
  const batches = data?.batches ?? [];

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [parentBatchId, setParentBatchId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [eggsSetCount, setEggsSetCount] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateIncubationBatch();
  const { data: batchesData } = useHatcheryBatches({ limit: 100 });
  const parentBatches = (batchesData?.batches ?? []).filter(
    (b) => b.type === "PARENT_FLOCK"
  );

  function resetCreate() {
    setParentBatchId("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEggsSetCount("");
    setName("");
    setNotes("");
    setFormError(null);
    setShowCreate(false);
  }

  async function handleCreate() {
    setFormError(null);
    if (!parentBatchId) return setFormError("Select a parent flock batch");
    if (!eggsSetCount || parseInt(eggsSetCount) <= 0)
      return setFormError("Eggs set count must be greater than 0");

    try {
      await createMutation.mutateAsync({
        parentBatchId,
        startDate,
        eggsSetCount: parseInt(eggsSetCount),
        name: name || undefined,
        notes: notes || undefined,
      });
      resetCreate();
    } catch (err: any) {
      setFormError(err?.response?.data?.error ?? err.message);
    }
  }

  const columns: Column<IncubationBatch>[] = [
    { key: "code", label: "Code", render: (_, b) => <span className="font-mono font-semibold">{b.code}</span> },
    {
      key: "parentBatch",
      label: "Parent Batch",
      render: (_, b) => (
        <span className="text-sm">{b.parentBatch?.code ?? b.parentBatchId}</span>
      ),
    },
    {
      key: "startDate",
      label: "Start Date",
      render: (_, b) => <DateDisplay date={b.startDate} />,
    },
    {
      key: "eggsSetCount",
      label: "Eggs Set",
      render: (_, b) => <span className="font-semibold">{b.eggsSetCount}</span>,
    },
    {
      key: "stage",
      label: "Stage",
      render: (_, b) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[b.stage as IncubationStage]}`}
        >
          {STAGE_LABELS[b.stage as IncubationStage]}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (_, b) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); router.push(`/hatchery/dashboard/incubations/${b.id}`); }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Incubations</h1>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Incubation
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search by code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <div className="flex gap-2">
          {(["", "SETTER", "CANDLING", "HATCHER", "COMPLETED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s as any)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                stageFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              {s === "" ? "All" : STAGE_LABELS[s as IncubationStage]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={batches}
        loading={isLoading}
        emptyMessage="No incubation batches yet"
      />

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && resetCreate()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Incubation Batch</DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="bg-destructive/10 text-destructive text-sm px-3 py-2 rounded-md">
              {formError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Parent Flock Batch <span className="text-destructive">*</span>
              </label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={parentBatchId}
                onChange={(e) => setParentBatchId(e.target.value)}
              >
                <option value="">— Select batch —</option>
                {parentBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code}{b.name ? ` – ${b.name}` : ""}
                  </option>
                ))}
              </select>
              {parentBatchId && <StagePreview parentBatchId={parentBatchId} />}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Start Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Eggs Set (count) <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 500"
                  value={eggsSetCount}
                  onChange={(e) => setEggsSetCount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Batch Name (optional)</label>
              <Input
                placeholder="e.g. Batch Jan-2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Input
                placeholder="Any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetCreate}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Incubation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
