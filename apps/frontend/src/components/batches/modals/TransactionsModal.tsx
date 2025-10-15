"use client";

import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import { DateDisplay } from "@/common/components/ui/date-display";

interface TransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSale: any;
}

export function TransactionsModal({
  isOpen,
  onClose,
  selectedSale,
}: TransactionsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Payment History - ${selectedSale?.description || "Sale"}`}
    >
      <ModalContent>
        {selectedSale && (
          <div className="space-y-4">
            {/* Sale Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">
                Sale Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Date:</span>
                  <span className="ml-2 font-medium">
                    <DateDisplay date={selectedSale.date} format="short" />
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <span className="ml-2 font-medium">
                    ₹{Number(selectedSale.amount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Paid:</span>
                  <span className="ml-2 font-medium text-green-600">
                    ₹{Number(selectedSale.paidAmount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Due:</span>
                  <span className="ml-2 font-medium text-orange-600">
                    ₹{Number(selectedSale.dueAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Payment History
              </h4>
              {selectedSale.payments && selectedSale.payments.length > 0 ? (
                <div className="space-y-3">
                  {selectedSale.payments.map(
                    (payment: any, index: number) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-semibold text-sm">
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              ₹{Number(payment.amount).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              <DateDisplay date={payment.date} format="short" />
                            </div>
                            {payment.description && (
                              <div className="text-xs text-gray-500">
                                {payment.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            <DateDisplay date={payment.createdAt} format="short" />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No payments recorded yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </ModalContent>
      <ModalFooter>
        <Button
          variant="outline"
          onClick={onClose}
        >
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
