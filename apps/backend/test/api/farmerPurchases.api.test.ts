import { ApiHelper } from "../helpers/api.helper";

/**
 * Supplier Ledger and Inventory user journey.
 * All setup and checks use app HTTP endpoints, never Prisma from the test.
 */
describe("Farmer purchases and inventory API journey", () => {
  const farmerApi = new ApiHelper();
  const otherFarmerApi = new ApiHelper();
  const password = "Farmer-purchases-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const farmerPhone = `+97796${suffix}`;
  const otherFarmerPhone = `+97795${suffix}`;
  const now = new Date().toISOString();

  let supplierId: string | undefined;
  let openingBalanceTransactionId: string | undefined;
  let purchaseTransactionId: string | undefined;
  let paymentTransactionId: string | undefined;

  beforeAll(async () => {
    const [farmerRegistration, otherFarmerRegistration] = await Promise.all([
      farmerApi.post("/auth/register", {
        name: `Purchase API Farmer ${suffix}`,
        phone: farmerPhone,
        password,
        role: "OWNER",
      }),
      otherFarmerApi.post("/auth/register", {
        name: `Other Purchase API Farmer ${suffix}`,
        phone: otherFarmerPhone,
        password,
        role: "OWNER",
      }),
    ]);

    expect(farmerRegistration.status).toBe(201);
    expect(otherFarmerRegistration.status).toBe(201);
    farmerApi.setAuthToken(farmerRegistration.body.accessToken);
    otherFarmerApi.setAuthToken(otherFarmerRegistration.body.accessToken);

    const [farmerApproval, otherFarmerApproval] = await Promise.all([
      farmerApi.post("/test/approve-current-user"),
      otherFarmerApi.post("/test/approve-current-user"),
    ]);
    expect(farmerApproval.status).toBe(200);
    expect(otherFarmerApproval.status).toBe(200);
  });

  afterAll(async () => {
    // Remove ledger rows in reverse order. Deleting a purchase also reverses
    // the inventory and removes its linked payment.
    if (purchaseTransactionId) {
      await farmerApi.delete(`/dealers/${supplierId}/transactions/${purchaseTransactionId}`, { password });
    } else if (paymentTransactionId) {
      await farmerApi.delete(`/dealers/${supplierId}/transactions/${paymentTransactionId}`, { password });
    }
    if (openingBalanceTransactionId) {
      await farmerApi.delete(`/dealers/${supplierId}/transactions/${openingBalanceTransactionId}`, { password });
    }
    if (supplierId) await farmerApi.delete(`/dealers/${supplierId}`);
  });

  it("requires sign-in for supplier and inventory data", async () => {
    const anonymousApi = new ApiHelper();
    const [suppliers, inventory] = await Promise.all([
      anonymousApi.get("/dealers"),
      anonymousApi.get("/inventory/table"),
    ]);

    expect(suppliers.status).toBe(401);
    expect(inventory.status).toBe(401);
  });

  it("rejects an incomplete purchase before any supplier is charged", async () => {
    const createSupplier = await farmerApi.post("/dealers", {
      name: `Purchase API Supplier ${suffix}`,
      contact: "9800000000",
      address: "Test supplier address",
    });
    expect(createSupplier.status).toBe(201);
    supplierId = createSupplier.body.data.id;

    const badPurchase = await farmerApi.post(`/dealers/${supplierId}/transactions`, {
      type: "PURCHASE",
      amount: 100,
      quantity: 1,
      purchaseCategory: "FEED",
      date: now,
      unitPrice: 100,
      unit: "KG",
    });

    expect(badPurchase.status).toBe(400);
    expect(badPurchase.body.message).toMatch(/item name/i);

    const detail = await farmerApi.get(`/dealers/${supplierId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.balance).toBe(0);
    expect(detail.body.data.summary.totalPurchases).toBe(0);
  });

  it("stores opening balance, paid and free goods, inventory, and a linked payment", async () => {
    const openingBalance = await farmerApi.post(`/dealers/${supplierId}/opening-balance`, {
      openingBalance: 1000,
      notes: "Balance before using Poultry360",
    });
    expect(openingBalance.status).toBe(200);
    openingBalanceTransactionId = openingBalance.body.data.id;

    const purchase = await farmerApi.post(`/dealers/${supplierId}/transactions`, {
      type: "PURCHASE",
      amount: 500,
      quantity: 5,
      freeQuantity: 2,
      itemName: `Starter feed ${suffix}`,
      purchaseCategory: "FEED",
      date: now,
      unitPrice: 100,
      unit: "KG",
      description: "Five paid bags plus two free bags",
    });
    expect(purchase.status).toBe(201);
    purchaseTransactionId = purchase.body.data.id;

    const payment = await farmerApi.post(`/dealers/${supplierId}/transactions`, {
      type: "PAYMENT",
      amount: 200,
      date: now,
      description: "Part payment",
      paymentToPurchaseId: purchaseTransactionId,
    });
    expect(payment.status).toBe(201);
    paymentTransactionId = payment.body.data.id;

    const [detail, purchases, payments, inventory] = await Promise.all([
      farmerApi.get(`/dealers/${supplierId}`),
      farmerApi.get(`/dealers/${supplierId}/transactions?type=PURCHASE&page=1&limit=10`),
      farmerApi.get(`/dealers/${supplierId}/transactions?type=PAYMENT&page=1&limit=10`),
      farmerApi.get("/inventory/table"),
    ]);

    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({
      balance: 1300,
      summary: {
        totalPurchases: 1,
        totalPayments: 1,
        totalPurchasedAmount: 500,
        totalPaidAmount: 200,
      },
    });
    const purchaseRow = purchases.body.data.find((row: { id: string }) => row.id === purchaseTransactionId);
    const paymentRow = payments.body.data.find((row: { id: string }) => row.id === paymentTransactionId);
    expect(purchaseRow).toMatchObject({
      id: purchaseTransactionId,
      freeQuantity: 2,
      purchaseCategory: "FEED",
    });
    expect(Number(purchaseRow.quantity)).toBe(5);
    expect(Number(purchaseRow.amount)).toBe(500);
    expect(paymentRow).toMatchObject({ id: paymentTransactionId, paymentToPurchaseId: purchaseTransactionId });
    expect(Number(paymentRow.amount)).toBe(200);
    expect(inventory.status).toBe(200);
    const inventoryRow = inventory.body.data.find(
      (row: { name: string }) => row.name === `Starter feed ${suffix}`
    );
    expect(inventoryRow).toMatchObject({ quantity: 7, itemType: "FEED" });
    // Free goods have zero cost, so their value lowers the effective unit rate.
    expect(Number(inventoryRow.rate)).toBeCloseTo(500 / 7, 4);
  });

  it("rejects invalid free quantities and overpayments without changing the purchase", async () => {
    const [fractionalFreeGoods, tooLargePayment] = await Promise.all([
      farmerApi.post(`/dealers/${supplierId}/transactions`, {
        type: "PURCHASE",
        amount: 100,
        quantity: 1,
        freeQuantity: 0.5,
        itemName: `Bad free goods ${suffix}`,
        purchaseCategory: "FEED",
        date: now,
        unitPrice: 100,
        unit: "KG",
      }),
      farmerApi.post(`/dealers/${supplierId}/transactions`, {
        type: "PAYMENT",
        amount: 301,
        date: now,
        paymentToPurchaseId: purchaseTransactionId,
      }),
    ]);

    expect(fractionalFreeGoods.status).toBe(400);
    expect(fractionalFreeGoods.body.message).toMatch(/free quantity/i);
    expect(tooLargePayment.status).toBe(400);
    expect(tooLargePayment.body.message).toMatch(/exceeds remaining due/i);

    const payments = await farmerApi.get(`/dealers/${supplierId}/transactions?type=PAYMENT`);
    expect(payments.body.pagination.total).toBe(1);
  });

  it("keeps a supplier and its transactions private to its owner", async () => {
    const [supplier, transactions] = await Promise.all([
      otherFarmerApi.get(`/dealers/${supplierId}`),
      otherFarmerApi.get(`/dealers/${supplierId}/transactions`),
    ]);

    expect(supplier.status).toBe(404);
    expect(transactions.status).toBe(404);
  });
});
