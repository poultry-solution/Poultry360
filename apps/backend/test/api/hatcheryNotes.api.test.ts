import { ApiHelper } from "../helpers/api.helper";
import prisma from "../../src/utils/prisma";

/**
 * Notes on hatchery parent batches and incubations: owner and staff can add,
 * every note keeps who wrote it, and only the writer or the owner can change it.
 */
describe("Hatchery notes API", () => {
  const owner = new ApiHelper();
  const staff = new ApiHelper();
  const other = new ApiHelper();
  const password = "Hatchery-notes-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-9);
  const userIds: string[] = [];
  let batchId: string;
  let emptyBatchId: string;
  let incubationId: string;
  let staffName: string;

  async function registerHatchery(api: ApiHelper, tag: string) {
    const res = await api.post("/auth/register-entity", {
      name: `Notes ${tag} ${suffix}`,
      phone: `+97793${tag}${suffix.slice(-7)}`,
      password,
      entityType: "HATCHERY",
      entityName: `Notes Hatchery ${tag} ${suffix}`,
      entityContact: `98${tag}${suffix.slice(-7)}`,
      entityAddress: "Test city",
    });
    expect(res.status).toBe(201);
    api.setAuthToken(res.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);
    userIds.push(res.body.user.id);
    return res.body.user.id as string;
  }

  beforeAll(async () => {
    const ownerId = await registerHatchery(owner, "1");
    await registerHatchery(other, "2");
    batchId = (
      await prisma.hatcheryBatch.create({
        data: { hatcheryOwnerId: ownerId, code: `PF-N${suffix.slice(-4)}`, startDate: new Date(), notes: "Bought from Pokhara" },
      })
    ).id;
    emptyBatchId = (
      await prisma.hatcheryBatch.create({ data: { hatcheryOwnerId: ownerId, code: `PF-E${suffix.slice(-4)}`, startDate: new Date() } })
    ).id;
    const eggType = await prisma.hatcheryEggType.create({ data: { hatcheryOwnerId: ownerId, name: "Hatchable", isHatchable: true } });
    incubationId = (
      await prisma.hatcheryIncubationBatch.create({
        data: {
          hatcheryOwnerId: ownerId,
          parentBatchId: batchId,
          hatchableEggTypeId: eggType.id,
          code: `IN-N${suffix.slice(-4)}`,
          startDate: new Date(),
          eggsSetCount: 100,
        },
      })
    ).id;

    staffName = `Bikram ${suffix}`;
    const phone = `+97792${suffix.slice(-8)}`;
    const created = await owner.post("/staff-auth/users", { name: staffName, phone, password, permissions: ["HATCHERY_MANAGE_OPERATIONS"] });
    expect(created.status).toBe(201);
    const login = await staff.post("/staff-auth/login", { phone, password });
    expect(login.status).toBe(200);
    staff.setAuthToken(login.body.accessToken);
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await prisma.businessAuditLog.deleteMany({ where: { OR: [{ accountOwnerId: { in: userIds } }, { actorId: { in: userIds } }] } });
    await prisma.hatcheryIncubationBatch.deleteMany({ where: { hatcheryOwnerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  for (const kind of ["batch", "incubation"] as const) {
    const base = () => (kind === "batch" ? `/hatchery/batches/${batchId}/notes` : `/hatchery/incubations/${incubationId}/notes`);

    describe(`${kind} notes`, () => {
      let ownerNoteId: string;
      let staffNoteId: string;

      it("saves who wrote each note", async () => {
        const mine = await owner.post(base(), { text: "  Clean the trays before setting  " });
        expect(mine.status).toBe(201);
        expect(mine.body.data).toMatchObject({ text: "Clean the trays before setting", createdByOwner: true, createdByStaffId: null });
        ownerNoteId = mine.body.data.id;

        const theirs = await staff.post(base(), { text: "Eggs from house 2 look dirty" });
        expect(theirs.status).toBe(201);
        expect(theirs.body.data).toMatchObject({ createdByOwner: false, createdByStaff: { name: staffName } });
        staffNoteId = theirs.body.data.id;
      });

      it("lists newest first and tells each person what they can change", async () => {
        const ownerList = await owner.get(base());
        expect(ownerList.status).toBe(200);
        expect(ownerList.body.data.map((n: any) => n.id)).toEqual([staffNoteId, ownerNoteId]);
        expect(ownerList.body.data.every((n: any) => n.canChange)).toBe(true);

        const staffList = await staff.get(base());
        const canChange = Object.fromEntries(staffList.body.data.map((n: any) => [n.id, n.canChange]));
        expect(canChange).toEqual({ [staffNoteId]: true, [ownerNoteId]: false });
      });

      it("lets only the writer or the owner edit and delete", async () => {
        expect((await staff.put(`${base()}/${ownerNoteId}`, { text: "changed" })).status).toBe(403);
        expect((await staff.delete(`${base()}/${ownerNoteId}`)).status).toBe(403);

        const ownEdit = await staff.put(`${base()}/${staffNoteId}`, { text: "Eggs from house 2 are dirty, cleaned now" });
        expect(ownEdit.status).toBe(200);
        expect(ownEdit.body.data.editedAt).not.toBeNull();

        expect((await owner.put(`${base()}/${staffNoteId}`, { text: "Checked by owner" })).status).toBe(200);
        expect((await owner.delete(`${base()}/${staffNoteId}`)).status).toBe(200);
      });

      it("refuses empty or too long notes, other hatcheries and wrong ids", async () => {
        expect((await owner.post(base(), { text: "   " })).status).toBe(400);
        const long = await owner.post(base(), { text: "x".repeat(2001) });
        expect(long.status).toBe(400);
        expect(long.body.message).toMatch(/2000/);
        expect((await other.get(base())).status).toBe(404);
        expect((await other.post(base(), { text: "hi" })).status).toBe(404);
        expect((await owner.put(`${base()}/not-a-note`, { text: "hi" })).status).toBe(404);
      });
    });
  }

  it("does not mix batch and incubation notes, and shows the old single note", async () => {
    const batchNote = (await owner.get(`/hatchery/batches/${batchId}/notes`)).body;
    expect(batchNote.legacyNote).toBe("Bought from Pokhara");
    const noteId = batchNote.data[0].id;
    expect((await owner.put(`/hatchery/incubations/${incubationId}/notes/${noteId}`, { text: "x" })).status).toBe(404);
  });

  it("still takes notes on a closed batch, and deleting a batch removes its notes", async () => {
    await prisma.hatcheryBatch.update({ where: { id: emptyBatchId }, data: { status: "CLOSED" } });
    const note = await owner.post(`/hatchery/batches/${emptyBatchId}/notes`, { text: "Closed because birds were sold" });
    expect(note.status).toBe(201);
    await prisma.hatcheryBatch.delete({ where: { id: emptyBatchId } });
    expect(await prisma.hatcheryNote.count({ where: { hatcheryBatchId: emptyBatchId } })).toBe(0);
  });

  it("writes hatchery activity", async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const audit = await prisma.businessAuditLog.findFirst({ where: { accountOwnerId: userIds[0], description: "Added a batch note" } });
    expect(audit).not.toBeNull();
    const incubationAudit = await prisma.businessAuditLog.findFirst({ where: { accountOwnerId: userIds[0], description: "Added an incubation note" } });
    expect(incubationAudit).not.toBeNull();
  });
});
