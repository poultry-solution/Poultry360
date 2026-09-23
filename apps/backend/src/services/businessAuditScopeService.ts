import { AuditActorType, Prisma } from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * Restricts an account-facing activity feed to actions performed by the
 * account owner or a login-capable staff member that owner manages. This is
 * intentionally actor-based as well as accountOwnerId-based: historical rows
 * with an incorrect accountOwnerId cannot leak another account's activity.
 */
export async function getAccountOwnerAndStaffAuditScope(
  accountOwnerId: string
): Promise<Prisma.BusinessAuditLogWhereInput> {
  const staffUsers = await prisma.staffUser.findMany({
    where: { ownerId: accountOwnerId },
    select: { id: true },
  });

  return {
    accountOwnerId,
    OR: [
      { actorType: AuditActorType.USER, actorId: accountOwnerId },
      {
        actorType: AuditActorType.STAFF,
        actorId: { in: staffUsers.map((staffUser) => staffUser.id) },
      },
    ],
  };
}

/** Combines independently owned audit constraints without letting OR clauses overwrite each other. */
export function combineBusinessAuditWhere(
  ...conditions: Array<Prisma.BusinessAuditLogWhereInput | undefined>
): Prisma.BusinessAuditLogWhereInput {
  const definedConditions = conditions.filter(
    (condition): condition is Prisma.BusinessAuditLogWhereInput =>
      condition !== undefined && Object.keys(condition).length > 0
  );

  if (definedConditions.length === 0) return {};
  if (definedConditions.length === 1) return definedConditions[0];
  return { AND: definedConditions };
}
