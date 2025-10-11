"use client";

import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";

interface LedgerFormState {
  name: string;
  contact: string;
  category: "Chicken" | "Other";
  sales: string;
  received: string;
}

interface LedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Form state
  editingLedgerId: number | null;
  ledgerForm: LedgerFormState;
  ledgerErrors: Record<string, string>;
  
  // Handlers
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onFieldUpdate: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export function LedgerModal({
  isOpen,
  onClose,
  editingLedgerId,
  ledgerForm,
  ledgerErrors,
  onSubmit,
  onFieldUpdate,
}: LedgerModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLedgerId ? "Edit Ledger Entry" : "Add Ledger Entry"}
    >
      <form onSubmit={onSubmit}>
        <ModalContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Customer Name</Label>
              <Input
                id="name"
                name="name"
                value={ledgerForm.name}
                onChange={onFieldUpdate}
                required
              />
              {ledgerErrors.name && (
                <p className="text-xs text-red-600 mt-1">
                  {ledgerErrors.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="contact">Contact</Label>
              <Input
                id="contact"
                name="contact"
                value={ledgerForm.contact}
                onChange={onFieldUpdate}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                value={ledgerForm.category}
                onChange={onFieldUpdate}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                <option value="Chicken">Chicken</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="sales">Sales</Label>
              <Input
                id="sales"
                name="sales"
                type="number"
                value={ledgerForm.sales}
                onChange={onFieldUpdate}
              />
            </div>
            <div>
              <Label htmlFor="received">Received</Label>
              <Input
                id="received"
                name="received"
                type="number"
                value={ledgerForm.received}
                onChange={onFieldUpdate}
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
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            Save
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
