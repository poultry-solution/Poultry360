import { ApiHelper } from "../helpers/api.helper";

/**
 * Sales-ledger journey through public HTTP APIs only.
 *
 * A customer starts with Rs. 100 owed. A Rs. 600 credit sale with Rs. 100
 * paid makes the balance Rs. 600. A Rs. 200 payment lowers it to Rs. 400.
 * Deleting that payment restores Rs. 600. Deleting the sale restores the
 * original Rs. 100 opening balance.
 */
describe("Farmer sales ledger API journey", () => {
  const api = new ApiHelper();
  const password = "Farmer-sales-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const phone = `+97791${suffix}`;
  const now = new Date().toISOString();

  let farmId: string | undefined;
  let batchId: string | undefined;
  let chicksItemId: string | undefined;
  let customerId: string | undefined;
  let saleId: string | undefined;
  let customerPaymentId: string | undefined;

  beforeAll(async () => {
    const registration = await api.post("/auth/register", {
      name: `Sales API Farmer ${suffix}`,
      phone,
      password,
      role: "OWNER",
    });
    expect(registration.status).toBe(201);
    api.setAuthToken(registration.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);

    const farm = await api.post("/farms", { name: `Sales Farm ${suffix}`, capacity: 20 });
    expect(farm.status).toBe(201);
    farmId = farm.body.data.id;

    const chicks = await api.post("/inventory", {
      name: `Sales chicks ${suffix}`,
      currentStock: 10,
      unit: "bird",
      itemType: "CHICKS",
      rate: 25,
    });
    expect(chicks.status).toBe(201);
    chicksItemId = chicks.body.data.id;

    const batch = await api.post("/batches", {
      batchNumber: `SALES-${suffix}`,
      startDate: now,
      batchType: "BROILER",
      farmId,
      chicksInventory: [{ itemId: chicksItemId, quantity: 10 }],
    });
    expect(batch.status).toBe(201);
    batchId = batch.body.data.id;

    const customer = await api.post("/sales/customers", {
      name: `Ledger customer ${suffix}`,
      phone: `98${suffix.slice(-8)}`,
      category: "Trader",
      openingBalance: 100,
      openingBalanceNotes: "Before ledger test",
    });
    expect(customer.status).toBe(201);
    customerId = customer.body.data.id;
  });

  afterAll(async () => {
    if (saleId) await api.delete(`/sales/${saleId}`);
    if (customerId) await api.delete(`/sales/customers/${customerId}`);
    if (batchId) await api.delete(`/batches/${batchId}`);
    if (chicksItemId) {
      await api.put(`/inventory/${chicksItemId}`, { currentStock: 0 });
      await api.delete(`/inventory/${chicksItemId}`);
    }
    if (farmId) await api.delete(`/farms/${farmId}`, { password });
  });

  it("keeps credit sales, payments, customer balance, and bird stock in sync", async () => {
    const sale = await api.post("/sales", {
      date: now,
      amount: 1,
      quantity: 3,
      weight: 6,
      unitPrice: 100,
      farmId,
      batchId,
      customerId,
      itemType: "Chicken_Meat",
      isCredit: true,
      paidAmount: 100,
      description: "Ledger test chicken sale",
    });
    expect(sale.status).toBe(201);
    saleId = sale.body.data.id;
    expect(sale.body.data).toMatchObject({ isCredit: true, customer: { id: customerId } });
    // Decimal values currently arrive as strings; coercion keeps this journey
    // test focused on the ledger math. The API type mismatch is tracked in
    // test-finding.md.
    expect(Number(sale.body.data.amount)).toBe(600);
    expect(Number(sale.body.data.paidAmount)).toBe(100);
    expect(Number(sale.body.data.dueAmount)).toBe(500);
    expect(Number(sale.body.data.quantity)).toBe(3);
    expect(Number(sale.body.data.weight)).toBe(6);
    expect(Number(sale.body.data.customer.balance)).toBe(600);

    const [salesList, batchSales, customerAfterSale] = await Promise.all([
      api.get(`/sales?customerId=${customerId}&isCredit=true`),
      api.get(`/sales/batch/${batchId}`),
      api.get(`/sales/customers/${customerId}`),
    ]);
    expect(salesList.status).toBe(200);
    expect(salesList.body.summary).toMatchObject({
      totalCount: 1,
      totalAmount: 600,
      creditSales: 1,
      creditDueAmount: 500,
    });
    expect(salesList.body.data[0]).toMatchObject({ id: saleId, invoiceNumber: expect.any(String) });
    expect(batchSales.status).toBe(200);
    expect(batchSales.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: saleId })]));
    expect(customerAfterSale.status).toBe(200);
    expect(Number(customerAfterSale.body.data.balance)).toBe(600);
    expect(Number(customerAfterSale.body.data.openingBalance.amount)).toBe(100);

    // The sale has left seven birds. Eight more cannot be sold.
    const tooManyBirds = await api.post("/sales", {
      date: now,
      amount: 1,
      quantity: 8,
      weight: 16,
      unitPrice: 100,
      farmId,
      batchId,
      itemType: "Chicken_Meat",
      isCredit: false,
    });
    expect(tooManyBirds.status).toBe(400);
    expect(tooManyBirds.body.message).toContain("Only 7 birds available");

    const payment = await api.post(`/sales/${saleId}/payments`, {
      amount: 200,
      date: now,
      description: "Part payment",
    });
    expect(payment.status).toBe(201);
    expect(Number(payment.body.data.paidAmount)).toBe(300);
    expect(Number(payment.body.data.dueAmount)).toBe(300);

    const overPayment = await api.post(`/sales/${saleId}/payments`, { amount: 301 });
    expect(overPayment.status).toBe(400);
    expect(overPayment.body.message).toContain("cannot exceed due amount");

    const [payments, customerAfterPayment] = await Promise.all([
      api.get(`/sales/payments?customerId=${customerId}&limit=20`),
      api.get(`/sales/customers/${customerId}`),
    ]);
    expect(payments.status).toBe(200);
    const receipt = payments.body.data.find((entry: { source: string; amount: number }) =>
      entry.source === "CUSTOMER_RECEIPT" && entry.amount === 200
    );
    expect(receipt).toBeDefined();
    customerPaymentId = receipt.id;
    expect(Number(customerAfterPayment.body.data.balance)).toBe(400);

    const wrongPassword = await api.delete(`/sales/customers/${customerId}/payments/${customerPaymentId}`, {
      password: "wrong-password",
    });
    expect(wrongPassword.status).toBe(401);

    const deletePayment = await api.delete(`/sales/customers/${customerId}/payments/${customerPaymentId}`, { password });
    expect(deletePayment.status).toBe(200);

    const [saleAfterPaymentDelete, customerAfterPaymentDelete] = await Promise.all([
      api.get(`/sales/${saleId}`),
      api.get(`/sales/customers/${customerId}`),
    ]);
    expect(Number(saleAfterPaymentDelete.body.data.paidAmount)).toBe(100);
    expect(Number(saleAfterPaymentDelete.body.data.dueAmount)).toBe(500);
    expect(Number(customerAfterPaymentDelete.body.data.balance)).toBe(600);

    const deleteSale = await api.delete(`/sales/${saleId}`);
    expect(deleteSale.status).toBe(200);
    saleId = undefined;

    const customerAfterSaleDelete = await api.get(`/sales/customers/${customerId}`);
    expect(customerAfterSaleDelete.status).toBe(200);
    expect(Number(customerAfterSaleDelete.body.data.balance)).toBe(100);
  });
});
