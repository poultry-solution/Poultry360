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

jest.mock("bcrypt", () => ({ compare: jest.fn().mockResolvedValue(true) }));

import prisma from "../../src/utils/prisma";
import {
  createSale,
  getAllSalePayments,
  softDeleteCustomerPayment,
  updateSale,
} from "../../src/controller/salesController";
import { computeBroilerSaleAmount } from "../../src/utils/broilerSaleAmount";

const db = prisma as any;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

function makeRequest(body: Record<string, unknown>, params: Record<string, string> = {}) {
  return { body, params, userId: "farmer-1", role: "OWNER" } as any;
}

const broilerSale = {
  date: "2026-10-12T00:00:00.000Z",
  amount: 60000,
  quantity: 100,
  weight: 200,
  unitPrice: 300,
  itemType: "Chicken_Meat",
  isCredit: false,
  paidAmount: 60000,
};

beforeEach(() => {
  jest.clearAllMocks();
  db.category.findFirst.mockResolvedValue({ id: "cat-1" });
  db.sale.create.mockImplementation(({ data }: any) => Promise.resolve({ id: "sale-1", ...data }));
  db.sale.findUnique.mockResolvedValue({ id: "sale-1" });
  db.salePayment.findMany.mockResolvedValue([]);
});

describe("Broiler bill math", () => {
  it("takes the % off the weight and charges the rate on the rest", () => {
    expect(computeBroilerSaleAmount(200, 300, 1)).toEqual({ billedWeight: 198, amount: 59400 });
  });

  it("rounds billed weight to 2 decimals before pricing", () => {
    expect(computeBroilerSaleAmount(247.3, 300, 1)).toEqual({ billedWeight: 244.83, amount: 73449 });
  });

  it("charges the full weight when there is no discount", () => {
    expect(computeBroilerSaleAmount(200, 300, null)).toEqual({ billedWeight: 200, amount: 60000 });
  });
});

describe("createSale with weight discount", () => {
  it("bills the discounted weight but saves the real weight", async () => {
    const res = makeResponse();
    await createSale(makeRequest({ ...broilerSale, weightDiscountPercent: 1 }), res);

    const saved = db.sale.create.mock.calls[0][0].data;
    expect(saved.weight).toBe(200);
    expect(saved.weightDiscountPercent).toBe(1);
    expect(saved.amount).toBe(59400);
    expect(saved.paidAmount).toBe(59400);
    expect(db.salePayment.create.mock.calls[0][0].data.amount).toBe(59400);
  });

  it("works out the total on the server instead of trusting the app", async () => {
    const res = makeResponse();
    await createSale(makeRequest({ ...broilerSale, amount: 99999, paidAmount: 99999 }), res);

    const saved = db.sale.create.mock.calls[0][0].data;
    expect(saved.amount).toBe(60000);
    expect(saved.weightDiscountPercent).toBeNull();
  });

  it("puts only the discounted amount on credit", async () => {
    db.customer.findFirst.mockResolvedValue({ id: "cust-1" });
    const res = makeResponse();
    await createSale(
      makeRequest({ ...broilerSale, weightDiscountPercent: 1, isCredit: true, paidAmount: 9400, customerId: "cust-1" }),
      res
    );

    expect(db.sale.create.mock.calls[0][0].data.dueAmount).toBe(50000);
    expect(db.customer.update.mock.calls[0][0].data.balance.increment).toBe(50000);
  });

  it("rejects a paid amount above the discounted total", async () => {
    db.customer.findFirst.mockResolvedValue({ id: "cust-1" });
    const res = makeResponse();
    await createSale(
      makeRequest({ ...broilerSale, weightDiscountPercent: 1, isCredit: true, paidAmount: 60000, customerId: "cust-1" }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.sale.create).not.toHaveBeenCalled();
  });

  it.each([0, -1, 100, 150])("rejects a %s%% discount", async (percent) => {
    const res = makeResponse();
    await createSale(makeRequest({ ...broilerSale, weightDiscountPercent: percent }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.sale.create).not.toHaveBeenCalled();
  });

  it("rejects a weight discount on a non-broiler sale", async () => {
    const res = makeResponse();
    await createSale(
      makeRequest({ ...broilerSale, itemType: "OTHER", weight: undefined, weightDiscountPercent: 1 }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.sale.create).not.toHaveBeenCalled();
  });
});

describe("updateSale with weight discount", () => {
  const existing = {
    id: "sale-1",
    itemType: "Chicken_Meat",
    date: new Date("2026-10-12T00:00:00.000Z"),
    amount: 60000,
    quantity: 100,
    weight: 200,
    weightDiscountPercent: null,
    unitPrice: 300,
    paidAmount: 60000,
    dueAmount: null,
    isCredit: false,
    customerId: null,
    batchId: null,
    farm: null,
    customer: null,
    payments: [{ id: "pay-1", amount: 60000, description: "Initial payment", createdAt: new Date("2026-10-12") }],
  };

  it("adds a discount to an old sale and re-works the bill", async () => {
    db.sale.findUnique.mockResolvedValueOnce(existing);
    const res = makeResponse();
    await updateSale(makeRequest({ weightDiscountPercent: 1 }, { id: "sale-1" }), res);

    const update = db.sale.update.mock.calls[0][0].data;
    expect(update.weightDiscountPercent).toBe(1);
    expect(update.amount).toBe(59400);
    expect(update.paidAmount).toBe(59400);
  });

  it("removes a discount when sent as null", async () => {
    db.sale.findUnique.mockResolvedValueOnce({ ...existing, weightDiscountPercent: 1, amount: 59400, paidAmount: 59400 });
    const res = makeResponse();
    await updateSale(makeRequest({ weightDiscountPercent: null }, { id: "sale-1" }), res);

    const update = db.sale.update.mock.calls[0][0].data;
    expect(update.weightDiscountPercent).toBeNull();
    expect(update.amount).toBe(60000);
  });

  it("keeps the saved discount when only the rate changes", async () => {
    db.sale.findUnique.mockResolvedValueOnce({ ...existing, weightDiscountPercent: 1, amount: 59400, paidAmount: 59400 });
    const res = makeResponse();
    await updateSale(makeRequest({ unitPrice: 310 }, { id: "sale-1" }), res);

    const update = db.sale.update.mock.calls[0][0].data;
    expect(update.weightDiscountPercent).toBeUndefined();
    expect(update.amount).toBe(61380);
  });
});

describe("Payments stay in step with the sale", () => {
  const cashSale = {
    id: "sale-1",
    itemType: "Chicken_Meat",
    date: new Date("2026-10-12T00:00:00.000Z"),
    amount: 60000,
    quantity: 100,
    weight: 200,
    weightDiscountPercent: null,
    unitPrice: 300,
    paidAmount: 60000,
    dueAmount: null,
    isCredit: false,
    customerId: null,
    batchId: null,
    farm: null,
    customer: null,
    payments: [{ id: "pay-1", amount: 60000, description: "Initial payment", createdAt: new Date("2026-10-12") }],
  };

  it("lowers the cash sale's initial payment when a discount is added", async () => {
    db.sale.findUnique.mockResolvedValueOnce(cashSale);
    db.salePayment.findMany.mockResolvedValueOnce(cashSale.payments);
    await updateSale(makeRequest({ weightDiscountPercent: 1 }, { id: "sale-1" }), makeResponse());

    expect(db.salePayment.update).toHaveBeenCalledWith({
      where: { id: "pay-1" },
      data: { amount: 59400, date: cashSale.date },
    });
  });

  it("moves the initial payment date when the sale date changes", async () => {
    db.sale.findUnique.mockResolvedValueOnce(cashSale);
    db.salePayment.findMany.mockResolvedValueOnce(cashSale.payments);
    await updateSale(makeRequest({ date: "2026-10-10T00:00:00.000Z" }, { id: "sale-1" }), makeResponse());

    expect(db.salePayment.update).toHaveBeenCalledWith({
      where: { id: "pay-1" },
      data: { date: new Date("2026-10-10T00:00:00.000Z") },
    });
  });

  it("refuses a paid amount below payments already received later", async () => {
    const creditSale = {
      ...cashSale,
      isCredit: true,
      customerId: "cust-1",
      paidAmount: 30000,
      dueAmount: 30000,
      payments: [
        { id: "pay-1", amount: 10000, description: "Initial payment", createdAt: new Date("2026-10-12") },
        { id: "pay-2", amount: 20000, description: "Payment received", createdAt: new Date("2026-10-13") },
      ],
    };
    db.sale.findUnique.mockResolvedValueOnce(creditSale);
    const res = makeResponse();
    await updateSale(makeRequest({ paidAmount: 5000 }, { id: "sale-1" }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.sale.update).not.toHaveBeenCalled();
  });

  it("lists a credit sale payment once, not as both sale payment and receipt", async () => {
    db.salePayment.findMany.mockResolvedValueOnce([
      { id: "pay-2", amount: 20000, date: new Date(), description: "Payment received", receiptUrl: null, sale: { id: "sale-1" } },
      { id: "pay-1", amount: 10000, date: new Date(), description: "Initial payment", receiptUrl: null, sale: { id: "sale-1" } },
    ]);
    db.customerTransaction.findMany.mockResolvedValueOnce([
      { id: "rcpt-2", amount: 20000, date: new Date(), description: "Payment received", imageUrl: null, reference: "pay-2", deletedAt: null, customerId: "cust-1", customer: { id: "cust-1" } },
      { id: "rcpt-old", amount: 5000, date: new Date(), description: "Party payment", imageUrl: null, reference: null, deletedAt: new Date(), customerId: "cust-1", customer: { id: "cust-1" } },
    ]);
    const res = makeResponse();
    await getAllSalePayments({ query: {}, userId: "farmer-1", role: "OWNER" } as any, res);

    const body = res.json.mock.calls[0][0];
    expect(body.data.map((p: any) => p.id).sort()).toEqual(["pay-1", "rcpt-2", "rcpt-old"]);
    // Deleted receipt is listed but not counted.
    expect(body.summary.totalAmount).toBe(30000);
  });

  it("deleting a sale's receipt also removes it from the sale", async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: "farmer-1", password: "hash" });
    db.customer.findFirst.mockResolvedValueOnce({ id: "cust-1" });
    db.customerTransaction.findFirst.mockResolvedValueOnce({ id: "rcpt-2", amount: 20000, reference: "pay-2" });
    db.salePayment.findUnique.mockResolvedValueOnce({
      id: "pay-2",
      saleId: "sale-1",
      amount: 20000,
      sale: { customerId: "cust-1", amount: 60000, paidAmount: 30000 },
    });
    const res = makeResponse();
    await softDeleteCustomerPayment(
      { params: { id: "cust-1", transactionId: "rcpt-2" }, body: { password: "x" }, userId: "farmer-1" } as any,
      res
    );

    expect(db.salePayment.delete).toHaveBeenCalledWith({ where: { id: "pay-2" } });
    expect(db.sale.update).toHaveBeenCalledWith({
      where: { id: "sale-1" },
      data: { paidAmount: 10000, dueAmount: 50000 },
    });
  });
});
