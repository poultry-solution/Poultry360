"use client";

import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Loader2 } from "lucide-react";
import { DateInput } from "@/common/components/ui/date-input";

interface MortalityFormState {
  date: string;
  count: string;
  reason: string;
  farmId?: string;
  batchId?: string;
}

interface MortalityStats {
  currentBirds: number;
  totalMortality: number;
}

interface MortalityModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Context props (optional)
  prefilledBatchId?: string;
  prefilledFarmId?: string;

  // Selection data (required only if no prefilled context)
  farms?: any[];
  activeBatches?: any[];

  // Form state
  editingMortalityId: string | null;
  mortalityForm: MortalityFormState;
  mortalityErrors: Record<string, string>;
  stats?: MortalityStats;

  // Handlers
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onFieldUpdate: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

  // Loading
  isPending: boolean;
}

export function MortalityModal({
  isOpen,
  onClose,
  prefilledBatchId,
  prefilledFarmId,
  farms,
  activeBatches,
  editingMortalityId,
  mortalityForm,
  mortalityErrors,
  stats,
  onSubmit,
  onFieldUpdate,
  isPending,
}: MortalityModalProps) {
  const showBatchSelector = !prefilledBatchId;
  const showFarmSelector = !prefilledFarmId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingMortalityId ? "Edit Mortality Record" : "Add Mortality Record"
      }
    >
      <form onSubmit={onSubmit}>
        <ModalContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>Note:</strong> Record only natural deaths and
                disease-related losses here. Birds sold are automatically
                tracked in the Sales section.
              </p>
            </div>

            {/* Farm Selector - only show if no prefilled farm */}
            {showFarmSelector && (
              <div>
                <Label htmlFor="farmId">Farm</Label>
                <select
                  id="farmId"
                  name="farmId"
                  value={mortalityForm.farmId || ""}
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
                {mortalityErrors.farmId && (
                  <p className="text-xs text-red-600 mt-1">
                    {mortalityErrors.farmId}
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
                  value={mortalityForm.batchId || ""}
                  onChange={onFieldUpdate}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="">Select batch</option>
                  {activeBatches?.map((batch: any) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchNumber ?? batch.number} - {batch.farm?.name}
                    </option>
                  ))}
                </select>
                {mortalityErrors.batchId && (
                  <p className="text-xs text-red-600 mt-1">
                    {mortalityErrors.batchId}
                  </p>
                )}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <DateInput
                  label="Date"
                  value={mortalityForm.date}
                  onChange={(value) => onFieldUpdate({ target: { name: 'date', value } } as React.ChangeEvent<HTMLInputElement>)}
                />
                {mortalityErrors.date && (
                  <p className="text-xs text-red-600 mt-1">
                    {mortalityErrors.date}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="mortalityCount">Number of Birds</Label>
                <Input
                  id="mortalityCount"
                  name="count"
                  type="number"
                  min="1"
                  value={mortalityForm.count}
                  onChange={onFieldUpdate}
                  placeholder="Enter count"
                  required
                />
                {mortalityErrors.count && (
                  <p className="text-xs text-red-600 mt-1">
                    {mortalityErrors.count}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="mortalityReason">Reason (Optional)</Label>
              <textarea
                id="mortalityReason"
                name="reason"
                value={mortalityForm.reason}
                onChange={onFieldUpdate}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={3}
                placeholder="e.g., Disease, Heat stress, Predator attack, etc."
              />
            </div>

            {stats && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-medium text-sm mb-2">Current Status</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600">Current Birds:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {stats.currentBirds}
                    </span>
                    <span className="ml-1 text-xs text-gray-500">
                      (after all losses)
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Natural Deaths:</span>
                    <span className="ml-2 font-medium text-red-600">
                      {stats.totalMortality}
                    </span>
                    <span className="ml-1 text-xs text-gray-500">
                      (excluding sales)
                    </span>
                  </div>
                </div>
              </div>
            )}
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
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {editingMortalityId ? "Updating..." : "Creating..."}
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
