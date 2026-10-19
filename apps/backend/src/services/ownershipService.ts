import { Prisma, UserRole } from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * Farmer-side ownership helpers.
 *
 * Non-SUPER_ADMIN callers must only see or touch records whose farm is theirs.
 * SUPER_ADMIN bypasses the scope (matches existing codebase convention; admin
 * tooling and ops scripts rely on it).
 *
 * Two shapes:
 *   - WHERE fragments (farmScopedBy / batchScopedBy): compose into findFirst /
 *     findMany where the caller already has its own include/select. One query,
 *     no round-trip, null result => 404.
 *   - Boolean assertions (userOwnsFarm / userOwnsBatch): pre-check for list
 *     endpoints that accept ?farmId= / ?batchId= filters. Caller 404s on false.
 */

const isPrivileged = (role?: UserRole | null) => role === UserRole.SUPER_ADMIN;

export const farmScopedBy = (
  userId: string,
  role?: UserRole | null,
): Prisma.FarmWhereInput => (isPrivileged(role) ? {} : { ownerId: userId });

export const batchScopedBy = (
  userId: string,
  role?: UserRole | null,
): Prisma.BatchWhereInput =>
  isPrivileged(role) ? {} : { farm: { ownerId: userId } };

export async function userOwnsFarm(
  id: string,
  userId: string,
  role?: UserRole | null,
): Promise<boolean> {
  const match = await prisma.farm.findFirst({
    where: { id, ...farmScopedBy(userId, role) },
    select: { id: true },
  });
  return !!match;
}

export async function userOwnsBatch(
  id: string,
  userId: string,
  role?: UserRole | null,
): Promise<boolean> {
  const match = await prisma.batch.findFirst({
    where: { id, ...batchScopedBy(userId, role) },
    select: { id: true },
  });
  return !!match;
}
