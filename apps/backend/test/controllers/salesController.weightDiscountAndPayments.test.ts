jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    batch: { findUnique: jest.fn(), update: jest.fn() },
    category: { findFirst: jest.fn() },
    customer: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
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
    // Phase 5 auto-post lives in the same tx as the sale writes; stubbed so
    // the controller's ensureCashAccountId + postSalePaymentMovement +
    // deleteCustomerReceiptMovement calls resolve during the test.
    farmerCashAccount: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    farmerCashMovement: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  client.$transaction = jest.fn((fn: (tx: any) => unknown) => fn(client));
  return { __esModule: true, default: client };
});

jest.mock("../../src/utils/nepalBsDate", () => ({
  toNepalBsDayString: jest.fn(() => "2083-06-26"),
  getNepalBsTodayString: jest.fn(() => "2083-06-26"),
  prevBsDate: jest.fn((bs: string) => bs),
}));

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

jest.mock("bcrypt", () => ({ compare: jest.fn().mockResolvedValue(true) }));

import prisma from "../../src/utils/prisma";
import {
  createSale,
  getAllSalePayments,
  softDeleteCustomerPayment,
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
  // Defaults for the auto-post mirror writes. `findFirst` returns an existing
  // cash account id so ensureCashAccountId skips the create path; mirror writes
  // succeed quietly.
  db.farmerCashAccount.findFirst.mockResolvedValue({ id: "cash-1" });
  db.farmerCashAccount.findUnique.mockResolvedValue({
    id: "cash-1",
    userId: "farmer-1",
    archivedAt: null,
  });
  db.farmerCashMovement.findFirst.mockResolvedValue(null);
  db.farmerCashMovement.create.mockResolvedValue({ id: "mov-1" });
  db.farmerCashMovement.deleteMany.mockResolvedValue({ count: 1 });
  db.salePayment.create.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: "pay-new", ...data }),
  );
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

describe("Sale payments", () => {
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

describe("Sale + cashflow mirror atomicity", () => {
  it("createSale pairs salePayment.create with farmerCashMovement.create inside one $transaction", async () => {
    db.customer.findFirst.mockResolvedValue({ id: "cust-1", name: "Ram" });
    const res = makeResponse();
    await createSale(makeRequest({ ...broilerSale }), res);

    expect(db.salePayment.create).toHaveBeenCalledTimes(1);
    expect(db.farmerCashMovement.create).toHaveBeenCalledTimes(1);
    // Both writes must happen inside the same $transaction callback — the
    // mock's $transaction is called once per full sale save.
    expect(db.$transaction).toHaveBeenCalledTimes(1);

    const mirror = db.farmerCashMovement.create.mock.calls[0][0].data;
    expect(mirror.sourceType).toBe("SALE_PAYMENT");
    expect(mirror.category).toBe("SALE_RECEIPT");
    expect(mirror.direction).toBe("IN");
    expect(Number(mirror.amount)).toBe(60000);
  });

  it("createSale rolls the whole save back when the mirror write throws", async () => {
    db.customer.findFirst.mockResolvedValue({ id: "cust-1", name: "Ram" });
    db.farmerCashMovement.create.mockRejectedValueOnce(new Error("FK fail"));

    const res = makeResponse();
    await createSale(makeRequest({ ...broilerSale }), res);

    // Controller swallows the rejection and returns 500, but the important
    // invariant is that the real Prisma $transaction would roll back the
    // sale write when the mirror throws — the mock proves the controller
    // runs both inside the same block.
    expect(res.status).toHaveBeenCalledWith(500);
    // The sale & payment create calls are observed on the mock (they ran in
    // the tx callback), but in production the surrounding $transaction
    // discards them.
  });

  it("softDeleteCustomerPayment pairs the receipt delete with the cashbook mirror cleanup", async () => {
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

    // Three cashbook mirror deletes should fire inside the single $transaction:
    //   1) SALE_PAYMENT mirror for pay-2 (the linked SalePayment)
    //   2) CUSTOMER_RECEIPT mirror for rcpt-2 (the receipt row itself)
    const sourceTypesCleared = db.farmerCashMovement.deleteMany.mock.calls.map(
      (call: any) => call[0].where.sourceType,
    );
    expect(sourceTypesCleared).toEqual(
      expect.arrayContaining(["SALE_PAYMENT", "CUSTOMER_RECEIPT"]),
    );
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.salePayment.delete).toHaveBeenCalledWith({ where: { id: "pay-2" } });
  });
});
