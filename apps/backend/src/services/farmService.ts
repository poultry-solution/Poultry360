import bcrypt from "bcrypt";
import { BatchStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../utils/prisma";
import { parseAnalyticsRange } from "./farmerAnalytics/period";
import { buildAnalyticsScope, type ScopeBatch } from "./farmerAnalytics/scope";
import { currentFcrTile, getActiveFcrResults, getBatchStats, type BatchStatRow } from "./farmerAnalytics/batchStats";

/**
 * Farmer farms. A farm is reachable only by its owner account (staff act as the owner).
 * Numbers reuse the Analytics code, so they always match Analytics "All time".
 */

export class FarmError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "FarmError";
  }
}

export const FarmInputSchema = z.object({
  name: z.string().trim().min(1, "Farm name is required").max(100, "Farm name is too long"),
  capacity: z.coerce
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1 bird")
    .max(10_000_000, "Capacity is too large"),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .optional()
    .nullable()
    .transform((value) => value || null),
});

export function parseFarmInput(body: unknown) {
  const result = FarmInputSchema.safeParse(body ?? {});
  if (!result.success) throw new FarmError(result.error.issues[0]?.message ?? "Check the farm details");
  return result.data;
}

const accessWhere = (userId: string): Prisma.FarmWhereInput => ({
  OR: [{ ownerId: userId }, { managers: { some: { id: userId } } }],
});

/** The farm if this account may use it; otherwise "not found" (never reveals other farms). */
export async function findAccessibleFarm(farmId: string, userId: string) {
  const farm = await prisma.farm.findFirst({
    where: { id: farmId, ...accessWhere(userId) },
    select: { id: true, name: true, capacity: true, description: true, ownerId: true, createdAt: true },
  });
  if (!farm) throw new FarmError("Farm not found", 404);
  return farm;
}

/** Birds alive and batch counts per farm (same "birds alive" rule as Analytics). */
async function farmBirdCounts(farmIds: string[]) {
  if (!farmIds.length) return new Map<string, { birdsAlive: number; running: number; total: number }>();
  const batches = await prisma.batch.findMany({
    where: { farmId: { in: farmIds } },
    select: {
      id: true,
      batchNumber: true,
      batchType: true,
      status: true,
      startDate: true,
      endDate: true,
      initialChicks: true,
      farmId: true,
      farm: { select: { name: true } },
    },
  });
  const active: ScopeBatch[] = batches
    .filter((batch) => batch.status === BatchStatus.ACTIVE)
    .map(({ farm, ...batch }) => ({ ...batch, farmName: farm.name }));
  const stats = await getBatchStats(active);
  const aliveById = new Map(stats.map((row) => [row.id, row.alive]));
  const counts = new Map<string, { birdsAlive: number; running: number; total: number }>();
  for (const id of farmIds) counts.set(id, { birdsAlive: 0, running: 0, total: 0 });
  for (const batch of batches) {
    const entry = counts.get(batch.farmId)!;
    entry.total += 1;
    if (batch.status === BatchStatus.ACTIVE) {
      entry.running += 1;
      entry.birdsAlive += aliveById.get(batch.id) ?? 0;
    }
  }
  return counts;
}

export async function listFarms(userId: string, page: number, limit: number) {
  const where = accessWhere(userId);
  const [farms, total] = await Promise.all([
    prisma.farm.findMany({
      where,
      select: { id: true, name: true, capacity: true, description: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.farm.count({ where }),
  ]);
  const counts = await farmBirdCounts(farms.map((farm) => farm.id));
  return {
    data: farms.map((farm) => ({ ...farm, ...counts.get(farm.id)! })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** Plain list for farm pickers (Home still reads _count.batches). */
export function listFarmOptions(userId: string) {
  return prisma.farm.findMany({
    where: accessWhere(userId),
    select: {
      id: true,
      name: true,
      capacity: true,
      description: true,
      createdAt: true,
      _count: { select: { batches: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Farm page: tiles and every batch, whole life. Money only when allowed. */
export async function getFarmSummary(userId: string, farmId: string, showMoney: boolean, now = new Date()) {
  const farm = await findAccessibleFarm(farmId, userId);
  const range = parseAnalyticsRange({}, now); // all time
  const scope = await buildAnalyticsScope(userId, { farmId }, range);
  const running = scope.batches.filter((batch) => batch.status === BatchStatus.ACTIVE);

  const [rows, activeFcr, sales, costs, records] = await Promise.all([
    getBatchStats(scope.batches, now),
    getActiveFcrResults(running, now),
    prisma.sale.aggregate({ where: { farmId }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { farmId }, _sum: { amount: true } }),
    prisma.farm.findUnique({
      where: { id: farmId },
      select: { _count: { select: { batches: true, sales: true, expenses: true } } },
    }),
  ]);

  const birdsAlive = rows.filter((row) => row.status === BatchStatus.ACTIVE).reduce((sum, row) => sum + row.alive, 0);
  const salesTotal = Number(sales._sum.amount ?? 0);
  const costsTotal = Number(costs._sum.amount ?? 0);
  const moneyFree = (row: BatchStatRow) =>
    showMoney ? row : { ...row, sales: null, costs: null, profit: null, costPerBird: null, profitPerBird: null };

  return {
    farm: { id: farm.id, name: farm.name, capacity: farm.capacity, description: farm.description },
    canDelete: (records?._count.batches ?? 0) === 0 && (records?._count.sales ?? 0) === 0 && (records?._count.expenses ?? 0) === 0,
    showMoney,
    tiles: {
      birdsAlive,
      runningBatches: running.length,
      totalBatches: rows.length,
      ...currentFcrTile(activeFcr),
      sales: showMoney ? Math.round(salesTotal * 100) / 100 : null,
      costs: showMoney ? Math.round(costsTotal * 100) / 100 : null,
      profit: showMoney ? Math.round((salesTotal - costsTotal) * 100) / 100 : null,
    },
    batches: rows.map(moneyFree),
  };
}

export async function createFarm(userId: string, body: unknown) {
  const input = parseFarmInput(body);
  return prisma.farm.create({
    data: { ...input, ownerId: userId },
    select: { id: true, name: true, capacity: true, description: true, createdAt: true },
  });
}

/** Only name, capacity and description can change (never the owner). */
export async function updateFarm(userId: string, farmId: string, body: unknown) {
  await findAccessibleFarm(farmId, userId);
  const input = parseFarmInput(body);
  return prisma.farm.update({
    where: { id: farmId },
    data: input,
    select: { id: true, name: true, capacity: true, description: true, createdAt: true },
  });
}

/** Password of the person signed in: the staff member's own, or the owner's. */
async function checkActorPassword(actor: { userId: string; staffUserId?: string | null }, password: unknown) {
  if (typeof password !== "string" || !password) throw new FarmError("Enter your password to delete this farm");
  const hash = actor.staffUserId
    ? (await prisma.staffUser.findUnique({ where: { id: actor.staffUserId }, select: { passwordHash: true } }))?.passwordHash
    : (await prisma.user.findUnique({ where: { id: actor.userId }, select: { password: true } }))?.password;
  if (!hash || !(await bcrypt.compare(password, hash))) throw new FarmError("Wrong password", 401);
}

/** Only an empty farm (no batches, sales or costs) can be deleted, after the password. */
export async function deleteFarm(
  actor: { userId: string; staffUserId?: string | null },
  farmId: string,
  password: unknown
) {
  await findAccessibleFarm(farmId, actor.userId);
  const counts = await prisma.farm.findUnique({
    where: { id: farmId },
    select: { _count: { select: { batches: true, sales: true, expenses: true } } },
  });
  const c = counts?._count;
  if (c && (c.batches > 0 || c.sales > 0 || c.expenses > 0)) {
    throw new FarmError("This farm has batches, sales or costs, so it can't be deleted.", 409);
  }
  await checkActorPassword(actor, password);
  await prisma.farm.delete({ where: { id: farmId } });
}
