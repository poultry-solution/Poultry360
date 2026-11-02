export interface BulkRowBuyer {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
}

export interface BulkBroilerRow {
  id: string;
  buyerId: string;
  buyer: BulkRowBuyer | null;
  weightKg: number;
  broilerCount: number | null;
  ratePerKg: number;
  discountType: "PERCENT" | "FLAT";
  discountValue: number;
  paidAmount: number;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";
  notes: string;
  invoiceNumber: string;
  dateOverride: string | null;
}

export interface BulkBroilerRowDerived {
  subtotal: number;
  discountAmount: number;
  lineTotal: number;
  dueAmount: number;
  errors: string[];
}

export type SaveStatusState = "pending" | "saving" | "saved" | "failed";

export interface SaveStatus {
  rowId: string;
  state: SaveStatusState;
  invoiceNumber?: string;
  saleId?: string;
  error?: string;
}

export function makeEmptyRow(): BulkBroilerRow {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `row-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    buyerId: "",
    buyer: null,
    weightKg: 0,
    broilerCount: null,
    ratePerKg: 0,
    discountType: "PERCENT",
    discountValue: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
    notes: "",
    invoiceNumber: "",
    dateOverride: null,
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function deriveRow(row: BulkBroilerRow, sourceFarmerId: string): BulkBroilerRowDerived {
  const subtotal = round2(row.weightKg * row.ratePerKg);
  let discountAmount = 0;
  if (row.discountValue > 0) {
    discountAmount = row.discountType === "PERCENT"
      ? round2((Math.min(100, row.discountValue) / 100) * subtotal)
      : Math.min(row.discountValue, subtotal);
  }
  const lineTotal = round2(subtotal - discountAmount);
  const dueAmount = round2(lineTotal - row.paidAmount);

  const errors: string[] = [];
  if (!row.buyerId) errors.push("Buyer required");
  else if (sourceFarmerId && row.buyerId === sourceFarmerId) errors.push("Buyer must be different from source farmer");
  if (row.weightKg <= 0) errors.push("Weight must be greater than 0");
  if (row.ratePerKg <= 0) errors.push("Rate must be greater than 0");
  if (row.broilerCount !== null && (!Number.isInteger(row.broilerCount) || row.broilerCount <= 0)) {
    errors.push("Broiler count must be a positive whole number");
  }
  if (row.discountType === "PERCENT" && row.discountValue > 100) errors.push("Discount percent cannot exceed 100");
  if (row.discountType === "FLAT" && row.discountValue > subtotal) errors.push("Flat discount cannot exceed subtotal");
  if (row.paidAmount < 0) errors.push("Paid cannot be negative");
  if (row.paidAmount > lineTotal) errors.push("Paid cannot exceed line total");

  return { subtotal, discountAmount, lineTotal, dueAmount, errors };
}

export function formatCurrency(amount: number): string {
  return `रू ${(Math.round(amount * 100) / 100).toFixed(2)}`;
}

/** A row is "touched" once the user has entered anything that signals intent.
 * Freshly added empty rows should not shout validation errors at the user. */
export function isRowTouched(row: BulkBroilerRow): boolean {
  return (
    row.buyerId !== "" ||
    row.weightKg !== 0 ||
    row.ratePerKg !== 0 ||
    row.broilerCount !== null ||
    row.discountValue !== 0 ||
    row.paidAmount !== 0 ||
    row.notes !== "" ||
    row.invoiceNumber !== "" ||
    row.dateOverride !== null
  );
}
