jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    dealerSale: { findUnique: jest.fn().mockResolvedValue({ id: "sale-1" }) },
  },
}));

import { Prisma } from "@prisma/client";
import prisma from "../../src/utils/prisma";
import { DealerService } from "../../src/services/dealerService";

const db = prisma as any;

/** Products: p1 sold in kg, also sold in a 50 kg bag; costs 760 per kg after discount. */
function makeTx() {
  const products: Record<string, any> = {
    p1: { id: "p1", name: "Feed", unit: "kg", currentStock: 1000, costPrice: 800, companyProductId: null },
    p2: { id: "p2", name: "Medicine", unit: "bottle", currentStock: 50, costPrice: 120, companyProductId: null },
  };
  return {
    dealerProduct: {
      findUnique: jest.fn(({ where }) => Promise.resolve(products[where.id] ?? null)),
      findMany: jest.fn(() =>
        Promise.resolve(
          Object.values(products).map((p) => ({ ...p, hiddenAt: null, unitConversions: [], companyProduct: null }))
        )
      ),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    dealerManualPurchaseItem: {
      findMany: jest.fn(({ where }) =>
        Promise.resolve(
          where.dealerProductId === "p1"
            ? [{ totalAmount: 8000, purchase: { tradeDiscountAmount: 400, items: [{ totalAmount: 8000 }] } }]
            : []
        )
      ),
    },
    dealerProductUnitConversion: {
      findMany: jest.fn().mockResolvedValue([{ unitName: "bag", conversionFactor: 50 }]),
    },
    productUnitConversion: { findMany: jest.fn().mockResolvedValue([]) },
    dealerSale: { create: jest.fn().mockResolvedValue({ id: "sale-1" }) },
    dealerSaleItem: { create: jest.fn(), createMany: jest.fn() },
    dealerProductTransaction: { create: jest.fn(), createMany: jest.fn() },
    dealerSalePayment: { create: jest.fn() },
    dealerLedgerEntry: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    customer: { update: jest.fn() },
    dealerManualCompany: {
      findFirst: jest.fn().mockResolvedValue({ id: "supplier-1" }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    saleDiscount: { create: jest.fn() },
  };
}

const num = (value: unknown) => (value === null ? null : Number(value as Prisma.Decimal));

describe("Dealer sales save the cost of each item", () => {
  let tx: ReturnType<typeof makeTx>;

  beforeEach(() => {
    tx = makeTx();
    db.$transaction.mockImplementation((cb: any) => cb(tx));
  });

  it("uses the stock quantity taken out (bags → kg) and the cost after trade discount", async () => {
    await DealerService.createDealerSale({
      dealerId: "dealer-1",
      customerId: "customer-1",
      invoiceNumber: "INV-1",
      date: new Date("2026-10-13T06:15:00.000Z"),
      paidAmount: 0,
      items: [
        { productId: "p1", quantity: 2, unitPrice: 45000, unit: "bag" },
        { productId: "p2", quantity: 3, unitPrice: 150 },
      ],
    });

    const [bagLine, bottleLine] = tx.dealerSaleItem.create.mock.calls.map((call: any) => call[0].data);
    // 2 bags = 100 kg × 760
    expect(num(bagLine.baseQuantity)).toBe(100);
    expect(num(bagLine.unitCost)).toBe(760);
    expect(num(bagLine.costAmount)).toBe(76000);
    // No purchases for p2 → its costPrice
    expect(num(bottleLine.unitCost)).toBe(120);
    expect(num(bottleLine.costAmount)).toBe(360);
  });

  it("leaves Broiler lines without cost", async () => {
    await DealerService.createDealerSale({
      dealerId: "dealer-1",
      customerId: "customer-1",
      invoiceNumber: "INV-2",
      date: new Date("2026-10-13T06:15:00.000Z"),
      paidAmount: 0,
      isChickenSale: true,
      sourceFarmerId: "farmer-1",
      items: [{ quantity: 200, unitPrice: 300 }],
    });

    const line = tx.dealerSaleItem.create.mock.calls[0][0].data;
    expect(line.productId).toBeNull();
    expect(line.unitCost).toBeNull();
    expect(line.costAmount).toBeNull();
    expect(tx.dealerManualPurchaseItem.findMany).not.toHaveBeenCalled();
  });

  it("saves cost on supplier settlement sales", async () => {
    await DealerService.createSupplierSettlementSale({
      dealerId: "dealer-1",
      manualCompanyId: "supplier-1",
      invoiceNumber: "INV-3",
      date: new Date("2026-10-13T06:15:00.000Z"),
      items: [{ productId: "p1", quantity: 10, unitPrice: 900 }],
    } as any);

    const [line] = tx.dealerSaleItem.createMany.mock.calls[0][0].data;
    expect(num(line.unitCost)).toBe(760);
    expect(num(line.costAmount)).toBe(7600);
  });
});
