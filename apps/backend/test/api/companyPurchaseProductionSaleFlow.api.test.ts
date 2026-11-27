import dotenv from "dotenv";
import request from "supertest";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";

/**
 * Scenario from issue #164 follow-up: when a purchase is used in a production
 * run, and the production's output is then sold, can the user walk back the
 * chain by deleting the sale first, then (eventually) the purchase?
 *
 * Expected answer today: **no**. Production runs have no DELETE endpoint
 * (companyProductionRoutes.ts only exposes POST + GETs), so the raw-material
 * stock stays reduced after a sale delete, and the purchase delete's
 * `gte: qty` guard correctly refuses.
 *
 * This test documents that state so the next PR that adds ProductionRun
 * delete has a working integration regression to anchor against.
 */
describe("Company purchase → production → sale → delete chain", () => {
  const password = "Company-chain-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const today = new Date().toISOString().slice(0, 10);

  let app: Express;
  let prisma: PrismaClient;

  let ownerId: string;
  let ownerToken: string;
  let supplierId: string;
  let rawMaterialId: string;
  let productId: string;
  let customerDealerId: string;
  let purchaseId: string;
  let productionRunId: string;
  let saleId: string;

  function post(token: string, path: string, body?: string | object) {
    return request(app)
      .post(`/api/v1${path}`)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  function get(token: string, path: string) {
    return request(app).get(`/api/v1${path}`).set("Authorization", `Bearer ${token}`);
  }

  function del(token: string, path: string, body?: string | object) {
    return request(app)
      .delete(`/api/v1${path}`)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  async function registerCompany() {
    const phone = `+9779${suffix}`;
    const registration = await request(app)
      .post("/api/v1/auth/register-entity")
      .send({
        name: `Chain Test Owner ${suffix}`,
        phone,
        password,
        entityType: "COMPANY",
        entityName: `Chain Test Feed Co ${suffix}`,
        entityAddress: "Test city",
      });
    expect(registration.status).toBe(201);

    const token = registration.body.accessToken as string;
    const approval = await post(token, "/test/approve-current-user");
    expect(approval.status).toBe(200);

    return { id: registration.body.user.id as string, token };
  }

  beforeAll(async () => {
    dotenv.config({ path: ".env.test" });
    dotenv.config({ path: ".env" });

    app = (await import("../../src/index")).default as unknown as Express;
    prisma = (await import("../../src/utils/prisma")).default;

    const owner = await registerCompany();
    ownerId = owner.id;
    ownerToken = owner.token;
  }, 60_000);

  afterAll(async () => {
    if (ownerId) {
      await prisma.user.delete({ where: { id: ownerId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("creates supplier + raw material + product + customer-dealer", async () => {
    const supplierRes = await post(ownerToken, "/company/suppliers", {
      name: "Chain Test Supplier",
      contact: "9855400001",
      address: "Birgunj",
    });
    expect(supplierRes.status).toBe(201);
    supplierId = supplierRes.body.data.id;

    const rawMaterialRes = await post(ownerToken, "/company/raw-materials", {
      name: "Maize",
      unit: "kg",
    });
    expect(rawMaterialRes.status).toBe(201);
    rawMaterialId = rawMaterialRes.body.data.id;

    const productRes = await post(ownerToken, "/company/products", {
      name: "Broiler Starter Feed",
      type: "FEED",
      unit: "kg",
      unitSellingPrice: 72,
      unitCostPrice: 56,
      quantity: 0,
    });
    expect(productRes.status).toBe(201);
    productId = productRes.body.data.id;

    const dealerRes = await post(ownerToken, "/dealers", {
      name: "Chain Test Customer",
      contact: "9855400002",
      address: "Narayangadh",
    });
    expect(dealerRes.status).toBe(201);
    customerDealerId = dealerRes.body.data.id;
  });

  it("creates purchase: raw-material stock goes from 0 to 500", async () => {
    const purchaseRes = await post(ownerToken, "/company/purchases", {
      supplierId,
      date: today,
      items: [{ rawMaterialId, quantity: 500, unitPrice: 20 }],
    });
    expect(purchaseRes.status).toBe(201);
    purchaseId = purchaseRes.body.data.id;

    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id: rawMaterialId },
      select: { currentStock: true },
    });
    expect(Number(rawMaterial?.currentStock)).toBe(500);
  });

  it("creates production run: raw material -100, product stock +100", async () => {
    const productionRes = await post(ownerToken, "/company/production", {
      date: today,
      inputs: [{ rawMaterialId, supplierId, unitPrice: 20, quantity: 100 }],
      outputs: [{ productId, quantity: 100 }],
    });
    expect(productionRes.status).toBe(201);
    productionRunId = productionRes.body.data.id;

    const [rawMaterial, product] = await Promise.all([
      prisma.rawMaterial.findUnique({
        where: { id: rawMaterialId },
        select: { currentStock: true },
      }),
      prisma.product.findUnique({
        where: { id: productId },
        select: { currentStock: true },
      }),
    ]);
    expect(Number(rawMaterial?.currentStock)).toBe(400);
    expect(Number(product?.currentStock)).toBe(100);
  });

  it("creates sale: product stock 100 → 50, dealer balance +3600", async () => {
    const saleRes = await post(ownerToken, "/company/sales", {
      dealerId: customerDealerId,
      date: today,
      paymentMethod: "CASH",
      items: [{ productId, quantity: 50, unitPrice: 72 }],
    });
    expect(saleRes.status).toBe(201);
    saleId = saleRes.body.data.id;

    const [product, dealerAccount] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId },
        select: { currentStock: true },
      }),
      prisma.companyDealerAccount.findFirst({
        where: { dealerId: customerDealerId },
        select: { balance: true, totalSales: true },
      }),
    ]);
    expect(Number(product?.currentStock)).toBe(50);
    expect(Number(dealerAccount?.balance)).toBe(3600);
    expect(Number(dealerAccount?.totalSales)).toBe(3600);
  });

  it("purchase delete BEFORE sale delete: refused because material was consumed", async () => {
    const res = await del(ownerToken, `/company/purchases/${purchaseId}`, { password });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/partially consumed/i);

    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id: rawMaterialId },
      select: { currentStock: true },
    });
    expect(Number(rawMaterial?.currentStock)).toBe(400);
  });

  it("sale delete: product stock restored, dealer balance reversed", async () => {
    const res = await del(ownerToken, `/company/sales/${saleId}`, { password });
    expect(res.status).toBe(200);

    const [product, dealerAccount] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId },
        select: { currentStock: true },
      }),
      prisma.companyDealerAccount.findFirst({
        where: { dealerId: customerDealerId },
        select: { balance: true, totalSales: true },
      }),
    ]);
    expect(Number(product?.currentStock)).toBe(100);
    expect(Number(dealerAccount?.balance)).toBe(0);
    expect(Number(dealerAccount?.totalSales)).toBe(0);
  });

  it("GAP: no DELETE endpoint for production run", async () => {
    const res = await del(ownerToken, `/company/production/${productionRunId}`);
    // 404 or 405 — either way, the route doesn't exist.
    expect([404, 405]).toContain(res.status);
  });

  it("purchase delete AFTER sale delete: STILL refused (production still holds 100 kg)", async () => {
    const res = await del(ownerToken, `/company/purchases/${purchaseId}`, { password });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/partially consumed/i);

    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id: rawMaterialId },
      select: { currentStock: true },
    });
    expect(Number(rawMaterial?.currentStock)).toBe(400);
  });

  it("if we reverse the production inputs by hand, purchase delete works", async () => {
    // Simulates what a future DELETE /company/production/:id handler would do:
    // delete ProductionInput rows (cascades from production run delete) and
    // increment raw-material stock. We also undo the product side so the
    // test teardown is clean.
    await prisma.$transaction(async (tx) => {
      const inputs = await tx.productionInput.findMany({
        where: { productionId: productionRunId },
      });
      for (const input of inputs) {
        await tx.rawMaterial.update({
          where: { id: input.rawMaterialId },
          data: { currentStock: { increment: input.quantity } },
        });
      }
      const outputs = await tx.productionOutput.findMany({
        where: { productionId: productionRunId },
      });
      for (const output of outputs) {
        if (output.productId) {
          await tx.product.update({
            where: { id: output.productId },
            data: { currentStock: { decrement: output.quantity } },
          });
        }
      }
      await tx.productionRun.delete({ where: { id: productionRunId } });
    });

    const res = await del(ownerToken, `/company/purchases/${purchaseId}`, { password });
    expect(res.status).toBe(200);

    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id: rawMaterialId },
      select: { currentStock: true },
    });
    expect(Number(rawMaterial?.currentStock)).toBe(0);
  });

  /**
   * Regression test for the exact scenario a user hit against commit 705ebc6
   * (aggregate-only guard):
   *
   *   - 100 kg Maize @ ₨25 from Supplier A  (bucket A@25)
   *   - 100 kg Maize @ ₨20 from Supplier B  (bucket B@20) — keeps aggregate high
   *   - Production uses 70 kg from bucket A@25
   *   - Try to delete the A@25 purchase
   *
   * Aggregate check says: stock 130 ≥ 100 → ALLOW (wrong).
   * Bucket check says:    A@25 remaining = 30 < 100 → REFUSE (correct).
   */
  it("multi-bucket: refuses A-bucket delete when A was consumed but B masks aggregate", async () => {
    const supplierBRes = await post(ownerToken, "/company/suppliers", {
      name: "Bucket Masker Supplier B",
      contact: "9855400099",
      address: "Birgunj",
    });
    expect(supplierBRes.status).toBe(201);
    const supplierBId = supplierBRes.body.data.id;

    const buyARes = await post(ownerToken, "/company/purchases", {
      supplierId,
      date: today,
      items: [{ rawMaterialId, quantity: 100, unitPrice: 25 }],
    });
    expect(buyARes.status).toBe(201);
    const purchaseAId = buyARes.body.data.id;

    const buyBRes = await post(ownerToken, "/company/purchases", {
      supplierId: supplierBId,
      date: today,
      items: [{ rawMaterialId, quantity: 100, unitPrice: 20 }],
    });
    expect(buyBRes.status).toBe(201);
    const purchaseBId = buyBRes.body.data.id;

    // Aggregate is now 0 (previous test's hand-reversal) + 100 + 100 = 200.
    // After consuming 70 kg from A@25, aggregate = 130 — still ≥ 100 → the
    // aggregate-only guard would let the delete through.
    const productionRes = await post(ownerToken, "/company/production", {
      date: today,
      inputs: [{ rawMaterialId, supplierId, unitPrice: 25, quantity: 70 }],
      outputs: [{ productId, quantity: 70 }],
    });
    expect(productionRes.status).toBe(201);
    const multiBucketRunId = productionRes.body.data.id;

    const rmBefore = await prisma.rawMaterial.findUnique({
      where: { id: rawMaterialId },
      select: { currentStock: true },
    });
    expect(Number(rmBefore?.currentStock)).toBe(130);

    const del1 = await del(ownerToken, `/company/purchases/${purchaseAId}`, { password });
    expect(del1.status).toBe(400);
    expect(del1.body.message).toMatch(/at this supplier\/rate has been partially consumed/i);
    expect(del1.body.message).toMatch(/Remaining in this bucket: 30/);
    expect(del1.body.message).toMatch(/trying to reverse: 100/);

    // Nothing changed.
    const rmAfterRefusal = await prisma.rawMaterial.findUnique({
      where: { id: rawMaterialId },
      select: { currentStock: true },
    });
    expect(Number(rmAfterRefusal?.currentStock)).toBe(130);

    // Bucket B is untouched. Deleting the B purchase is safe.
    const del2 = await del(ownerToken, `/company/purchases/${purchaseBId}`, { password });
    expect(del2.status).toBe(200);
    const rmAfterB = await prisma.rawMaterial.findUnique({
      where: { id: rawMaterialId },
      select: { currentStock: true },
    });
    expect(Number(rmAfterB?.currentStock)).toBe(30);

    // Teardown: hand-reverse the production so the aggregate matches the
    // (now untouched) A@25 purchase, then delete A.
    await prisma.$transaction(async (tx) => {
      const inputs = await tx.productionInput.findMany({
        where: { productionId: multiBucketRunId },
      });
      for (const input of inputs) {
        await tx.rawMaterial.update({
          where: { id: input.rawMaterialId },
          data: { currentStock: { increment: input.quantity } },
        });
      }
      const outputs = await tx.productionOutput.findMany({
        where: { productionId: multiBucketRunId },
      });
      for (const output of outputs) {
        if (output.productId) {
          await tx.product.update({
            where: { id: output.productId },
            data: { currentStock: { decrement: output.quantity } },
          });
        }
      }
      await tx.productionRun.delete({ where: { id: multiBucketRunId } });
    });
    const del3 = await del(ownerToken, `/company/purchases/${purchaseAId}`, { password });
    expect(del3.status).toBe(200);
  });
});
