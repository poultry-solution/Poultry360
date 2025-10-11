"use client";

import { useState, useEffect } from "react";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface QuickMortalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  farms: any[];
  activeBatches: any[];
  isLoading: boolean;
}

export function QuickMortalityModal({
  isOpen,
  onClose,
  onSubmit,
  farms,
  activeBatches,
  isLoading,
}: QuickMortalityModalProps) {
  const [form, setForm] = useState({
    farmId: "",
    batchId: "",
    date: new Date().toISOString().split("T")[0],
    count: "",
    reason: "Natural Death",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Ensure default date when modal opens
  useEffect(() => {
    if (isOpen && !form.date) {
      const today = new Date().toISOString().split("T")[0];
      setForm((p) => ({ ...p, date: today }));
    }
  }, [isOpen, form.date]);

  const updateField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));

    // If farm is changed, reset batch selection
    if (name === "farmId") {
      setForm((p) => ({ ...p, batchId: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const validationErrors: Record<string, string> = {};
    if (!form.farmId) validationErrors.farmId = "Please select a farm";
    if (!form.batchId) validationErrors.batchId = "Please select a batch";
    if (!form.count) validationErrors.count = "Please enter count";
    if (!form.date) validationErrors.date = "Please select a date";

    const count = Number(form.count || 0);
    if (count <= 0) validationErrors.count = "Count must be greater than 0";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const mortalityData = {
        date: form.date ? new Date(form.date) : new Date(),
        count: count,
        reason: form.reason || "Natural Death",
        batchId: form.batchId,
      };

      await onSubmit(mortalityData);

      // Reset form but keep farm and batch for smart persistence
      setForm({
        farmId: form.farmId, // Keep farm for smart persistence
        batchId: form.batchId, // Keep batch for smart persistence
        date: new Date().toISOString().split("T")[0],
        count: "",
        reason: "Natural Death",
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Failed to create mortality:", error);
      setErrors({
        general: "Failed to create mortality record. Please try again.",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setErrors({});
      }}
      title="Quick Add Mortality"
    >
      <form onSubmit={handleSubmit}>
        <ModalContent>
          <div className="space-y-4">
            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            {/* Smart persistence info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                💡 <strong>Smart Form:</strong> Farm and batch selections are
                remembered for your next mortality record to save time!
              </p>
            </div>

            {/* Farm Selection */}
            <div>
              <Label htmlFor="mortalityFarmId">Select Farm *</Label>
              <select
                id="mortalityFarmId"
                name="farmId"
                value={form.farmId}
                onChange={updateField}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                required
              >
                <option value="">Choose a farm</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
              {errors.farmId && (
                <p className="text-xs text-red-600 mt-1">{errors.farmId}</p>
              )}
            </div>

            {/* Batch Selection */}
            <div>
              <Label htmlFor="mortalityBatchId">Select Batch *</Label>
              <select
                id="mortalityBatchId"
                name="batchId"
                value={form.batchId}
                onChange={updateField}
                disabled={!form.farmId}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                required
              >
                <option value="">Choose a batch</option>
                {activeBatches
                  .filter(
                    (batch) =>
                      batch.status === "ACTIVE" &&
                      (!form.farmId || batch.farmId === form.farmId)
                  )
                  .map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchNumber} - {batch.farm.name}
                    </option>
                  ))}
              </select>
              {errors.batchId && (
                <p className="text-xs text-red-600 mt-1">{errors.batchId}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mortalityDate">Date *</Label>
                <Input
                  id="mortalityDate"
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={updateField}
                  required
                />
                {errors.date && (
                  <p className="text-xs text-red-600 mt-1">{errors.date}</p>
                )}
              </div>

              <div>
                <Label htmlFor="mortalityCount">Number of Birds *</Label>
                <Input
                  id="mortalityCount"
                  name="count"
                  type="number"
                  min="1"
                  value={form.count}
                  onChange={updateField}
                  placeholder="Enter count"
                  required
                />
                {errors.count && (
                  <p className="text-xs text-red-600 mt-1">{errors.count}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="mortalityReason">Reason (Optional)</Label>
              <textarea
                id="mortalityReason"
                name="reason"
                value={form.reason}
                onChange={updateField}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={3}
                placeholder="e.g., Disease, Heat stress, Predator attack, etc."
              />
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>Note:</strong> Record only natural deaths and
                disease-related losses here. Birds sold are automatically
                tracked in the Sales section.
              </p>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              setErrors({});
            }}
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="cursor-pointer bg-red-600 hover:bg-red-700 hover:shadow-md transition-all duration-200 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Mortality"
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
