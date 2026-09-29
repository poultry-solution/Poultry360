import bcrypt from "bcrypt";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "../../src/index";
import prisma from "../../src/utils/prisma";
import { DealerService } from "../../src/services/dealerService";

const TEST_PHONE = "+9779800000998";
const TEST_PASSWORD = "payment-direction-test-password";
const TEST_CUSTOMER_NAME = "Payment Direction Test Customer";
const TEST_COMPANY_NAME = "Payment Direction Test Company";

describe("Dealer payment direction number checks", () => {
  let token = "";
  let dealerId = "";
  let customerId = "";
  let companyId = "";

  const authRequest = (method: "get" | "post" | "patch" | "delete", url: string) =>
    request(app)[method](`/api/v1${url}`).set("Authorization", `Bearer ${token}`);

  const numberValue = (value: unknown) => Number(value);

  const cleanTestData = async () => {
    const user = await prisma.user.findUnique({
      where: { phone: TEST_PHONE },
      select: { id: true, dealer: { select: { id: true } } },
    });

    if (!user) return;

    if (user.dealer) {
      await prisma.dealerLedgerEntry.deleteMany({ where: { dealerId: user.dealer.id } });
      await prisma.dealerManualCompany.deleteMany({ where: { dealerId: user.dealer.id } });
      await prisma.customer.deleteMany({
        where: { userId: user.id, name: TEST_CUSTOMER_NAME },
      });
      await prisma.dealer.delete({ where: { id: user.dealer.id } });
    }

    await prisma.user.delete({ where: { id: user.id } });
  };

  beforeAll(async () => {
    await cleanTestData();

    const password = await bcrypt.hash(TEST_PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        phone: TEST_PHONE,
        name: "Payment Direction Test Dealer",
        password,
        role: "DEALER",
        status: "ACTIVE",
      },
    });

    const dealer = await prisma.dealer.create({
      data: {
        name: "Payment Direction Test Dealer",
        contact: TEST_PHONE,
        ownerId: user.id,
      },
    });

    const customer = await prisma.customer.create({
      data: {
        name: TEST_CUSTOMER_NAME,
        userId: user.id,
        source: "MANUAL",
        balance: new Prisma.Decimal(500),
      },
    });

    const company = await prisma.dealerManualCompany.create({
      data: {
        name: TEST_COMPANY_NAME,
        dealerId: dealer.id,
        balance: new Prisma.Decimal(500),
      },
    });

    dealerId = dealer.id;
    customerId = customer.id;
    companyId = company.id;

    const login = await request(app).post("/api/v1/auth/login").send({
      emailOrPhone: TEST_PHONE,
      password: TEST_PASSWORD,
    });

    expect(login.status).toBe(200);
    token = login.body.accessToken;
  });

  afterAll(async () => {
    await cleanTestData();
    await prisma.$disconnect();
  });

  it("keeps the Dealer payment direction setting account-scoped", async () => {
    const initial = await authRequest("get", "/dealer/settings/payment-direction");
    expect(initial.status).toBe(200);
    expect(initial.body.data.paymentDirectionEnabled).toBe(false);

    const enabled = await authRequest("patch", "/dealer/settings/payment-direction")
      .send({ paymentDirectionEnabled: true });
    expect(enabled.status).toBe(200);
    expect(enabled.body.data.paymentDirectionEnabled).toBe(true);

    const disabled = await authRequest("patch", "/dealer/settings/payment-direction")
      .send({ paymentDirectionEnabled: false });
    expect(disabled.status).toBe(200);
    expect(disabled.body.data.paymentDirectionEnabled).toBe(false);
  });

  it("keeps customer, supplier, and settlement numbers correct", async () => {
    const customerReceived = await authRequest("post", "/dealer/ledger/payments").send({
      customerId,
      amount: 200,
      direction: "RECEIVED",
    });
    expect(customerReceived.status).toBe(200);

    let customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    expect(numberValue(customer.balance)).toBe(300);
    expect(numberValue(customer.totalPayments)).toBe(200);

    const customerAdvance = await authRequest("post", "/dealer/ledger/payments").send({
      customerId,
      amount: 100,
      direction: "MADE",
    });
    expect(customerAdvance.status).toBe(200);

    customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    expect(numberValue(customer.balance)).toBe(400);
    expect(numberValue(customer.totalPayments)).toBe(200);

    const balanceBeforeSettlement = await prisma.dealerLedgerEntry.findFirstOrThrow({
      where: { dealerId },
      orderBy: { createdAt: "desc" },
    });

    const settlementPayout = await DealerService.addAccountPayment({
      customerId,
      dealerId,
      amount: 50,
      date: new Date(),
      direction: "MADE",
      affectsCustomerBalance: false,
      description: "Test Broiler payout",
    });
    expect(settlementPayout.newCustomerBalance).toBe(400);

    const balanceAfterSettlement = await prisma.dealerLedgerEntry.findFirstOrThrow({
      where: { dealerId },
      orderBy: { createdAt: "desc" },
    });
    expect(numberValue(balanceAfterSettlement.balance)).toBe(
      numberValue(balanceBeforeSettlement.balance),
    );
    expect(balanceAfterSettlement.affectsCustomerBalance).toBe(false);

    const supplierMade = await authRequest("post", `/dealer/manual-companies/${companyId}/payments`).send({
      amount: 200,
      direction: "MADE",
    });
    expect(supplierMade.status).toBe(201);

    let company = await prisma.dealerManualCompany.findUniqueOrThrow({ where: { id: companyId } });
    expect(numberValue(company.balance)).toBe(300);
    expect(numberValue(company.totalPayments)).toBe(200);

    const supplierReceived = await authRequest("post", `/dealer/manual-companies/${companyId}/payments`).send({
      amount: 100,
      direction: "RECEIVED",
    });
    expect(supplierReceived.status).toBe(201);

    company = await prisma.dealerManualCompany.findUniqueOrThrow({ where: { id: companyId } });
    expect(numberValue(company.balance)).toBe(400);
    expect(numberValue(company.totalPayments)).toBe(200);

    const voidReceived = await authRequest(
      "delete",
      `/dealer/manual-companies/${companyId}/payments/${supplierReceived.body.data.id}`,
    ).send({ reason: "Number check" });
    expect(voidReceived.status).toBe(200);

    company = await prisma.dealerManualCompany.findUniqueOrThrow({ where: { id: companyId } });
    expect(numberValue(company.balance)).toBe(300);
    expect(numberValue(company.totalPayments)).toBe(200);

    const voidMade = await authRequest(
      "delete",
      `/dealer/manual-companies/${companyId}/payments/${supplierMade.body.data.id}`,
    ).send({ reason: "Number check" });
    expect(voidMade.status).toBe(200);

    company = await prisma.dealerManualCompany.findUniqueOrThrow({ where: { id: companyId } });
    expect(numberValue(company.balance)).toBe(500);
    expect(numberValue(company.totalPayments)).toBe(0);
  });
});
