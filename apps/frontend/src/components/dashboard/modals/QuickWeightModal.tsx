"use client";

import { useState, useEffect } from "react";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Loader2 } from "lucide-react";
import { DateInput } from "@/common/components/ui/date-input";

interface QuickWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  farms: any[];
  activeBatches: any[];
  isLoading: boolean;
}

export function QuickWeightModal({
  isOpen,
  onClose,
  onSubmit,
  farms,
  activeBatches,
  isLoading,
}: QuickWeightModalProps) {
  const [form, setForm] = useState({
    farmId: "",
    batchId: "",
    date: new Date().toISOString().split("T")[0],
    avgWeight: "",
    sampleCount: "",
    notes: "",
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

  const validateForm = (): boolean => {
    const validationErrors: Record<string, string> = {};
    
    if (!form.farmId) validationErrors.farmId = "Select a farm";
    if (!form.batchId) validationErrors.batchId = "Select a batch";
    if (!form.date) validationErrors.date = "Date required";
    if (!form.avgWeight || Number(form.avgWeight) <= 0)
      validationErrors.avgWeight = "Avg weight (kg) required";
    if (!form.sampleCount || Number(form.sampleCount) <= 0)
      validationErrors.sampleCount = "Sample count required";
    
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      const weightData = {
        date: `${form.date}T00:00:00.000Z`,
        avgWeight: Number(form.avgWeight),
        sampleCount: Number(form.sampleCount),
        notes: form.notes || undefined,
      };

      await onSubmit(weightData);

      // Reset form
      setForm({
        farmId: "",
        batchId: "",
        date: new Date().toISOString().split("T")[0],
        avgWeight: "",
        sampleCount: "",
        notes: "",
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Failed to record weight:", error);
      setErrors({
        general: "Failed to record weight. Please try again.",
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
      title="Quick Record Weight"
    >
      <form onSubmit={handleSubmit}>
        <ModalContent>
          <div className="space-y-4">
            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weightFarmId">Select Farm *</Label>
                <select
                  id="weightFarmId"
                  name="farmId"
                  value={form.farmId}
                  onChange={updateField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
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
              
              <div>
                <Label htmlFor="weightBatchId">Select Batch *</Label>
                <select
                  id="weightBatchId"
                  name="batchId"
                  value={form.batchId}
                  onChange={updateField}
                  disabled={!form.farmId}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
              
              <div>
                <DateInput
                  label="Date"
                  value={form.date}
                  onChange={(value) => setForm(prev => ({ ...prev, date: value }))}
                />
                {errors.date && (
                  <p className="text-xs text-red-600 mt-1">{errors.date}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="avgWeightHome">Average Weight (kg)</Label>
                <Input
                  id="avgWeightHome"
                  name="avgWeight"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.avgWeight}
                  onChange={updateField}
                />
                {errors.avgWeight && (
                  <p className="text-xs text-red-600 mt-1">{errors.avgWeight}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="sampleCountHome">Birds Weighed</Label>
                <Input
                  id="sampleCountHome"
                  name="sampleCount"
                  type="number"
                  min="1"
                  value={form.sampleCount}
                  onChange={updateField}
                />
                {errors.sampleCount && (
                  <p className="text-xs text-red-600 mt-1">{errors.sampleCount}</p>
                )}
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="notesHome">Notes (optional)</Label>
                <textarea
                  id="notesHome"
                  name="notes"
                  value={form.notes}
                  onChange={updateField}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={2}
                  placeholder="Feed change, disease, etc."
                />
              </div>
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
            className="bg-primary hover:bg-primary/90 hover:shadow-md transition-all duration-200"
            disabled={isLoading || !form.batchId}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
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
