"use client";

import { Modal } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Plus } from "lucide-react";

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminderForm: {
    title: string;
    date: string;
    time: string;
    type: string;
  };
  onFormChange: (field: string, value: string) => void;
  onSubmit: () => void;
}

export function AddReminderModal({
  isOpen,
  onClose,
  reminderForm,
  onFormChange,
  onSubmit,
}: AddReminderModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Reminder"
    >
      <div className="space-y-5">
        <div>
          <Label htmlFor="reminderTitle" className="text-sm font-medium text-slate-700">
            Reminder Title
          </Label>
          <Input
            id="reminderTitle"
            value={reminderForm.title}
            onChange={(e) => onFormChange("title", e.target.value)}
            placeholder="Enter reminder title"
            className="mt-2 rounded-xl border-slate-300 focus:border-primary focus:ring-primary"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reminderDate" className="text-sm font-medium text-slate-700">
              Date
            </Label>
            <Input
              id="reminderDate"
              type="date"
              value={reminderForm.date}
              onChange={(e) => onFormChange("date", e.target.value)}
              className="mt-2 rounded-xl border-slate-300 focus:border-primary focus:ring-primary"
            />
          </div>
          <div>
            <Label htmlFor="reminderTime" className="text-sm font-medium text-slate-700">
              Time
            </Label>
            <Input
              id="reminderTime"
              type="time"
              value={reminderForm.time}
              onChange={(e) => onFormChange("time", e.target.value)}
              className="mt-2 rounded-xl border-slate-300 focus:border-primary focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="reminderType" className="text-sm font-medium text-slate-700">
            Reminder Type
          </Label>
          <select
            id="reminderType"
            value={reminderForm.type}
            onChange={(e) => onFormChange("type", e.target.value)}
            className="mt-2 w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          >
            <option value="Consultation Reminder">
              Consultation Reminder
            </option>
            <option value="Follow-up Reminder">Follow-up Reminder</option>
            <option value="Medical Reminder">Medical Reminder</option>
            <option value="Appointment Reminder">
              Appointment Reminder
            </option>
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-2"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            className="bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/30 rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Reminder
          </Button>
        </div>
      </div>
    </Modal>
  );
}
