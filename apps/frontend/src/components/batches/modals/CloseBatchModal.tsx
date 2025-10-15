"use client";

import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import { Label } from "@/common/components/ui/label";
import { Loader2, CheckCircle } from "lucide-react";
import { DateInput } from "@/common/components/ui/date-input";

interface CloseBatchFormState {
  endDate: string;
  finalNotes: string;
}

interface BatchAnalytics {
  currentChicks: number;
  daysActive: number;
  totalSales: number;
  totalExpenses: number;
  profit: number;
}

interface CloseBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Form state
  closeBatchForm: CloseBatchFormState;
  closeErrors: Record<string, string>;
  
  // Data
  batch: any;
  analytics?: BatchAnalytics;
  
  // Handlers
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onFieldUpdate: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  
  // Loading
  isPending: boolean;
}

export function CloseBatchModal({
  isOpen,
  onClose,
  closeBatchForm,
  closeErrors,
  batch,
  analytics,
  onSubmit,
  onFieldUpdate,
  isPending,
}: CloseBatchModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Close Batch"
    >
      <form onSubmit={onSubmit}>
        <ModalContent>
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-800">
                <strong>Closing this batch will:</strong>
              </p>
              <ul className="text-sm text-orange-700 mt-2 space-y-1 list-disc list-inside">
                <li>Set the batch status to COMPLETED</li>
                <li>Set the end date for the batch</li>
                <li>Generate a final summary report</li>
                <li>Create a notification with batch completion details</li>
              </ul>
            </div>

            <div>
              <DateInput
                label="End Date"
                value={closeBatchForm.endDate}
                onChange={(value) => onFieldUpdate({ target: { name: 'endDate', value } } as React.ChangeEvent<HTMLTextAreaElement>)}
              />
              {closeErrors.endDate && (
                <p className="text-xs text-red-600 mt-1">
                  {closeErrors.endDate}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="finalNotes">Final Notes (Optional)</Label>
              <textarea
                id="finalNotes"
                name="finalNotes"
                value={closeBatchForm.finalNotes}
                onChange={onFieldUpdate}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={3}
                placeholder="Add any final notes about this batch..."
              />
            </div>

            {analytics && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">
                  Current Batch Status
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    Initial Birds: {batch?.initialChicks?.toLocaleString()}
                  </div>
                  <div>
                    Current Birds: {analytics.currentChicks?.toLocaleString()}
                  </div>
                  <div>
                    Total Mortality:{" "}
                    {(batch?.initialChicks || 0) -
                      (analytics.currentChicks || 0)}
                  </div>
                  <div>Days Active: {analytics.daysActive}</div>
                  <div>
                    Total Sales: ₹{analytics.totalSales?.toLocaleString()}
                  </div>
                  <div>
                    Total Expenses: ₹
                    {analytics.totalExpenses?.toLocaleString()}
                  </div>
                  <div
                    className={`col-span-2 font-medium ${analytics.profit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    Net Profit: ₹{analytics.profit?.toLocaleString()}
                  </div>
                </div>
                {analytics.currentChicks > 0 && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <strong>Note:</strong> {analytics.currentChicks} remaining
                    birds will be recorded as mortality (batch closure) when
                    you close this batch.
                  </div>
                )}
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
            className="bg-orange-600 hover:bg-orange-700"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Closing Batch...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Close Batch
              </>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
