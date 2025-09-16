export interface ItemCategory {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  unit: string; // e.g., pcs, kg, liter
  price: number;
  stockQty: number;
  reorderLevel?: number;
  taxRate?: number; // percent
  isActive: boolean;
}

export interface Party {
  id: string;
  type: 'customer' | 'supplier';
  name: string;
  phone?: string;
  address?: string;
  openingBalance?: number;
  balance: number;
}

export interface PaymentLine {
  mode: 'cash' | 'upi' | 'bank' | 'card';
  amount: number;
  reference?: string;
}

export interface SaleLine {
  itemId: string;
  qty: number;
  rate: number;
  discount?: number; // percent
  tax?: number; // percent
}

export interface Sale {
  id: string;
  date: string; // yyyy-mm-dd
  partyId?: string; // customer optional
  lines: SaleLine[];
  totalAmount: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  payments: PaymentLine[];
  due: number;
}

export interface PurchaseLine extends SaleLine {}

export interface Purchase {
  id: string;
  date: string;
  partyId: string; // supplier
  lines: PurchaseLine[];
  totalAmount: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  payments: PaymentLine[];
  due: number;
}

export interface LedgerEntry {
  id: string;
  date: string;
  ref?: string;
  description: string;
  debit: number;
  credit: number;
  balanceAfter: number;
}

