import { ApiHelper } from "../helpers/api.helper";
import prisma from "../../src/utils/prisma";

/** Farmer batch notes keep who wrote them; only the writer or the owner can change one. */
describe("Farmer batch notes API", () => {
  const owner = new ApiHelper();
  const staff = new ApiHelper();
  const password = "Farmer-notes-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-9);
  const day = "2026-10-20T00:00:00.000Z";
  let ownerId: string;
  let batchId: string;
  let staffName: string;
  const base = () => `/batches/${batchId}/notes`;

  beforeAll(async () => {
    const reg = await owner.post("/auth/register", { name: `Notes Farmer ${suffix}`, phone: `+97789${suffix}`, password, role: "OWNER" });
    expect(reg.status).toBe(201);
    ownerId = reg.body.user.id;
    owner.setAuthToken(reg.body.accessToken);
    expect((await owner.post("/test/approve-current-user")).status).toBe(200);
    const farm = await prisma.farm.create({ data: { name: `Notes farm ${suffix}`, capacity: 100, ownerId } });
    batchId = (await prisma.batch.create({ data: { batchNumber: `N-${suffix}`, startDate: new Date(day), initialChicks: 100, farmId: farm.id } })).id;

    staffName = `Sita ${suffix}`;
    const phone = `+97788${suffix.slice(-8)}`;
    const created = await owner.post("/staff-auth/users", { name: staffName, phone, password, permissions: ["FARMER_MANAGE_OPERATIONS"] });
    expect(created.status).toBe(201);
    const login = await staff.post("/staff-auth/login", { phone, password });
    expect(login.status).toBe(200);
    staff.setAuthToken(login.body.accessToken);
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await prisma.businessAuditLog.deleteMany({ where: { OR: [{ accountOwnerId: ownerId }, { actorId: ownerId }] } });
    await prisma.farm.deleteMany({ where: { ownerId } });
    await prisma.user.deleteMany({ where: { id: ownerId } });
  });

  it("saves the writer, limits who can change a note, and keeps old notes owner-only", async () => {
    const mine = await owner.post(base(), { date: day, description: "Gave vitamins" });
    expect(mine.status).toBe(201);
    expect(mine.body.data).toMatchObject({ createdByOwner: true, createdByStaffId: null, canChange: true });

    const theirs = await staff.post(base(), { date: day, description: "Two birds look weak" });
    expect(theirs.status).toBe(201);
    expect(theirs.body.data).toMatchObject({ createdByOwner: false, createdByStaff: { name: staffName } });

    // An old note from before authors were saved.
    const old = await prisma.batchNote.create({ data: { batchId, date: new Date(day), description: "Old note" } });

    const staffList = await staff.get(base());
    const canChange = Object.fromEntries(staffList.body.data.map((n: any) => [n.id, n.canChange]));
    expect(canChange).toEqual({ [mine.body.data.id]: false, [theirs.body.data.id]: true, [old.id]: false });

    expect((await staff.put(`${base()}/${mine.body.data.id}`, { date: day, description: "x" })).status).toBe(403);
    expect((await staff.delete(`${base()}/${old.id}`)).status).toBe(403);
    const edited = await staff.put(`${base()}/${theirs.body.data.id}`, { date: day, description: "Two birds weak, gave medicine" });
    expect(edited.status).toBe(200);
    expect(edited.body.data.editedAt).not.toBeNull();
    expect((await owner.put(`${base()}/${old.id}`, { date: day, description: "Old note, checked" })).status).toBe(200);
    expect((await owner.delete(`${base()}/${theirs.body.data.id}`)).status).toBe(200);
  });

  it("refuses notes over 2000 letters", async () => {
    const res = await owner.post(base(), { date: day, description: "x".repeat(2001) });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/2000/);
  });

  it("writes farmer activity", async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const audit = await prisma.businessAuditLog.findFirst({ where: { accountOwnerId: ownerId, description: "Added a batch note" } });
    expect(audit).not.toBeNull();
  });
});
