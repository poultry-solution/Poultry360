"use client";

import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Loader2 } from "lucide-react";
import { DateInput } from "@/common/components/ui/date-input";

interface WeightFormState {
  date: string;
  avgWeight: string;
  sampleCount: string;
  notes: string;
  farmId?: string;
  batchId?: string;
}

interface WeightModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Context props (optional)
  prefilledBatchId?: string;
  prefilledFarmId?: string;

  // Selection data (required only if no prefilled context)
  farms?: any[];
  activeBatches?: any[];

  // Form state
  weightForm: WeightFormState;
  weightErrors: Record<string, string>;

  // Handlers
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onFieldUpdate: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

  // Loading
  isPending: boolean;
}

export function WeightModal({
  isOpen,
  onClose,
  prefilledBatchId,
  prefilledFarmId,
  farms,
  activeBatches,
  weightForm,
  weightErrors,
  onSubmit,
  onFieldUpdate,
  isPending,
}: WeightModalProps) {
  const showBatchSelector = !prefilledBatchId;
  const showFarmSelector = !prefilledFarmId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Weight"
    >
      <form onSubmit={onSubmit}>
        <ModalContent>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Farm Selector - only show if no prefilled farm */}
            {showFarmSelector && (
              <div>
                <Label htmlFor="farmId">Farm</Label>
                <select
                  id="farmId"
                  name="farmId"
                  value={weightForm.farmId || ""}
                  onChange={onFieldUpdate}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="">Select farm</option>
                  {farms?.map((farm: any) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
                {weightErrors.farmId && (
                  <p className="text-xs text-red-600 mt-1">
                    {weightErrors.farmId}
                  </p>
                )}
              </div>
            )}

            {/* Batch Selector - only show if no prefilled batch */}
            {showBatchSelector && (
              <div>
                <Label htmlFor="batchId">Batch</Label>
                <select
                  id="batchId"
                  name="batchId"
                  value={weightForm.batchId || ""}
                  onChange={onFieldUpdate}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="">Select batch</option>
                  {activeBatches?.map((batch: any) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.number} - {batch.farm?.name}
                    </option>
                  ))}
                </select>
                {weightErrors.batchId && (
                  <p className="text-xs text-red-600 mt-1">
                    {weightErrors.batchId}
                  </p>
                )}
              </div>
            )}

            <div>
              <DateInput
                label="Date"
                value={weightForm.date}
                onChange={(value) => onFieldUpdate({ target: { name: 'date', value } } as React.ChangeEvent<HTMLInputElement>)}
              />
              {weightErrors.date && (
                <p className="text-xs text-red-600 mt-1">
                  {weightErrors.date}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="avgWeight">Average Weight (kg)</Label>
              <Input
                id="avgWeight"
                name="avgWeight"
                type="number"
                step="0.01"
                min="0.01"
                value={weightForm.avgWeight}
                onChange={onFieldUpdate}
                placeholder="e.g., 1.75"
                required
              />
              {weightErrors.avgWeight && (
                <p className="text-xs text-red-600 mt-1">
                  {weightErrors.avgWeight}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="sampleCount">Birds Weighed</Label>
              <Input
                id="sampleCount"
                name="sampleCount"
                type="number"
                min="1"
                value={weightForm.sampleCount}
                onChange={onFieldUpdate}
                placeholder="e.g., 50"
                required
              />
              {weightErrors.sampleCount && (
                <p className="text-xs text-red-600 mt-1">
                  {weightErrors.sampleCount}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                name="notes"
                value={weightForm.notes}
                onChange={onFieldUpdate}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={3}
                placeholder="Feed change, disease, etc."
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
