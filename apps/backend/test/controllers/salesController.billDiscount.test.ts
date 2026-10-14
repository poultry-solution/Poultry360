jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    batch: { findUnique: jest.fn(), update: jest.fn() },
    category: { findFirst: jest.fn() },
    customer: { findFirst: jest.fn(), update: jest.fn() },
    customerTransaction: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    sale: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    salePayment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    farm: { findMany: jest.fn() },
    mortality: { create: jest.fn() },
    birdWeight: { create: jest.fn() },
  };
  client.$transaction = jest.fn((fn: (tx: any) => unknown) => fn(client));
  return { __esModule: true, default: client };
});

jest.mock("../../src/utils/category", () => ({
  getSalesCategoryIdForItemType: jest.fn().mockResolvedValue("cat-1"),
}));

jest.mock("../../src/utils/invoiceNumber", () => ({
  buildFarmerInvoiceKey: jest.fn((userId: string, n: string) => `${userId}:${n}`),
  generateNextFarmerInvoiceNumber: jest.fn().mockResolvedValue("INV-001"),
}));

jest.mock("../../src/services/farmerFcrService", () => ({
  refreshFarmerFcrHistorySafely: jest.fn(),
}));

jest.mock("../../src/services/farmerSaleBatchSyncService", () => ({
  syncFarmerSaleBatchRecords: jest.fn().mockResolvedValue([]),
}));

import prisma from "../../src/utils/prisma";
import { createSale, updateSale } from "../../src/controller/salesController";
import { applyBillDiscount, BillDiscountError } from "../../src/utils/discountHelpers";

const db = prisma as any;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

function makeRequest(body: Record<string, unknown>, params: Record<string, string> = {}) {
  return { body, params, userId: "farmer-1", role: "OWNER" } as any;
}

// 100 birds, 250 kg at रू 230/kg = रू 57,500 (56,925 with 1% weight discount).
const broilerSale = {
  date: "2026-10-12T00:00:00.000Z",
  amount: 57500,
  quantity: 100,
  weight: 250,
  unitPrice: 230,
  itemType: "Chicken_Meat",
  isCredit: false,
  paidAmount: 57500,
};

const otherSale = {
  date: "2026-10-12T00:00:00.000Z",
  amount: 10000,
  quantity: 10,
  unitPrice: 1000,
  itemType: "OTHER",
  isCredit: false,
  paidAmount: 10000,
};

beforeEach(() => {
  jest.clearAllMocks();
  db.category.findFirst.mockResolvedValue({ id: "cat-1" });
  db.sale.create.mockImplementation(({ data }: any) => Promise.resolve({ id: "sale-1", ...data }));
  db.sale.findUnique.mockResolvedValue({ id: "sale-1" });
  db.salePayment.findMany.mockResolvedValue([]);
});

describe("applyBillDiscount", () => {
  it("takes a flat amount off", () => {
    expect(applyBillDiscount(57500, { type: "FLAT", value: 500 })).toEqual({
      subtotal: 57500,
      discountAmount: 500,
      amount: 57000,
      discount: { type: "FLAT", value: 500 },
    });
  });

  it("takes a percent off and rounds to paisa", () => {
    const result = applyBillDiscount(1234.567, { type: "PERCENT", value: 2.5 });
    expect(result.subtotal).toBe(1234.57);
    expect(result.discountAmount).toBe(30.86);
    expect(result.amount).toBe(1203.71);
  });

  it("treats a missing discount as none", () => {
    expect(applyBillDiscount(500, null)).toEqual({ subtotal: 500, discountAmount: 0, amount: 500, discount: null });
  });

  it.each([
    [{ type: "PERCENT" as const, value: 100 }],
    [{ type: "PERCENT" as const, value: 150 }],
    [{ type: "FLAT" as const, value: 500 }],
    [{ type: "FLAT" as const, value: 900 }],
  ])("refuses %j on a रू 500 bill", (discount) => {
    expect(() => applyBillDiscount(500, discount)).toThrow(BillDiscountError);
  });
});

describe("createSale with a bill discount", () => {
  it("applies the bill discount after the weight discount", async () => {
    const res = makeResponse();
    await createSale(
      makeRequest({ ...broilerSale, weightDiscountPercent: 1, discount: { type: "FLAT", value: 425 } }),
      res
    );

    const saved = db.sale.create.mock.calls[0][0].data;
    expect(saved.subtotalAmount).toBe(56925);
    expect(saved.amount).toBe(56500);
    expect(saved.paidAmount).toBe(56500);
    expect(saved.discount).toEqual({ create: { type: "FLAT", value: 425, scope: "SALE" } });
    expect(db.salePayment.create.mock.calls[0][0].data.amount).toBe(56500);
  });

  it("works for other items using the sent bill amount", async () => {
    const res = makeResponse();
    await createSale(makeRequest({ ...otherSale, discount: { type: "PERCENT", value: 10 } }), res);

    const saved = db.sale.create.mock.calls[0][0].data;
    expect(saved.subtotalAmount).toBe(10000);
    expect(saved.amount).toBe(9000);
    expect(saved.paidAmount).toBe(9000);
  });

  it("puts only the after-discount due on credit", async () => {
    db.customer.findFirst.mockResolvedValue({ id: "cust-1" });
    const res = makeResponse();
    await createSale(
      makeRequest({
        ...broilerSale,
        discount: { type: "PERCENT", value: 2 },
        isCredit: true,
        paidAmount: 20000,
        customerId: "cust-1",
      }),
      res
    );

    // 57,500 − 2% (1,150) = 56,350; due = 56,350 − 20,000
    const saved = db.sale.create.mock.calls[0][0].data;
    expect(saved.amount).toBe(56350);
    expect(saved.dueAmount).toBe(36350);
    expect(db.customer.update.mock.calls[0][0].data.balance.increment).toBe(36350);
  });

  it("refuses a paid amount above the after-discount total", async () => {
    db.customer.findFirst.mockResolvedValue({ id: "cust-1" });
    const res = makeResponse();
    await createSale(
      makeRequest({
        ...broilerSale,
        discount: { type: "FLAT", value: 500 },
        isCredit: true,
        paidAmount: 57500,
        customerId: "cust-1",
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.sale.create).not.toHaveBeenCalled();
  });

  it("refuses a flat discount as big as the bill", async () => {
    const res = makeResponse();
    await createSale(makeRequest({ ...otherSale, discount: { type: "FLAT", value: 10000 } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.sale.create).not.toHaveBeenCalled();
  });

  it("saves no discount fields when there is no discount", async () => {
    const res = makeResponse();
    await createSale(makeRequest({ ...otherSale }), res);

    const saved = db.sale.create.mock.calls[0][0].data;
    expect(saved.amount).toBe(10000);
    expect(saved.subtotalAmount).toBeNull();
    expect(saved.discount).toBeUndefined();
  });
});

describe("updateSale with a bill discount", () => {
  const existing = {
    id: "sale-1",
    itemType: "Chicken_Meat",
    date: new Date("2026-10-12T00:00:00.000Z"),
    amount: 57500,
    subtotalAmount: null,
    discount: null,
    quantity: 100,
    weight: 250,
    weightDiscountPercent: null,
    unitPrice: 230,
    paidAmount: 57500,
    dueAmount: null,
    isCredit: false,
    customerId: null,
    batchId: null,
    farm: null,
    customer: null,
    payments: [{ id: "pay-1", amount: 57500, description: "Initial payment", createdAt: new Date("2026-10-12") }],
  };
  const discounted = {
    ...existing,
    amount: 57000,
    subtotalAmount: 57500,
    discount: { type: "FLAT", value: 500 },
    paidAmount: 57000,
    payments: [{ id: "pay-1", amount: 57000, description: "Initial payment", createdAt: new Date("2026-10-12") }],
  };

  it("adds a discount to an old sale", async () => {
    db.sale.findUnique.mockResolvedValueOnce(existing);
    const res = makeResponse();
    await updateSale(makeRequest({ discount: { type: "FLAT", value: 500 } }, { id: "sale-1" }), res);

    const update = db.sale.update.mock.calls[0][0].data;
    expect(update.amount).toBe(57000);
    expect(update.subtotalAmount).toBe(57500);
    expect(update.paidAmount).toBe(57000);
    expect(update.discount.upsert.create).toEqual({ type: "FLAT", value: 500, scope: "SALE" });
  });

  it("changes a flat discount to a percent", async () => {
    db.sale.findUnique.mockResolvedValueOnce(discounted);
    const res = makeResponse();
    await updateSale(makeRequest({ discount: { type: "PERCENT", value: 2 } }, { id: "sale-1" }), res);

    const update = db.sale.update.mock.calls[0][0].data;
    expect(update.amount).toBe(56350);
    expect(update.discount.upsert.update).toEqual({ type: "PERCENT", value: 2 });
  });

  it("removes the discount when sent as null", async () => {
    db.sale.findUnique.mockResolvedValueOnce(discounted);
    const res = makeResponse();
    await updateSale(makeRequest({ discount: null }, { id: "sale-1" }), res);

    const update = db.sale.update.mock.calls[0][0].data;
    expect(update.amount).toBe(57500);
    expect(update.subtotalAmount).toBeNull();
    expect(update.discount).toEqual({ delete: true });
  });

  it("keeps the saved discount when only the weight changes", async () => {
    db.sale.findUnique.mockResolvedValueOnce(discounted);
    const res = makeResponse();
    await updateSale(makeRequest({ weight: 260 }, { id: "sale-1" }), res);

    // 260 kg × 230 = 59,800, less the saved रू 500
    const update = db.sale.update.mock.calls[0][0].data;
    expect(update.subtotalAmount).toBe(59800);
    expect(update.amount).toBe(59300);
    expect(update.discount.upsert.update).toEqual({ type: "FLAT", value: 500 });
  });

  it("leaves money alone when nothing about the bill changes", async () => {
    db.sale.findUnique.mockResolvedValueOnce(discounted);
    const res = makeResponse();
    await updateSale(makeRequest({ description: "note" }, { id: "sale-1" }), res);

    const update = db.sale.update.mock.calls[0][0].data;
    expect(update.amount).toBeUndefined();
    expect(update.subtotalAmount).toBeUndefined();
    expect(update.discount).toBeUndefined();
  });

  it("refuses a discount that leaves less than already paid on credit", async () => {
    db.sale.findUnique.mockResolvedValueOnce({
      ...existing,
      isCredit: true,
      customerId: "cust-1",
      paidAmount: 57000,
      dueAmount: 500,
    });
    const res = makeResponse();
    await updateSale(makeRequest({ discount: { type: "FLAT", value: 1000 } }, { id: "sale-1" }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.sale.update).not.toHaveBeenCalled();
  });
});
