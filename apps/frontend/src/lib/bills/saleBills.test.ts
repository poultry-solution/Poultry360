import { farmerSaleToBill } from "./farmerSaleBill";
import { dealerSaleToBill } from "./dealerSaleBill";
import { billFileName } from "./billFileName";

const business = { name: "Green Valley Farm", phone: "+9779800360011" };

describe("farmerSaleToBill", () => {
  it("lists each egg type and keeps paid and due", () => {
    const bill = farmerSaleToBill(
      {
        invoiceNumber: "INV-024",
        amount: 44562,
        paidAmount: 40000,
        dueAmount: 4562,
        customer: { name: "Hari Kirana Pasal", phone: "9811111111", category: "Retailer" },
        eggLines: [
          { id: "a", quantity: 1752, unitPrice: 16, eggType: { name: "Large" } },
          { id: "b", quantity: 932, unitPrice: 14, eggType: { name: "Medium" } },
        ],
      },
      business
    );
    expect(bill.lines.map((l) => [l.name, l.quantity, l.total])).toEqual([
      ["Large", 1752, 28032],
      ["Medium", 932, 13048],
    ]);
    expect(bill.totals).toMatchObject({ total: 44562, paid: 40000, due: 4562, subtotal: undefined });
    expect(bill.partyRows).toEqual([
      { label: "Phone", value: "9811111111" },
      { label: "Category", value: "Retailer" },
    ]);
    expect(bill.fileName).toBe("Bill-INV-024-Hari-Kirana-Pasal");
  });

  it("shows the broiler weight discount working and a % bill discount", () => {
    const bill = farmerSaleToBill(
      {
        invoiceNumber: "INV-030",
        itemType: "Chicken_Meat",
        quantity: 100,
        weight: 250,
        weightDiscountPercent: 1,
        unitPrice: 230,
        subtotalAmount: 56925,
        amount: 55786.5,
        paidAmount: 55786.5,
        discount: { type: "PERCENT", value: 2 },
        category: { name: "Chicken" },
      },
      business
    );
    expect(bill.lines[0].note).toBe("Weighed 250.00 kg − 1% weight discount (2.50 kg) = 247.50 kg billed");
    expect(bill.lines[0].total).toBe(56925);
    expect(bill.totals).toMatchObject({ subtotal: 56925, discountLabel: "Discount (2%)", total: 55786.5 });
    expect(bill.totals.discountAmount).toBeCloseTo(1138.5);
    expect(bill.partyName).toBe("Cash customer");
  });
});

describe("dealerSaleToBill", () => {
  it("adds broiler columns and the source farmer for a chicken sale", () => {
    const bill = dealerSaleToBill(
      {
        invoiceNumber: "INV-200",
        isChickenSale: true,
        totalAmount: 46000,
        subtotalAmount: 46500,
        paidAmount: 20000,
        customer: { name: "Bhusan Meat Shop" },
        sourceFarmer: { name: "Ramesh" },
        items: [{ id: "1", quantity: 200, unitPrice: 232.5, broilerCount: 100, totalAmount: 46500 }],
      },
      business
    );
    expect(bill.partyLabel).toBe("Buyer");
    expect(bill.extraColumns?.map((c) => c.key)).toEqual(["broilers", "avgWeight"]);
    expect(bill.lines[0].extra).toEqual({ broilers: "100", avgWeight: "2.000 kg" });
    expect(bill.notice).toEqual({ label: "Source farmer (tentative, not settled)", text: "Ramesh" });
    expect(bill.totals).toMatchObject({ subtotal: 46500, discountAmount: 500, total: 46000, due: 26000 });
  });

  it("marks a supplier settlement as no cash", () => {
    const bill = dealerSaleToBill(
      { isSupplierSettlementSale: true, id: "abcdef123456", totalAmount: 5000, manualCompany: { name: "Kathmandu Feeds" }, items: [] },
      business
    );
    expect(bill.title).toBe("Supplier settlement sale");
    expect(bill.partyLabel).toBe("Supplier");
    expect(bill.invoiceNumber).toBe("abcdef12");
    expect(bill.totals.note).toBe("Applied to the supplier balance; no cash was received.");
    expect(bill.partyRows).toContainEqual({ label: "Payment", value: "Supplier balance settlement (no cash)" });
  });
});

describe("billFileName", () => {
  it("keeps only safe characters", () => {
    expect(billFileName("INV/031", "Ram & Sons, Pvt.")).toBe("Bill-INV-031-Ram-Sons-Pvt");
    expect(billFileName("", null)).toBe("Bill");
  });
});
