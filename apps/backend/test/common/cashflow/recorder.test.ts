import { resolveRecordedById } from "../../../src/common/cashflow/recorder";

const txWith = (userExists: boolean) =>
  ({ user: { findUnique: jest.fn().mockResolvedValue(userExists ? { id: "user-2" } : null) } }) as any;

describe("resolveRecordedById", () => {
  it("keeps the owner when the owner recorded it", async () => {
    const tx = txWith(true);
    await expect(resolveRecordedById(tx, "owner-1", "owner-1")).resolves.toBe("owner-1");
    expect(tx.user.findUnique).not.toHaveBeenCalled();
  });

  it("keeps a real User id", async () => {
    await expect(resolveRecordedById(txWith(true), "owner-1", "user-2")).resolves.toBe("user-2");
  });

  it("uses the owner when a staff login recorded it (staff ids are not Users)", async () => {
    await expect(resolveRecordedById(txWith(false), "owner-1", "staff-9")).resolves.toBe("owner-1");
  });

  it("uses the owner when nothing is given", async () => {
    await expect(resolveRecordedById(txWith(false), "owner-1", undefined)).resolves.toBe("owner-1");
  });
});
