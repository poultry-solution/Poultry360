"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Badge } from "@/common/components/ui/badge";

export interface ConsignmentItem {
  id: string;
  quantity: number;
  acceptedQuantity?: number | null;
  receivedQuantity?: number | null;
  unitPrice: number;
  totalAmount: number;
  companyProduct?: {
    id: string;
    name: string;
    type?: string;
    unit?: string;
  } | null;
  dealerProduct?: {
    id: string;
    name: string;
  } | null;
}

interface ConsignmentItemsTableProps {
  items: ConsignmentItem[];
  showComparison?: boolean;
}

export function ConsignmentItemsTable({
  items,
  showComparison = true,
}: ConsignmentItemsTableProps) {
  const formatCurrency = (amount: number | string | null | undefined) => {
    const num = typeof amount === "string" ? parseFloat(amount) : (amount || 0);
    if (isNaN(num)) return "रू 0.00";
    return `रू ${num.toFixed(2)}`;
  };

  const getProductName = (item: ConsignmentItem) => {
    return item.companyProduct?.name || item.dealerProduct?.name || "Unknown Product";
  };

  const getQuantityStatus = (item: ConsignmentItem) => {
    if (!showComparison) return null;

    const requested = Number(item.quantity || 0);
    const approved = Number(item.acceptedQuantity || 0);
    const received = Number(item.receivedQuantity || 0);

    if (received > 0 && received === approved && approved === requested) {
      return <Badge variant="default" className="bg-green-600">Complete</Badge>;
    }
    if (received > 0 && received < approved) {
      return <Badge variant="default" className="bg-yellow-600">Partial</Badge>;
    }
    if (approved > 0 && approved < requested) {
      return <Badge variant="default" className="bg-blue-600">Partially Approved</Badge>;
    }
    if (approved === 0 && requested > 0) {
      return <Badge variant="secondary">Pending</Badge>;
    }
    return null;
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            {showComparison && <TableHead className="text-right">Requested</TableHead>}
            {showComparison && <TableHead className="text-right">Approved</TableHead>}
            {showComparison && <TableHead className="text-right">Received</TableHead>}
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            {showComparison && <TableHead>Status</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showComparison ? 7 : 3} className="text-center py-8">
                <p className="text-muted-foreground">No items found</p>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {getProductName(item)}
                </TableCell>
                {showComparison && (
                  <TableCell className="text-right">
                    {item.quantity}
                  </TableCell>
                )}
                {showComparison && (
                  <TableCell className="text-right">
                    {item.acceptedQuantity !== null && item.acceptedQuantity !== undefined
                      ? item.acceptedQuantity
                      : "-"}
                  </TableCell>
                )}
                {showComparison && (
                  <TableCell className="text-right">
                    {item.receivedQuantity !== null && item.receivedQuantity !== undefined
                      ? item.receivedQuantity
                      : "-"}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  {formatCurrency(item.unitPrice)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.totalAmount)}
                </TableCell>
                {showComparison && (
                  <TableCell>{getQuantityStatus(item)}</TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

