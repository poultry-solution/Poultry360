import type { Prisma } from "@prisma/client";

/**
 * `CashMovement.recordedById` points at a User. Staff log in with a StaffUser
 * id, which is not a User, so saving it fails the foreign key and the whole
 * sale / payment errors out. When the recorder isn't a User, store the owner
 * instead — the business audit log already keeps which staff member did it.
 */
export async function resolveRecordedById(
  tx: Prisma.TransactionClient,
  ownerUserId: string,
  recordedById: string | null | undefined,
): Promise<string> {
  if (!recordedById || recordedById === ownerUserId) return ownerUserId;
  const user = await tx.user.findUnique({ where: { id: recordedById }, select: { id: true } });
  return user ? user.id : ownerUserId;
}
