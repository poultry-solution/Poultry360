"use client";

import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface MoneyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  isLoading: boolean;
  data: any;
  type: 'receive' | 'pay';
}

export function MoneyDetailsModal({
  isOpen,
  onClose,
  title,
  icon,
  isLoading,
  data,
  type,
}: MoneyDetailsModalProps) {
  const isReceive = type === 'receive';
  const items = isReceive ? data?.customers : data?.suppliers;
  const itemKey = isReceive ? 'customerId' : 'supplierId';
  const itemNameKey = isReceive ? 'customerName' : 'supplierName';
  const itemPhoneKey = isReceive ? 'customerPhone' : 'supplierContact';
  const amountKey = isReceive ? 'totalDueAmount' : 'outstandingAmount';
  const countKey = isReceive ? 'salesCount' : 'totalTransactions';
  const detailsKey = isReceive ? 'sales' : 'recentTransactions';
  const loadingText = isReceive ? 'Loading customer details...' : 'Loading supplier details...';
  const emptyText = isReceive ? 'No outstanding amounts to receive' : 'No outstanding amounts to pay';
  const footerText = isReceive 
    ? `Showing ${items?.length || 0} customers with outstanding payments`
    : `Showing ${items?.length || 0} suppliers with outstanding payments`;

  const renderReceiveTable = () => (
    <table className="w-full border-collapse border border-gray-300">
      <thead className="sticky top-0 z-10">
        <tr className="bg-gray-100">
          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">
            Customer Name
          </th>
          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">
            Phone
          </th>
          <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-sm">
            Due Amount
          </th>
          <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm">
            Sales
          </th>
          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">
            Recent Sales
          </th>
        </tr>
      </thead>
      <tbody>
        {items?.map((item: any, index: number) => (
          <tr
            key={item[itemKey]}
            className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
          >
            <td className="border border-gray-300 px-3 py-2 font-medium text-sm">
              {item[itemNameKey]}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-gray-600 text-sm">
              {item[itemPhoneKey]}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-right font-bold text-green-600 text-sm">
              ₹{Number(item[amountKey]).toLocaleString()}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-center text-sm">
              {item[countKey]}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-sm">
              <div className="space-y-1 max-w-xs">
                {item[detailsKey]?.slice(0, 2).map((detail: any) => (
                  <div key={detail.saleId || detail.transactionId} className="text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-medium truncate">
                        {detail.categoryName || detail.type}
                        {detail.itemName && (
                          <span className="text-gray-500"> - {detail.itemName}</span>
                        )}
                      </span>
                      <span className="font-semibold text-green-600">
                        ₹{Number(detail.dueAmount || detail.amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-gray-500 truncate">
                      {detail.farmName && `${detail.farmName} • `}
                      {new Date(detail.date).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                ))}
                {item[detailsKey]?.length > 2 && (
                  <div className="text-xs text-gray-500 text-center py-1 bg-gray-100 rounded">
                    +{item[detailsKey].length - 2} more
                  </div>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderPayTable = () => (
    <table className="w-full border-collapse border border-gray-300">
      <thead className="sticky top-0 z-10">
        <tr className="bg-gray-100">
          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">
            Supplier Name
          </th>
          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">
            Contact
          </th>
          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">
            Address
          </th>
          <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-sm">
            Outstanding
          </th>
          <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm">
            Trans.
          </th>
          <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">
            Recent Transactions
          </th>
        </tr>
      </thead>
      <tbody>
        {items?.map((item: any, index: number) => (
          <tr
            key={item[itemKey]}
            className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
          >
            <td className="border border-gray-300 px-3 py-2 font-medium text-sm">
              <div className="flex items-center gap-2">
                <span>{item[itemNameKey]}</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {item.supplierType}
                </span>
              </div>
            </td>
            <td className="border border-gray-300 px-3 py-2 text-gray-600 text-sm">
              {item[itemPhoneKey]}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs max-w-32 truncate">
              {item.supplierAddress || "-"}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-right font-bold text-red-600 text-sm">
              ₹{Number(item[amountKey]).toLocaleString()}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-center text-sm">
              {item[countKey]}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-sm">
              <div className="space-y-1 max-w-xs">
                {item[detailsKey]?.slice(0, 2).map((detail: any) => (
                  <div key={detail.transactionId} className="text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-medium truncate">
                        {detail.type}
                        {detail.itemName && (
                          <span className="text-gray-500"> - {detail.itemName}</span>
                        )}
                      </span>
                      <span className="font-semibold text-red-600">
                        ₹{Number(detail.amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-gray-500 truncate">
                      {new Date(detail.date).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                ))}
                {item[detailsKey]?.length > 2 && (
                  <div className="text-xs text-gray-500 text-center py-1 bg-gray-100 rounded">
                    +{item[detailsKey].length - 2} more
                  </div>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${icon} ${title}`}
      className="max-w-4xl"
    >
      <ModalContent className="max-h-[80vh] overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>{loadingText}</p>
          </div>
        ) : items && items.length > 0 ? (
          <>
            {/* Table Container with Fixed Header */}
            <div className="flex-1 overflow-auto">
              <div className="min-w-full">
                {isReceive ? renderReceiveTable() : renderPayTable()}
              </div>
            </div>

            {/* Footer with Total Count */}
            <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-sm text-gray-600">
              {footerText}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>{emptyText}</p>
          </div>
        )}
      </ModalContent>
      <ModalFooter>
        <Button
          variant="outline"
          onClick={onClose}
          className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
        >
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
