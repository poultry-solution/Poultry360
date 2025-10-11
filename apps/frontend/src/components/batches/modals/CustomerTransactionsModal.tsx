"use client";

import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { DateDisplay } from "@/components/ui/date-display";

interface CustomerTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomerForTransactions: any;
  batchSales: any[];
}

export function CustomerTransactionsModal({
  isOpen,
  onClose,
  selectedCustomerForTransactions,
  batchSales,
}: CustomerTransactionsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`All Transactions - ${selectedCustomerForTransactions?.name || "Customer"}`}
    >
      <ModalContent>
        {selectedCustomerForTransactions && (
          <div className="space-y-4">
            {/* Customer Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">
                Customer Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium">
                    {selectedCustomerForTransactions.name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <span className="ml-2 font-medium">
                    {selectedCustomerForTransactions.phone}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Total Sales:</span>
                  <span className="ml-2 font-medium">
                    ₹
                    {Number(
                      selectedCustomerForTransactions.sales
                    ).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Total Received:</span>
                  <span className="ml-2 font-medium text-green-600">
                    ₹
                    {Number(
                      selectedCustomerForTransactions.received
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Outstanding Balance:</span>
                  <span
                    className={`ml-2 font-bold ${
                      Number(selectedCustomerForTransactions.balance) > 0
                        ? "text-orange-600"
                        : "text-green-600"
                    }`}
                  >
                    ₹
                    {Number(
                      selectedCustomerForTransactions.balance
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* All Sales and Payments */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Sales & Payment History
              </h4>
              {(() => {
                const customerSales =
                  batchSales?.filter(
                    (sale: any) =>
                      sale.isCredit &&
                      sale.customerId === selectedCustomerForTransactions.id
                  ) || [];

                if (customerSales.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <p>No sales found for this customer</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {customerSales.map((sale: any, saleIndex: number) => (
                      <div
                        key={sale.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        {/* Sale Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {saleIndex + 1}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {sale.description} -{" "}
                                <DateDisplay date={sale.date} format="short" />
                              </div>
                              <div className="text-sm text-gray-600">
                                Total: ₹{Number(sale.amount).toLocaleString()}{" "}
                                | Paid: ₹
                                {Number(sale.paidAmount).toLocaleString()} |
                                Due: ₹
                                {Number(sale.dueAmount || 0).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Payments for this sale */}
                        {sale.payments && sale.payments.length > 0 ? (
                          <div className="ml-11 space-y-2">
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              Payments:
                            </div>
                            {sale.payments.map(
                              (payment: any, paymentIndex: number) => (
                                <div
                                  key={payment.id}
                                  className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded"
                                >
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                      <span className="text-green-600 font-semibold text-xs">
                                        {paymentIndex + 1}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        ₹
                                        {Number(
                                          payment.amount
                                        ).toLocaleString()}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        <DateDisplay date={payment.date} format="short" />
                                        {payment.description &&
                                          ` - ${payment.description}`}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    <DateDisplay date={payment.createdAt} format="short" />
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="ml-11 text-sm text-gray-500">
                            No payments recorded for this sale
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
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
