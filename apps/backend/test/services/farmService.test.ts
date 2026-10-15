jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    farm: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn(), create: jest.fn() },
    user: { findUnique: jest.fn() },
    staffUser: { findUnique: jest.fn() },
  };
  return { __esModule: true, default: client };
});

import bcrypt from "bcrypt";
import prisma from "../../src/utils/prisma";
import {
  FarmError,
  createFarm,
  deleteFarm,
  findAccessibleFarm,
  parseFarmInput,
  updateFarm,
} from "../../src/services/farmService";

const db = prisma as any;
const myFarm = { id: "farm-1", name: "Green Valley", capacity: 5000, description: null, ownerId: "farmer-1", createdAt: new Date() };
const empty = { _count: { batches: 0, sales: 0, expenses: 0 } };

beforeEach(() => jest.clearAllMocks());

describe("farm access", () => {
  it("only finds farms of this account", async () => {
    db.farm.findFirst.mockResolvedValue(null);
    await expect(findAccessibleFarm("farm-of-someone-else", "farmer-1")).rejects.toMatchObject({ status: 404 });
    const where = db.farm.findFirst.mock.calls[0][0].where;
    expect(where.id).toBe("farm-of-someone-else");
    expect(where.OR).toEqual([{ ownerId: "farmer-1" }, { managers: { some: { id: "farmer-1" } } }]);
  });

  it("does not update another account's farm", async () => {
    db.farm.findFirst.mockResolvedValue(null);
    await expect(updateFarm("farmer-1", "farm-2", { name: "Mine now", capacity: 10 })).rejects.toBeInstanceOf(FarmError);
    expect(db.farm.update).not.toHaveBeenCalled();
  });

  it("never lets an update change the owner or managers", async () => {
    db.farm.findFirst.mockResolvedValue(myFarm);
    db.farm.update.mockResolvedValue(myFarm);
    await updateFarm("farmer-1", "farm-1", { name: " New name ", capacity: "4500", ownerId: "attacker", managers: ["x"] });
    expect(db.farm.update.mock.calls[0][0].data).toEqual({ name: "New name", capacity: 4500, description: null });
  });
});

describe("farm details", () => {
  it.each([
    [{ name: "   ", capacity: 100 }, "Farm name is required"],
    [{ name: "A", capacity: 0 }, "Capacity must be at least 1 bird"],
    [{ name: "A", capacity: 12.5 }, "Capacity must be a whole number"],
  ])("refuses %j", (body, message) => {
    expect(() => parseFarmInput(body)).toThrow(message);
  });

  it("creates the farm under this account", async () => {
    db.farm.create.mockResolvedValue(myFarm);
    await createFarm("farmer-1", { name: "Hilltop", capacity: 3000, description: "Layer shed", ownerId: "someone" });
    expect(db.farm.create.mock.calls[0][0].data).toEqual({
      name: "Hilltop",
      capacity: 3000,
      description: "Layer shed",
      ownerId: "farmer-1",
    });
  });
});

describe("delete farm", () => {
  beforeEach(() => db.farm.findFirst.mockResolvedValue(myFarm));

  it("refuses a farm that has records, before asking for the password", async () => {
    db.farm.findUnique.mockResolvedValue({ _count: { batches: 3, sales: 0, expenses: 0 } });
    await expect(deleteFarm({ userId: "farmer-1" }, "farm-1", "secret")).rejects.toMatchObject({ status: 409 });
    expect(db.farm.delete).not.toHaveBeenCalled();
  });

  it("needs the right password", async () => {
    db.farm.findUnique.mockResolvedValue(empty);
    db.user.findUnique.mockResolvedValue({ password: await bcrypt.hash("right", 4) });
    await expect(deleteFarm({ userId: "farmer-1" }, "farm-1", "")).rejects.toMatchObject({ status: 400 });
    await expect(deleteFarm({ userId: "farmer-1" }, "farm-1", "wrong")).rejects.toMatchObject({ status: 401 });
    expect(db.farm.delete).not.toHaveBeenCalled();
    await deleteFarm({ userId: "farmer-1" }, "farm-1", "right");
    expect(db.farm.delete).toHaveBeenCalledWith({ where: { id: "farm-1" } });
  });

  it("checks a staff member's own password", async () => {
    db.farm.findUnique.mockResolvedValue(empty);
    db.staffUser.findUnique.mockResolvedValue({ passwordHash: await bcrypt.hash("staff-pass", 4) });
    await deleteFarm({ userId: "farmer-1", staffUserId: "staff-1" }, "farm-1", "staff-pass");
    expect(db.staffUser.findUnique).toHaveBeenCalledWith({ where: { id: "staff-1" }, select: { passwordHash: true } });
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });
});
