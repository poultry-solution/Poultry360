import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { ApiHelper } from "../helpers/api.helper";
import prisma from "../../src/utils/prisma";
import { dispatchDueReminders } from "../../src/services/reminderDispatcher";

/**
 * Feed dealer reminders: link to a customer (money to collect) or a manual
 * company (money to pay), with an optional amount. Lists show what they owe
 * now and how much was paid since the reminder was made.
 */
describe("Dealer reminders API", () => {
  const owner = new ApiHelper();
  const other = new ApiHelper();
  const staff = new ApiHelper();
  const farmer = new ApiHelper();
  const password = "Dealer-reminder-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-8);
  const ids: { users: string[]; dealers: string[] } = { users: [], dealers: [] };
  let ownerId: string;
  let customerId: string;
  let otherCustomerId: string;
  let companyId: string;
  let staffUserId: string;
  const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async function makeDealer(api: ApiHelper, tag: string) {
    const phone = `+97795${tag}${suffix.slice(-7)}`;
    const user = await prisma.user.create({
      data: { phone, name: `Reminder Dealer ${tag}`, password: await bcrypt.hash(password, 10), role: "DEALER", status: "ACTIVE" },
    });
    const dealer = await prisma.dealer.create({ data: { name: `Reminder Dealer ${tag} ${suffix}`, contact: phone, ownerId: user.id } });
    ids.users.push(user.id);
    ids.dealers.push(dealer.id);
    const login = await api.post("/auth/login", { emailOrPhone: phone, password });
    expect(login.status).toBe(200);
    api.setAuthToken(login.body.accessToken);
    return { userId: user.id, dealerId: dealer.id };
  }
  const listActive = async (api: ApiHelper) => (await api.get("/reminders")).body.data as any[];
  const find = async (api: ApiHelper, id: string) => (await listActive(api)).find((r) => r.id === id);

  beforeAll(async () => {
    const a = await makeDealer(owner, "1");
    ownerId = a.userId;
    const b = await makeDealer(other, "2");
    customerId = (
      await prisma.customer.create({ data: { name: `Ram ${suffix}`, phone: "9800000001", userId: a.userId, source: "MANUAL", balance: new Prisma.Decimal(1000) } })
    ).id;
    otherCustomerId = (
      await prisma.customer.create({ data: { name: `Hari ${suffix}`, userId: b.userId, source: "MANUAL", balance: new Prisma.Decimal(50) } })
    ).id;
    companyId = (
      await prisma.dealerManualCompany.create({ data: { name: `Shree Feeds ${suffix}`, dealerId: a.dealerId, balance: new Prisma.Decimal(5000) } })
    ).id;

    const farmerReg = await farmer.post("/auth/register", { name: `Reminder Farmer ${suffix}`, phone: `+97784${suffix}`, password, role: "OWNER" });
    expect(farmerReg.status).toBe(201);
    ids.users.push(farmerReg.body.user.id);
    farmer.setAuthToken(farmerReg.body.accessToken);
    expect((await farmer.post("/test/approve-current-user")).status).toBe(200);
  });

  afterAll(async () => {
    await wait(200);
    await prisma.businessAuditLog.deleteMany({ where: { OR: [{ accountOwnerId: { in: ids.users } }, { actorId: { in: ids.users } }] } });
    await prisma.reminder.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.notification.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.dealer.deleteMany({ where: { id: { in: ids.dealers } } });
    await prisma.customer.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.farm.deleteMany({ where: { ownerId: { in: ids.users } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
  });

  it("shows owes now and only payments made after the reminder", async () => {
    // Paid before the reminder: not counted.
    expect((await owner.post("/dealer/ledger/payments", { customerId, amount: 100, direction: "RECEIVED" })).status).toBe(200);
    await wait(20);
    const made = await owner.post("/reminders", {
      title: "Collect from Ram",
      reminderDate: inMinutes(60),
      dealerCustomerId: customerId,
      amount: 600,
    });
    expect(made.status).toBe(201);
    expect(Number(made.body.data.amount)).toBe(600);
    await wait(20);
    expect((await owner.post("/dealer/ledger/payments", { customerId, amount: 300, direction: "RECEIVED" })).status).toBe(200);

    const row = await find(owner, made.body.data.id);
    expect(row.dealerCustomer).toMatchObject({ id: customerId, phone: "9800000001" });
    expect(row.money).toEqual({ owesNow: 600, paidSince: 300 });
  });

  it("does the same for money we owe a company, without voided payments", async () => {
    const made = await owner.post("/reminders", {
      title: "Pay Shree Feeds",
      reminderDate: inMinutes(60),
      dealerManualCompanyId: companyId,
      amount: 5000,
    });
    expect(made.status).toBe(201);
    await wait(20);
    const paid = await owner.post(`/dealer/manual-companies/${companyId}/payments`, { amount: 2000, direction: "MADE" });
    expect(paid.status).toBeLessThan(300);
    const wrong = await owner.post(`/dealer/manual-companies/${companyId}/payments`, { amount: 500, direction: "MADE" });
    expect(wrong.status).toBeLessThan(300);
    const wrongId = wrong.body.data?.id ?? wrong.body.payment?.id ?? wrong.body.data?.payment?.id;
    expect((await owner.delete(`/dealer/manual-companies/${companyId}/payments/${wrongId}`, { reason: "Entered twice" })).status).toBeLessThan(300);

    const row = await find(owner, made.body.data.id);
    expect(row.money).toEqual({ owesNow: 3000, paidSince: 2000 });
  });

  it("refuses wrong links and amounts", async () => {
    const base = { title: "T", reminderDate: inMinutes(30) };
    expect((await owner.post("/reminders", { ...base, dealerCustomerId: otherCustomerId })).status).toBe(404);
    expect((await owner.post("/reminders", { ...base, dealerCustomerId: customerId, dealerManualCompanyId: companyId })).status).toBe(400);
    expect((await owner.post("/reminders", { ...base, dealerCustomerId: customerId, amount: 0 })).status).toBe(400);
    expect((await owner.post("/reminders", { ...base, amount: -5 })).status).toBe(400);
    expect((await owner.post("/reminders", { ...base, batchId: "x" })).status).toBe(400);
    // Farmer and hatchery reminders stay as they were: no amount, no dealer links.
    expect((await farmer.post("/reminders", { ...base, amount: 100 })).status).toBe(400);
    expect((await farmer.post("/reminders", { ...base, dealerCustomerId: customerId })).status).toBe(400);
    // A general dealer reminder needs no link or amount.
    expect((await owner.post("/reminders", { ...base, title: "Order maize" })).status).toBe(201);
  });

  it("keeps link and amount when a repeating reminder is done", async () => {
    const made = await owner.post("/reminders", {
      title: "Monthly Shree Feeds",
      reminderDate: inMinutes(10),
      dealerManualCompanyId: companyId,
      amount: 1500,
      repeat: "MONTHLY",
    });
    expect(made.status).toBe(201);
    const done = await owner.post(`/reminders/${made.body.data.id}/done`, {});
    expect(done.status).toBe(200);
    const next = await prisma.reminder.findFirstOrThrow({ where: { repeatedFromId: made.body.data.id } });
    expect(next.dealerManualCompanyId).toBe(companyId);
    expect(Number(next.amount)).toBe(1500);
  });

  it("sends the alert with a link to the customer account", async () => {
    const made = await owner.post("/reminders", { title: "Call Ram", reminderDate: inMinutes(5), dealerCustomerId: customerId, amount: 600 });
    await prisma.reminder.update({ where: { id: made.body.data.id }, data: { reminderDate: new Date(Date.now() - 120_000) } });
    await dispatchDueReminders();
    const sent = await prisma.notification.findFirst({ where: { userId: ownerId, data: { path: ["reminderId"], equals: made.body.data.id } } });
    expect(sent).not.toBeNull();
    expect((sent!.data as any).url).toBe(`/dealer/dashboard/customers/${customerId}/account`);
    expect(sent!.body).toMatch(/Customer: Ram .* · रू 600/);
  });

  it("lets dealer staff use reminders and writes dealer activity", async () => {
    await prisma.accountFeature.upsert({
      where: { accountId_featureKey: { accountId: ownerId, featureKey: "DEALER_STAFF_OPERATIONS" } },
      update: { enabled: true },
      create: { accountId: ownerId, featureKey: "DEALER_STAFF_OPERATIONS", enabled: true },
    });
    const phone = `+97794${suffix.slice(-8)}`;
    const created = await owner.post("/staff-auth/users", { name: `Dealer staff ${suffix}`, phone, password, permissions: [] });
    expect(created.status).toBe(201);
    staffUserId = created.body.data.id;
    const login = await staff.post("/staff-auth/login", { phone, password });
    expect(login.status).toBe(200);
    staff.setAuthToken(login.body.accessToken);

    const people = await owner.get("/reminders/people");
    expect(people.body.data.staff.map((s: any) => s.id)).toContain(staffUserId);

    const mine = await staff.post("/reminders", { title: "Staff: collect from Ram", reminderDate: inMinutes(30), dealerCustomerId: customerId });
    expect(mine.status).toBe(201);
    expect((await listActive(staff)).map((r) => r.id)).toContain(mine.body.data.id);
    expect((await listActive(owner)).map((r) => r.id)).toContain(mine.body.data.id);

    await wait(300);
    const audit = await prisma.businessAuditLog.findFirst({ where: { accountOwnerId: ownerId, action: { startsWith: "dealer.reminder" } } });
    expect(audit?.description).toBe("Added a reminder");
  });
});
