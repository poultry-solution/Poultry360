"use client";

import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { DateInput } from "@/common/components/ui/date-input";
import { useState, useEffect } from "react";

interface QuickReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    type: string;
    dueDate: string;
    isRecurring?: boolean;
    recurrencePattern?: string;
    recurrenceInterval?: number;
    farmId?: string;
    batchId?: string;
  }) => Promise<void>;
  farms: any[];
  activeBatches: any[];
  isLoading: boolean;
}

export function QuickReminderModal({
  isOpen,
  onClose,
  onSubmit,
  farms,
  activeBatches,
  isLoading,
}: QuickReminderModalProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "GENERAL",
    dueDate: "",
    time: "",
    isRecurring: false,
    recurrencePattern: "DAILY",
    recurrenceInterval: 1,
    farmId: "",
    batchId: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split("T")[0];
      setForm({
        title: "",
        description: "",
        type: "GENERAL",
        dueDate: today,
        time: "09:00",
        isRecurring: false,
        recurrencePattern: "DAILY",
        recurrenceInterval: 1,
        farmId: "",
        batchId: "",
      });
      setErrors({});
    }
  }, [isOpen]);

  // Filter batches based on selected farm
  const filteredBatches = form.farmId
    ? activeBatches.filter((batch) => batch.farmId === form.farmId)
    : activeBatches;

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!form.dueDate) {
      newErrors.dueDate = "Date is required";
    }
    if (!form.time) {
      newErrors.time = "Time is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // DateInput returns ISO string, extract date part and combine with time
      const datePart = form.dueDate.includes("T") 
        ? form.dueDate.split("T")[0] 
        : form.dueDate;
      
      // Combine date and time into ISO datetime string
      const dueDate = new Date(
        `${datePart}T${form.time}:00.000Z`
      ).toISOString();

      await onSubmit({
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        dueDate,
        isRecurring: form.isRecurring,
        recurrencePattern: form.isRecurring ? form.recurrencePattern : undefined,
        recurrenceInterval: form.isRecurring ? form.recurrenceInterval : undefined,
        farmId: form.farmId || undefined,
        batchId: form.batchId || undefined,
      });

      onClose();
    } catch (error) {
      console.error("Failed to create reminder:", error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Reminder">
      <ModalContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="reminder-title">Title *</Label>
            <Input
              id="reminder-title"
              value={form.title}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value });
                if (errors.title) setErrors({ ...errors, title: "" });
              }}
              placeholder="E.g., Feed morning batch"
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <Label htmlFor="reminder-description">Description</Label>
            <textarea
              id="reminder-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Additional details..."
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reminder-type">Type</Label>
              <select
                id="reminder-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="GENERAL">General</option>
                <option value="VACCINATION">Vaccination</option>
                <option value="FEEDING">Feeding</option>
                <option value="MEDICATION">Medication</option>
                <option value="CLEANING">Cleaning</option>
                <option value="WEIGHING">Weighing</option>
                <option value="SUPPLIER_PAYMENT">Supplier Payment</option>
                <option value="CUSTOMER_PAYMENT">Customer Payment</option>
              </select>
            </div>

            <div>
              <Label htmlFor="reminder-time">Time *</Label>
              <Input
                id="reminder-time"
                type="time"
                value={form.time}
                onChange={(e) => {
                  setForm({ ...form, time: e.target.value });
                  if (errors.time) setErrors({ ...errors, time: "" });
                }}
                className={errors.time ? "border-red-500" : ""}
              />
              {errors.time && (
                <p className="text-xs text-red-500 mt-1">{errors.time}</p>
              )}
            </div>
          </div>

          <div>
            <DateInput
              label="Due Date *"
              value={form.dueDate}
              onChange={(value) => {
                setForm({ ...form, dueDate: value });
                if (errors.dueDate) setErrors({ ...errors, dueDate: "" });
              }}
            />
            {errors.dueDate && (
              <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reminder-farm">Farm (Optional)</Label>
              <select
                id="reminder-farm"
                value={form.farmId}
                onChange={(e) => {
                  setForm({ ...form, farmId: e.target.value, batchId: "" });
                }}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Farm</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="reminder-batch">Batch (Optional)</Label>
              <select
                id="reminder-batch"
                value={form.batchId}
                onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                disabled={!form.farmId}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select Batch</option>
                {filteredBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="reminder-recurring"
              checked={form.isRecurring}
              onChange={(e) =>
                setForm({ ...form, isRecurring: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded"
            />
            <Label htmlFor="reminder-recurring" className="cursor-pointer">
              Recurring reminder
            </Label>
          </div>

          {form.isRecurring && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reminder-pattern">Pattern</Label>
                <select
                  id="reminder-pattern"
                  value={form.recurrencePattern}
                  onChange={(e) =>
                    setForm({ ...form, recurrencePattern: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div>
                <Label htmlFor="reminder-interval">Interval</Label>
                <Input
                  id="reminder-interval"
                  type="number"
                  min={1}
                  value={form.recurrenceInterval}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      recurrenceInterval: Number(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      </ModalContent>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !form.title || !form.dueDate || !form.time}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? "Creating..." : "Create Reminder"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

