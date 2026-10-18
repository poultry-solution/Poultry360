jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    farm: { findFirst: jest.fn() },
    batch: { findFirst: jest.fn() },
  };
  return { __esModule: true, default: client };
});

import prisma from "../../src/utils/prisma";
import {
  batchScopedBy,
  farmScopedBy,
  userOwnsBatch,
  userOwnsFarm,
} from "../../src/services/ownershipService";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("farmScopedBy / batchScopedBy", () => {
  it("scopes to owner for a farmer", () => {
    expect(farmScopedBy("farmer-1", "OWNER" as any)).toEqual({ ownerId: "farmer-1" });
    expect(batchScopedBy("farmer-1", "OWNER" as any)).toEqual({
      farm: { ownerId: "farmer-1" },
    });
  });

  it("still scopes if the role is unknown or missing", () => {
    // Defensive — a non-SUPER_ADMIN role should always be scoped.
    expect(farmScopedBy("farmer-1")).toEqual({ ownerId: "farmer-1" });
    expect(farmScopedBy("farmer-1", null)).toEqual({ ownerId: "farmer-1" });
    expect(farmScopedBy("farmer-1", "DEALER" as any)).toEqual({ ownerId: "farmer-1" });
  });

  it("returns an empty where fragment for SUPER_ADMIN (admin bypass)", () => {
    expect(farmScopedBy("anyone", "SUPER_ADMIN" as any)).toEqual({});
    expect(batchScopedBy("anyone", "SUPER_ADMIN" as any)).toEqual({});
  });
});

describe("userOwnsFarm", () => {
  it("returns true when the farm belongs to the user", async () => {
    db.farm.findFirst.mockResolvedValue({ id: "farm-1" });
    await expect(userOwnsFarm("farm-1", "farmer-1", "OWNER" as any)).resolves.toBe(true);
    expect(db.farm.findFirst).toHaveBeenCalledWith({
      where: { id: "farm-1", ownerId: "farmer-1" },
      select: { id: true },
    });
  });

  it("returns false when the farm is someone else's", async () => {
    db.farm.findFirst.mockResolvedValue(null);
    await expect(userOwnsFarm("farm-of-stranger", "farmer-1", "OWNER" as any)).resolves.toBe(false);
  });

  it("still returns true for SUPER_ADMIN as long as the farm exists", async () => {
    db.farm.findFirst.mockResolvedValue({ id: "farm-1" });
    await expect(userOwnsFarm("farm-1", "admin-1", "SUPER_ADMIN" as any)).resolves.toBe(true);
    // No ownerId filter was applied.
    expect(db.farm.findFirst.mock.calls[0][0].where).toEqual({ id: "farm-1" });
  });
});

describe("userOwnsBatch", () => {
  it("returns true when the batch's farm belongs to the user", async () => {
    db.batch.findFirst.mockResolvedValue({ id: "batch-1" });
    await expect(userOwnsBatch("batch-1", "farmer-1", "OWNER" as any)).resolves.toBe(true);
    expect(db.batch.findFirst).toHaveBeenCalledWith({
      where: { id: "batch-1", farm: { ownerId: "farmer-1" } },
      select: { id: true },
    });
  });

  it("returns false when the batch is on someone else's farm", async () => {
    db.batch.findFirst.mockResolvedValue(null);
    await expect(userOwnsBatch("batch-of-stranger", "farmer-1", "OWNER" as any)).resolves.toBe(false);
  });

  it("still returns true for SUPER_ADMIN as long as the batch exists", async () => {
    db.batch.findFirst.mockResolvedValue({ id: "batch-1" });
    await expect(userOwnsBatch("batch-1", "admin-1", "SUPER_ADMIN" as any)).resolves.toBe(true);
    expect(db.batch.findFirst.mock.calls[0][0].where).toEqual({ id: "batch-1" });
  });
});
