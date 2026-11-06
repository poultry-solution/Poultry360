import NepaliDate from "nepali-date-converter";
import { ReminderRepeat } from "@prisma/client";
import { ApiHelper } from "../helpers/api.helper";
import prisma from "../../src/utils/prisma";
import { dispatchDueReminders } from "../../src/services/reminderDispatcher";
import { moduleForRole, nextRepeatDate } from "../../src/services/reminderService";

/**
 * Shared reminders (farmer + hatchery): who can see them, who gets the
 * alert, link checks, done / undo / snooze / repeat, and staff inboxes.
 *
 * The dispatcher is called directly (it does not run when NODE_ENV=test).
 * It sends every due reminder in the database, so tests only assert on the
 * reminders they made.
 */
describe("Reminders API", () => {
  const owner = new ApiHelper();
  const staff1 = new ApiHelper();
  const staff2 = new ApiHelper();
  const otherOwner = new ApiHelper();
  const farmer = new ApiHelper();

  const password = "Reminder-test-owner-123";
  const staffPassword = "Reminder-test-staff-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-9);

  let ownerId: string;
  let otherOwnerId: string;
  let farmerId: string;
  let staff1Id: string;
  let staff2Id: string;
  let ownPartyId: string;
  let ownBatchId: string;
  let otherPartyId: string;
  let farmId: string;
  let otherFarmId: string;
  let farmBatchId: string;

  const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
  const pastMinutes = (m: number) => new Date(Date.now() - m * 60_000);

  async function registerHatchery(api: ApiHelper, tag: string) {
    const res = await api.post("/auth/register-entity", {
      name: `Reminder ${tag} ${suffix}`,
      phone: `+97797${tag === "A" ? "1" : "2"}${suffix.slice(-7)}`,
      password,
      entityType: "HATCHERY",
      entityName: `Reminder Hatchery ${tag} ${suffix}`,
      entityContact: `98${tag === "A" ? "1" : "2"}${suffix.slice(-7)}`,
      entityAddress: "Test city",
    });
    expect(res.status).toBe(201);
    api.setAuthToken(res.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);
    return res.body.user.id as string;
  }

  async function makeStaff(api: ApiHelper, n: number) {
    const phone = `+97796${n}${suffix.slice(-7)}`;
    const created = await owner.post("/staff-auth/users", {
      name: `Staff ${n} ${suffix}`,
      phone,
      password: staffPassword,
      permissions: ["HATCHERY_MANAGE_OPERATIONS"],
    });
    expect(created.status).toBe(201);
    const login = await api.post("/staff-auth/login", { phone, password: staffPassword });
    expect(login.status).toBe(200);
    api.setAuthToken(login.body.accessToken);
    return created.body.data.id as string;
  }

  /** Move a reminder's time into the past so the dispatcher picks it up. */
  async function makeDue(id: string) {
    await prisma.reminder.update({ where: { id }, data: { reminderDate: pastMinutes(2) } });
  }

  async function inboxFor(reminderId: string) {
    const rows = await prisma.notification.findMany({
      where: { data: { path: ["reminderId"], equals: reminderId } },
      select: { userId: true, staffUserId: true },
    });
    return rows.map((r) => r.staffUserId ?? "OWNER").sort();
  }

  beforeAll(async () => {
    ownerId = await registerHatchery(owner, "A");
    otherOwnerId = await registerHatchery(otherOwner, "B");
    staff1Id = await makeStaff(staff1, 1);
    staff2Id = await makeStaff(staff2, 2);

    const farmerReg = await farmer.post("/auth/register", {
      name: `Reminder Farmer ${suffix}`,
      phone: `+97783${suffix}`,
      password,
      role: "OWNER",
    });
    expect(farmerReg.status).toBe(201);
    farmerId = farmerReg.body.user.id;
    farmer.setAuthToken(farmerReg.body.accessToken);
    expect((await farmer.post("/test/approve-current-user")).status).toBe(200);

    ownPartyId = (
      await prisma.hatcheryParty.create({
        data: { hatcheryOwnerId: ownerId, name: "Own party", phone: `97${suffix.slice(-8)}` },
      })
    ).id;
    ownBatchId = (
      await prisma.hatcheryBatch.create({
        data: { hatcheryOwnerId: ownerId, code: `PF-R${suffix.slice(-4)}`, startDate: new Date() },
      })
    ).id;
    otherPartyId = (
      await prisma.hatcheryParty.create({
        data: { hatcheryOwnerId: otherOwnerId, name: "Other party", phone: `96${suffix.slice(-8)}` },
      })
    ).id;
    farmId = (await prisma.farm.create({ data: { name: "Farm A", capacity: 100, ownerId: farmerId } })).id;
    otherFarmId = (await prisma.farm.create({ data: { name: "Farm B", capacity: 100, ownerId: farmerId } })).id;
    farmBatchId = (
      await prisma.batch.create({
        data: { batchNumber: "B-1", startDate: new Date(), initialChicks: 100, farmId },
      })
    ).id;
  });

  afterAll(async () => {
    const ids = [ownerId, otherOwnerId, farmerId].filter(Boolean);
    await new Promise((resolve) => setTimeout(resolve, 150));
    await prisma.businessAuditLog.deleteMany({
      where: { OR: [{ accountOwnerId: { in: ids } }, { actorId: { in: ids } }] },
    });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  it("maps only farmer and hatchery roles to a reminder module", () => {
    expect(moduleForRole("OWNER")).toBe("FARMER");
    expect(moduleForRole("HATCHERY")).toBe("HATCHERY");
    expect(moduleForRole("DEALER")).toBeNull();
    expect(moduleForRole("COMPANY")).toBeNull();
  });

  describe("create checks", () => {
    it("needs a title and a time that is not in the past", async () => {
      expect((await owner.post("/reminders", { title: "  ", reminderDate: inMinutes(5) })).status).toBe(400);
      const past = await owner.post("/reminders", { title: "Old", reminderDate: pastMinutes(10).toISOString() });
      expect(past.status).toBe(400);
      expect(past.body.message).toMatch(/later than now/i);
      expect((await owner.post("/reminders", { title: "x".repeat(201), reminderDate: inMinutes(5) })).status).toBe(400);
    });

    it("blocks links that belong to another account or module", async () => {
      const other = await owner.post("/reminders", { title: "T", reminderDate: inMinutes(5), hatcheryPartyId: otherPartyId });
      expect(other.status).toBe(404);
      const two = await owner.post("/reminders", {
        title: "T", reminderDate: inMinutes(5), hatcheryPartyId: ownPartyId, hatcheryBatchId: ownBatchId,
      });
      expect(two.status).toBe(400);
      const farmOnHatchery = await owner.post("/reminders", { title: "T", reminderDate: inMinutes(5), farmId });
      expect(farmOnHatchery.status).toBe(400);
      const hatcheryOnFarmer = await farmer.post("/reminders", { title: "T", reminderDate: inMinutes(5), hatcheryPartyId: ownPartyId });
      expect(hatcheryOnFarmer.status).toBe(400);
      const wrongFarm = await farmer.post("/reminders", { title: "T", reminderDate: inMinutes(5), farmId: otherFarmId, batchId: farmBatchId });
      expect(wrongFarm.status).toBe(400);
      expect(wrongFarm.body.message).toMatch(/not in the chosen farm/i);
    });

    it("needs at least one person for Pick people, and only own active staff", async () => {
      expect((await owner.post("/reminders", { title: "T", reminderDate: inMinutes(5), audience: "SELECTED", staffIds: [] })).status).toBe(400);
      const bad = await owner.post("/reminders", { title: "T", reminderDate: inMinutes(5), audience: "SELECTED", staffIds: ["not-a-staff"] });
      expect(bad.status).toBe(400);
    });

    it("links a farmer batch and fills in its farm", async () => {
      const res = await farmer.post("/reminders", { title: "Vaccinate", reminderDate: inMinutes(5), batchId: farmBatchId });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ module: "FARMER", farmId, batchId: farmBatchId });
      expect(res.body.data.farm.name).toBe("Farm A");
      // Old app versions still get a list.
      const legacy = await farmer.get("/reminders?type=upcoming");
      expect(legacy.status).toBe(200);
      expect(legacy.body.data.some((r: any) => r.id === res.body.data.id)).toBe(true);
    });
  });

  describe("who sees it and who gets the alert", () => {
    let onlyOwner: string;
    let everyone: string;
    let picked: string;
    let staffPrivate: string;

    beforeAll(async () => {
      onlyOwner = (await owner.post("/reminders", { title: "Owner only", reminderDate: inMinutes(5), hatcheryPartyId: ownPartyId })).body.data.id;
      everyone = (await owner.post("/reminders", { title: "Hatch day", reminderDate: inMinutes(5), audience: "EVERYONE" })).body.data.id;
      picked = (await owner.post("/reminders", { title: "Clean setter", reminderDate: inMinutes(5), audience: "SELECTED", staffIds: [staff1Id] })).body.data.id;
      const mine = await staff2.post("/reminders", { title: "Staff 2 note", reminderDate: inMinutes(5) });
      expect(mine.status).toBe(201);
      expect(mine.body.data.createdByStaff.id).toBe(staff2Id);
      staffPrivate = mine.body.data.id;
    });

    it("owner sees all; staff see Everyone, their own and the ones they are picked for", async () => {
      const ids = (res: any) => res.body.data.map((r: any) => r.id);
      const ownerList = ids(await owner.get("/reminders"));
      expect(ownerList).toEqual(expect.arrayContaining([onlyOwner, everyone, picked, staffPrivate]));

      const s1 = ids(await staff1.get("/reminders?view=active"));
      expect(s1).toEqual(expect.arrayContaining([everyone, picked]));
      expect(s1).not.toContain(onlyOwner);
      expect(s1).not.toContain(staffPrivate);

      const s2 = ids(await staff2.get("/reminders"));
      expect(s2).toEqual(expect.arrayContaining([everyone, staffPrivate]));
      expect(s2).not.toContain(picked);
      expect(s2).not.toContain(onlyOwner);
    });

    it("lists people by name only", async () => {
      const res = await staff1.get("/reminders/people");
      expect(res.status).toBe(200);
      expect(res.body.data.staff.map((s: any) => s.id)).toEqual(expect.arrayContaining([staff1Id, staff2Id]));
      expect(res.body.data.staff[0]).not.toHaveProperty("phone");
    });

    it("only the maker or the owner can change or delete", async () => {
      expect((await staff1.delete(`/reminders/${everyone}`)).status).toBe(403);
      expect((await staff1.patch(`/reminders/${everyone}`, { title: "x", reminderDate: inMinutes(9) })).status).toBe(403);
      expect((await staff1.get(`/reminders`)).status).toBe(200);
    });

    it("sends each alert to the right inbox, once", async () => {
      for (const id of [onlyOwner, everyone, picked, staffPrivate]) await makeDue(id);
      await dispatchDueReminders();
      await dispatchDueReminders(); // a second run must not send again

      expect(await inboxFor(onlyOwner)).toEqual(["OWNER"]);
      expect(await inboxFor(everyone)).toEqual(["OWNER", staff1Id, staff2Id].sort());
      expect(await inboxFor(picked)).toEqual(["OWNER", staff1Id].sort());
      expect(await inboxFor(staffPrivate)).toEqual([staff2Id]);

      const link = await prisma.notification.findFirst({
        where: { data: { path: ["reminderId"], equals: onlyOwner } },
      });
      expect((link?.data as any).url).toBe(`/hatchery/dashboard/parties/${ownPartyId}`);
      expect(link?.body).toBe("Owner only (Own party)");
    });

    it("gives every person their own notification inbox", async () => {
      const s1 = await staff1.get("/notifications?limit=50");
      expect(s1.status).toBe(200);
      expect(s1.body.data.every((n: any) => n.staffUserId === staff1Id)).toBe(true);
      const ownerInbox = await owner.get("/notifications?limit=50");
      expect(ownerInbox.body.data.every((n: any) => n.staffUserId === null)).toBe(true);
      expect((await staff1.get("/notifications/unread-count")).body.data.count).toBeGreaterThanOrEqual(2);
      expect((await staff1.post("/notifications/read-all")).status).toBe(200);
      expect((await staff1.get("/notifications/unread-count")).body.data.count).toBe(0);
      // The owner's unread rows are not touched by a staff read-all.
      expect((await owner.get("/notifications/unread-count")).body.data.count).toBeGreaterThan(0);
    });

    it("skips staff who were switched off", async () => {
      const id = (await owner.post("/reminders", { title: "After switch off", reminderDate: inMinutes(5), audience: "EVERYONE" })).body.data.id;
      await prisma.staffUser.update({ where: { id: staff1Id }, data: { isActive: false } });
      try {
        await makeDue(id);
        await dispatchDueReminders();
        expect(await inboxFor(id)).toEqual(["OWNER", staff2Id].sort());
      } finally {
        await prisma.staffUser.update({ where: { id: staff1Id }, data: { isActive: true } });
      }
    });
  });

  describe("done, undo, snooze, edit", () => {
    it("done is shared and safe to press twice; undo brings it back", async () => {
      const id = (await owner.post("/reminders", { title: "Call bank", reminderDate: inMinutes(5), audience: "EVERYONE" })).body.data.id;
      const first = await staff2.post(`/reminders/${id}/done`);
      expect(first.status).toBe(200);
      expect(first.body.alreadyDone).toBe(false);
      expect(first.body.data.doneByStaff.id).toBe(staff2Id);
      const second = await owner.post(`/reminders/${id}/done`);
      expect(second.body.alreadyDone).toBe(true);

      const done = await owner.get("/reminders?view=done&limit=50");
      expect(done.body.data.some((r: any) => r.id === id)).toBe(true);
      expect((await owner.get("/reminders")).body.data.some((r: any) => r.id === id)).toBe(false);

      expect((await owner.patch(`/reminders/${id}`, { title: "x", reminderDate: inMinutes(9) })).status).toBe(400);
      expect((await owner.post(`/reminders/${id}/snooze`, { until: inMinutes(30) })).status).toBe(400);

      const undo = await owner.post(`/reminders/${id}/undo`);
      expect(undo.status).toBe(200);
      expect(undo.body.data.doneAt).toBeNull();
    });

    it("snooze and a new date make it send again", async () => {
      const id = (await owner.post("/reminders", { title: "Snooze me", reminderDate: inMinutes(5) })).body.data.id;
      await makeDue(id);
      await dispatchDueReminders();
      expect((await prisma.reminder.findUnique({ where: { id } }))?.notifiedAt).not.toBeNull();

      expect((await owner.post(`/reminders/${id}/snooze`, { until: pastMinutes(5).toISOString() })).status).toBe(400);
      const snoozed = await owner.post(`/reminders/${id}/snooze`, { until: inMinutes(60) });
      expect(snoozed.status).toBe(200);
      expect(snoozed.body.data.notifiedAt).toBeNull();

      await makeDue(id);
      await dispatchDueReminders();
      expect(await inboxFor(id)).toEqual(["OWNER", "OWNER"]);

      const edited = await owner.patch(`/reminders/${id}`, { title: "Snooze me", reminderDate: inMinutes(120) });
      expect(edited.status).toBe(200);
      expect(edited.body.data.notifiedAt).toBeNull();
    });

    it("edit keeps the staff maker included when the owner changes who gets it", async () => {
      const id = (await staff2.post("/reminders", { title: "Mine", reminderDate: inMinutes(5) })).body.data.id;
      const res = await owner.patch(`/reminders/${id}`, {
        title: "Mine", reminderDate: inMinutes(5), audience: "SELECTED", staffIds: [staff1Id],
      });
      expect(res.status).toBe(200);
      const people = res.body.data.recipients.map((r: any) => r.staffUser.id).sort();
      expect(people).toEqual([staff1Id, staff2Id].sort());
      expect(res.body.data.notifyOwner).toBe(false);
    });
  });

  describe("repeat", () => {
    it("makes one next reminder in the future, even when done late or done twice", async () => {
      const created = await owner.post("/reminders", {
        title: "Daily check", reminderDate: inMinutes(5), repeat: "DAILY", audience: "SELECTED", staffIds: [staff1Id],
      });
      expect(created.status).toBe(201);
      const id = created.body.data.id;
      // Planned 3 days ago at this time, done today.
      await prisma.reminder.update({ where: { id }, data: { reminderDate: new Date(Date.now() - 3 * 86_400_000 + 60_000) } });

      const done = await owner.post(`/reminders/${id}/done`);
      expect(done.body.next).not.toBeNull();
      const next = new Date(done.body.next.reminderDate).getTime();
      expect(next).toBeGreaterThan(Date.now());
      expect(next).toBeLessThanOrEqual(Date.now() + 86_400_000);
      expect(done.body.next.recipients.map((r: any) => r.staffUser.id)).toContain(staff1Id);

      const undo = await owner.post(`/reminders/${id}/undo`);
      expect(undo.body.nextAlreadyMade).toBe(true);
      await owner.post(`/reminders/${id}/done`);
      expect(await prisma.reminder.count({ where: { repeatedFromId: id } })).toBe(1);
    });

    it("checks repeat input", async () => {
      expect((await owner.post("/reminders", { title: "T", reminderDate: inMinutes(5), repeat: "EVERY_N_DAYS", repeatEveryDays: 0 })).status).toBe(400);
      expect((await owner.post("/reminders", { title: "T", reminderDate: inMinutes(5), repeat: "WEEKLY", repeatUntil: inMinutes(1) })).status).toBe(400);
    });

    it("works out next dates (every N days, until, BS month end)", () => {
      const now = new Date("2026-11-06T06:00:00.000Z");
      const from = new Date("2026-11-05T03:15:00.000Z"); // 9:00 AM Nepal
      expect(nextRepeatDate(from, ReminderRepeat.EVERY_N_DAYS, 3, null, now)?.toISOString()).toBe("2026-11-08T03:15:00.000Z");
      expect(nextRepeatDate(from, ReminderRepeat.WEEKLY, null, new Date("2026-11-10T00:00:00Z"), now)).toBeNull();

      // Monthly follows the BS month and keeps 9:00 AM Nepal. A day the next
      // month doesn't have becomes its last day.
      for (let day = 28; day <= 32; day += 1) {
        let start: NepaliDate;
        try {
          start = new NepaliDate(2083, 1, day);
          if (start.getMonth() !== 1) continue; // Jestha has no such day
        } catch {
          continue;
        }
        const ad = start.getAD();
        const startUtc = new Date(Date.UTC(ad.year, ad.month, ad.date, 3, 15));
        const next = nextRepeatDate(startUtc, ReminderRepeat.MONTHLY, null, null, startUtc)!;
        const wall = new Date(next.getTime() + (5 * 60 + 45) * 60_000);
        const nbs = new NepaliDate(new Date(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()));
        expect(nbs.getMonth()).toBe(2); // Asar
        expect(nbs.getDate()).toBeLessThanOrEqual(day);
        expect(wall.getUTCHours()).toBe(9);
        expect(wall.getUTCMinutes()).toBe(0);
      }
    });
  });

  describe("push devices", () => {
    it("saves which staff login a device belongs to, and moves it on a new login", async () => {
      const endpoint = `https://push.example.test/reminders-${suffix}`;
      const sub = { endpoint, keys: { p256dh: "p", auth: "a" } };
      expect((await staff1.post("/push/subscribe", { subscription: sub })).status).toBe(200);
      let rows = await prisma.pushSubscription.findMany({ where: { endpoint } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ userId: ownerId, staffUserId: staff1Id });

      expect((await otherOwner.post("/push/subscribe", { subscription: sub })).status).toBe(200);
      rows = await prisma.pushSubscription.findMany({ where: { endpoint } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ userId: otherOwnerId, staffUserId: null });
      await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    });
  });
});
