"use client";

import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Loader2 } from "lucide-react";
import { DateInput } from "@/common/components/ui/date-input";

interface PaymentFormState {
  amount: string;
  date: string;
  description: string;
  reference: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Customer data
  selectedCustomer: any;
  
  // Form state
  paymentForm: PaymentFormState;
  paymentErrors: Record<string, string>;
  
  // Handlers
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onFieldUpdate: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  
  // Loading
  isPending: boolean;
}

export function PaymentModal({
  isOpen,
  onClose,
  selectedCustomer,
  paymentForm,
  paymentErrors,
  onSubmit,
  onFieldUpdate,
  isPending,
}: PaymentModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Payment - ${selectedCustomer?.name || ""}`}
    >
      <form onSubmit={onSubmit}>
        <ModalContent>
          <div className="space-y-4">
            {selectedCustomer && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-800">
                    Outstanding Balance:
                  </span>
                  <span className="text-lg font-bold text-orange-900">
                    ₹{selectedCustomer.balance.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={paymentForm.amount}
                onChange={onFieldUpdate}
                placeholder="Enter payment amount"
                required
              />
              {paymentErrors.amount && (
                <p className="text-xs text-red-600 mt-1">
                  {paymentErrors.amount}
                </p>
              )}
            </div>

            <div>
              <DateInput
                label="Payment Date"
                value={paymentForm.date}
                onChange={(value) => onFieldUpdate({ target: { name: 'date', value } } as React.ChangeEvent<HTMLInputElement>)}
              />
              {paymentErrors.date && (
                <p className="text-xs text-red-600 mt-1">
                  {paymentErrors.date}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={paymentForm.description}
                onChange={onFieldUpdate}
                placeholder="Payment description"
              />
            </div>

            <div>
              <Label htmlFor="reference">Reference/Receipt No.</Label>
              <Input
                id="reference"
                name="reference"
                value={paymentForm.reference}
                onChange={onFieldUpdate}
                placeholder="Receipt number or reference"
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
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              "Record Payment"
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
