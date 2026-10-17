import { recomputeSupplierTotals } from "../../src/controller/dealerController";

describe("recomputeSupplierTotals", () => {
  it("counts only the latest opening balance after it was edited", () => {
    // Newest first: opening edited from 10,000 to 12,000, one purchase and one payment.
    const totals = recomputeSupplierTotals([
      { type: "PAYMENT", amount: 3000 },
      { type: "OPENING_BALANCE", amount: 12000 },
      { type: "PURCHASE", amount: 5000 },
      { type: "OPENING_BALANCE", amount: 10000 },
    ]);
    expect(totals).toEqual({ balance: 14000, totalPurchases: 5000, totalPayments: 3000 });
  });

  it("keeps a negative (advance) opening balance and counts adjustments and receipts", () => {
    const totals = recomputeSupplierTotals([
      { type: "RECEIPT", amount: 500 },
      { type: "ADJUSTMENT", amount: 200 },
      { type: "OPENING_BALANCE", amount: -1000 },
    ]);
    expect(totals).toEqual({ balance: -1300, totalPurchases: 200, totalPayments: 500 });
  });

  it("is zero with no rows", () => {
    expect(recomputeSupplierTotals([])).toEqual({ balance: 0, totalPurchases: 0, totalPayments: 0 });
  });
});
