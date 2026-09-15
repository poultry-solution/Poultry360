"use client";

import { useState } from "react";
import Link from "next/link";
import { Factory, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { DateDisplay } from "@/common/components/ui/date-display";
import { Input } from "@/common/components/ui/input";
import {
  Modal,
  ModalContent,
  ModalFooter,
} from "@/common/components/ui/modal";
import type { MaterialProductionRun } from "@/fetchers/production/materialProductionTypes";

const summary = (
  items: Array<{
    quantity: number;
    inventoryItem?: { name: string; unit: string };
    product?: { name: string; unit: string };
  }>
) =>
  items
    .map(
      (item) =>
        `${item.inventoryItem?.name ?? item.product?.name}: ${Number(item.quantity)} ${item.inventoryItem?.unit ?? item.product?.unit}`
    )
    .join(", ");

interface MaterialProductionListProps {
  runs: MaterialProductionRun[];
  newHref: string;
  isLoading?: boolean;
  isRemoving?: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  onRemove: (run: MaterialProductionRun) => Promise<void>;
}

export function MaterialProductionList({
  runs,
  newHref,
  isLoading = false,
  isRemoving = false,
  search,
  onSearchChange,
  onRemove,
}: MaterialProductionListProps) {
  const [selected, setSelected] = useState<MaterialProductionRun | null>(null);
  const [deleteRun, setDeleteRun] = useState<MaterialProductionRun | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Factory className="h-7 w-7 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold">Production</h1>
            <p className="text-sm text-muted-foreground">
              Raw materials used and Self Feed products produced
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={newHref}>
            <Plus className="mr-1 h-4 w-4" />
            Add Production
          </Link>
        </Button>
      </div>

      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search product, reference, or notes"
        className="max-w-md"
      />

      {isLoading ? (
        <p className="py-8 text-center text-muted-foreground">Loading...</p>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No production runs yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <Card key={run.id}>
              <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                <button
                  type="button"
                  className="min-w-0 space-y-1 text-left"
                  onClick={() => setSelected(run)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <DateDisplay date={run.date} />
                    {run.referenceNumber && (
                      <Badge variant="outline">{run.referenceNumber}</Badge>
                    )}
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Used:</span>{" "}
                    {summary(run.inputs)}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Made:</span>{" "}
                    {summary(run.outputs)}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start text-red-500 md:self-center"
                  onClick={() => setDeleteRun(run)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Reverse
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Production Details"
      >
        <ModalContent>
          {selected && (
            <div className="space-y-4 text-sm">
              <div>
                <strong>Date:</strong> <DateDisplay date={selected.date} />
              </div>
              {selected.referenceNumber && (
                <div>
                  <strong>Reference:</strong> {selected.referenceNumber}
                </div>
              )}
              <div>
                <strong>Inputs</strong>
                {selected.inputs.map((item) => (
                  <div key={item.id} className="mt-1 flex justify-between gap-4">
                    <span>
                      {item.inventoryItem.name} · {Number(item.quantity)}{" "}
                      {item.inventoryItem.unit}
                    </span>
                    <span>Rs. {Number(item.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div>
                <strong>Outputs</strong>
                {selected.outputs.map((item) => (
                  <div key={item.id} className="mt-1 flex justify-between gap-4">
                    <span>
                      {item.product.name} · {Number(item.quantity)}{" "}
                      {item.product.unit} · {Number(item.costAllocationPercent)}%
                    </span>
                    <span>Rs. {Number(item.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {selected.notes && (
                <div>
                  <strong>Notes:</strong> {selected.notes}
                </div>
              )}
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setSelected(null)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={!!deleteRun}
        onClose={() => setDeleteRun(null)}
        title="Reverse Production"
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground">
            This restores all raw materials and removes the produced lots. It is
            only allowed when none of the output has been used or adjusted.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteRun(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isRemoving}
            onClick={async () => {
              if (!deleteRun) return;
              try {
                await onRemove(deleteRun);
                setDeleteRun(null);
              } catch {
                // The page-level handler displays the API error and the dialog
                // remains open so the user can review the reversal constraint.
              }
            }}
          >
            {isRemoving ? "Reversing..." : "Reverse Production"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
