import { farmerSaleToBill } from "./farmerSaleBill";
import { dealerSaleToBill } from "./dealerSaleBill";
import {
  eggSaleToBill,
  parentSaleToBill,
  chickSaleToBill,
} from "./hatcherySaleBill";
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
    // Customer type (category) is not printed on the bill.
    expect(bill.partyRows).toEqual([{ label: "Phone", value: "9811111111" }]);
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

describe("hatchery eggSaleToBill", () => {
  it("maps egg sale with a party and shows the running balance note", () => {
    const bill = eggSaleToBill(
      {
        id: "egg1",
        invoiceNumber: "HB-0001",
        date: "2026-10-29",
        count: 240,
        unitPrice: "15",
        amount: "3600",
        eggType: { name: "Table egg" },
        party: { name: "Gaurav Egg Suppliers", phone: "9846200005", address: "Chitwan", balance: "11720" },
      },
      business
    );
    expect(bill.title).toBe("Sales bill");
    expect(bill.invoiceNumber).toBe("HB-0001");
    expect(bill.extraColumns).toEqual([]);
    expect(bill.lines).toEqual([
      { id: "egg1", name: "Table egg", quantity: 240, rate: 15, total: 3600 },
    ]);
    expect(bill.totals).toEqual({ total: 3600, note: "Party balance now: रू 11,720" });
    expect(bill.partyName).toBe("Gaurav Egg Suppliers");
    expect(bill.partyRows).toEqual([
      { label: "Phone", value: "9846200005" },
      { label: "Address", value: "Chitwan" },
    ]);
    expect(bill.fileName).toBe("Bill-HB-0001-Gaurav-Egg-Suppliers");
  });

  it("renders a walk-in egg sale (no party, no balance note)", () => {
    const bill = eggSaleToBill(
      {
        id: "egg2",
        invoiceNumber: "HB-0002",
        count: 10,
        unitPrice: "0",
        amount: "0",
        eggType: { name: "Cracked" },
      },
      business
    );
    expect(bill.partyName).toBe("Walk-in");
    expect(bill.partyRows).toEqual([]);
    expect(bill.totals).toEqual({ total: 0, note: undefined });
    expect(bill.lines[0]).toMatchObject({ name: "Cracked", quantity: 10, rate: 0, total: 0 });
  });
});

describe("hatchery parentSaleToBill", () => {
  it("has the Parent-birds line and the Birds + Avg-weight extra columns", () => {
    const bill = parentSaleToBill(
      {
        id: "par1",
        invoiceNumber: "HB-0014",
        date: "2026-09-20",
        count: 12,
        maleCount: 12,
        femaleCount: 0,
        totalWeightKg: "51.6",
        avgWeightKg: "4.3",
        ratePerKg: "360",
        amount: "18576",
        party: { name: "Bharatpur Meat Shop", phone: "9846200006", balance: "17324" },
      },
      business
    );
    expect(bill.lines).toEqual([
      {
        id: "par1",
        name: "Parent birds",
        quantity: 51.6,
        rate: 360,
        total: 18576,
        extra: { birds: "12 male / 0 female", avgWeight: "4.30 kg" },
      },
    ]);
    expect(bill.extraColumns).toEqual([
      { key: "birds", label: "Birds (M/F)" },
      { key: "avgWeight", label: "Avg weight" },
    ]);
    expect(bill.totals).toEqual({ total: 18576, note: "Party balance now: रू 17,324" });
  });
});

describe("hatchery chickSaleToBill", () => {
  it("labels grade A chicks correctly", () => {
    const bill = chickSaleToBill(
      {
        id: "ck1",
        invoiceNumber: "HB-0015",
        count: 815,
        unitPrice: "88",
        amount: "71720",
        grade: "A",
        party: { name: "Ram Bahadur Thapa", balance: "25720" },
      },
      business
    );
    expect(bill.lines[0]).toMatchObject({
      name: "Day-old chicks: grade A",
      quantity: 815,
      rate: 88,
      total: 71720,
    });
    expect(bill.extraColumns).toEqual([]);
    expect(bill.totals.note).toBe("Party balance now: रू 25,720");
  });

  it("labels CULL chicks as cull (not 'grade CULL')", () => {
    const bill = chickSaleToBill(
      { id: "ck2", invoiceNumber: "HB-0016", count: 20, unitPrice: "5", amount: "100", grade: "CULL" },
      business
    );
    expect(bill.lines[0].name).toBe("Day-old chicks: cull");
    expect(bill.partyName).toBe("Walk-in");
    expect(bill.totals.note).toBeUndefined();
  });
});

describe("billFileName", () => {
  it("keeps only safe characters", () => {
    expect(billFileName("INV/031", "Ram & Sons, Pvt.")).toBe("Bill-INV-031-Ram-Sons-Pvt");
    expect(billFileName("", null)).toBe("Bill");
  });
});
