import NepaliDate from "nepali-date-converter";
import {
  Prisma,
  ReminderAudience,
  ReminderModule,
  ReminderRepeat,
  StaffPermission,
  UserRole,
} from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * Reminders shared by the farmer, hatchery and feed dealer modules.
 *
 * Tenant: the owner User (`userId`). Staff act inside the owner's account and
 * are identified by `staffUserId`. The owner sees every reminder of the module;
 * staff see EVERYONE reminders, their own, and ones they are picked for.
 */

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
const DAY_MS = 86_400_000;
const TITLE_MAX = 200;
const PAST_GRACE_MS = 60_000;
const MAX_AHEAD_MS = 2 * 365 * DAY_MS;
const MAX_SNOOZE_MS = 365 * DAY_MS;
const ACTIVE_LIMIT = 300;

export class ReminderError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface ReminderActor {
  ownerId: string;
  role: UserRole | string | undefined;
  /** null when the owner is acting */
  staffUserId: string | null;
}

const MODULE_BY_ROLE: Partial<Record<string, ReminderModule>> = {
  [UserRole.OWNER]: ReminderModule.FARMER,
  [UserRole.HATCHERY]: ReminderModule.HATCHERY,
  [UserRole.DEALER]: ReminderModule.DEALER,
};

export const ROLE_BY_MODULE: Record<ReminderModule, UserRole> = {
  FARMER: UserRole.OWNER,
  HATCHERY: UserRole.HATCHERY,
  DEALER: UserRole.DEALER,
};

/**
 * Staff permission needed to use reminders. Dealer staff have no "manage"
 * permission, so every active dealer staff login may use them.
 */
export const MANAGE_PERMISSION_BY_MODULE: Partial<Record<ReminderModule, StaffPermission>> = {
  FARMER: StaffPermission.FARMER_MANAGE_OPERATIONS,
  HATCHERY: StaffPermission.HATCHERY_MANAGE_OPERATIONS,
};

/** Staff filter for people who can get this module's reminders. */
export function staffPermissionWhere(module: ReminderModule): Prisma.StaffUserWhereInput {
  const permission = MANAGE_PERMISSION_BY_MODULE[module];
  return permission ? { permissions: { has: permission } } : {};
}

export function moduleForRole(role: string | undefined): ReminderModule | null {
  return (role && MODULE_BY_ROLE[role]) || null;
}

function requireModule(actor: ReminderActor): ReminderModule {
  const module = moduleForRole(actor.role as string);
  if (!module) throw new ReminderError(403, "Reminders are not on for this account yet.");
  return module;
}

export const reminderInclude = {
  farm: { select: { id: true, name: true } },
  batch: { select: { id: true, batchNumber: true } },
  hatcheryBatch: { select: { id: true, code: true, name: true } },
  incubation: { select: { id: true, code: true, name: true } },
  hatcheryParty: { select: { id: true, name: true } },
  dealerCustomer: { select: { id: true, name: true, phone: true, archivedAt: true } },
  dealerManualCompany: { select: { id: true, name: true, phone: true, archivedAt: true } },
  createdByStaff: { select: { id: true, name: true } },
  doneByStaff: { select: { id: true, name: true } },
  recipients: { select: { staffUser: { select: { id: true, name: true, isActive: true } } } },
  repeatedTo: { select: { id: true } },
} satisfies Prisma.ReminderInclude;

export type ReminderWithLinks = Prisma.ReminderGetPayload<{ include: typeof reminderInclude }>;

/** Rows this actor may see. */
function visibleWhere(actor: ReminderActor, module: ReminderModule): Prisma.ReminderWhereInput {
  const base: Prisma.ReminderWhereInput = { userId: actor.ownerId, module };
  if (!actor.staffUserId) return base;
  return {
    ...base,
    OR: [
      { audience: ReminderAudience.EVERYONE },
      { createdByStaffId: actor.staffUserId },
      { recipients: { some: { staffUserId: actor.staffUserId } } },
    ],
  };
}

async function findVisible(actor: ReminderActor, id: string) {
  const module = requireModule(actor);
  const reminder = await prisma.reminder.findFirst({
    where: { id, ...visibleWhere(actor, module) },
    include: reminderInclude,
  });
  if (!reminder) throw new ReminderError(404, "Reminder not found");
  return { reminder, module };
}

/** Only the person who made it, or the owner, can edit or delete. */
function assertCanChange(actor: ReminderActor, reminder: { createdByStaffId: string | null }) {
  if (!actor.staffUserId) return;
  if (reminder.createdByStaffId === actor.staffUserId) return;
  throw new ReminderError(403, "Only the person who made this reminder or the owner can change it.");
}

// ---------------------------------------------------------------- dealer money

export type DealerMoney = { owesNow: number | null; paidSince: number };

/**
 * For dealer reminders linked to a customer or company: what they owe now and
 * how much was paid since the reminder was made. Customer: positive balance =
 * they owe us. Company: positive balance = we owe them. "Paid since" counts
 * payments recorded after the reminder was created (one query per kind).
 */
export async function withDealerMoney<T extends ReminderWithLinks>(rows: T[]): Promise<Array<T & { money: DealerMoney | null }>> {
  const customerRows = rows.filter((r) => r.dealerCustomerId);
  const companyRows = rows.filter((r) => r.dealerManualCompanyId);
  if (customerRows.length === 0 && companyRows.length === 0) return rows.map((r) => ({ ...r, money: null }));

  const earliest = (list: T[]) => new Date(Math.min(...list.map((r) => r.createdAt.getTime())));
  const customerIds = [...new Set(customerRows.map((r) => r.dealerCustomerId!))];
  const companyIds = [...new Set(companyRows.map((r) => r.dealerManualCompanyId!))];
  const [customers, companies, customerPayments, companyPayments] = await Promise.all([
    customerIds.length
      ? prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, balance: true } })
      : [],
    companyIds.length
      ? prisma.dealerManualCompany.findMany({ where: { id: { in: companyIds } }, select: { id: true, balance: true } })
      : [],
    customerIds.length
      ? prisma.dealerLedgerEntry.findMany({
          where: {
            type: "PAYMENT_RECEIVED",
            partyType: "CUSTOMER",
            partyId: { in: customerIds },
            createdAt: { gte: earliest(customerRows) },
          },
          select: { partyId: true, amount: true, createdAt: true },
        })
      : [],
    companyIds.length
      ? prisma.dealerManualCompanyPayment.findMany({
          where: {
            manualCompanyId: { in: companyIds },
            voidedAt: null,
            OR: [{ direction: null }, { direction: "MADE" }],
            createdAt: { gte: earliest(companyRows) },
          },
          select: { manualCompanyId: true, amount: true, createdAt: true },
        })
      : [],
  ]);
  const balanceOf = new Map<string, number>([
    ...customers.map((c) => [c.id, Number(c.balance)] as [string, number]),
    ...companies.map((c) => [c.id, Number(c.balance)] as [string, number]),
  ]);
  const paidSince = (list: Array<{ id: string | null; amount: unknown; createdAt: Date }>, id: string, from: Date) =>
    Math.round(
      list.filter((p) => p.id === id && p.createdAt >= from).reduce((sum, p) => sum + Number(p.amount), 0) * 100
    ) / 100;
  const customerList = customerPayments.map((p) => ({ id: p.partyId, amount: p.amount, createdAt: p.createdAt }));
  const companyList = companyPayments.map((p) => ({ id: p.manualCompanyId, amount: p.amount, createdAt: p.createdAt }));

  return rows.map((r) => {
    if (r.dealerCustomerId) {
      return {
        ...r,
        money: { owesNow: balanceOf.get(r.dealerCustomerId) ?? null, paidSince: paidSince(customerList, r.dealerCustomerId, r.createdAt) },
      };
    }
    if (r.dealerManualCompanyId) {
      return {
        ...r,
        money: {
          owesNow: balanceOf.get(r.dealerManualCompanyId) ?? null,
          paidSince: paidSince(companyList, r.dealerManualCompanyId, r.createdAt),
        },
      };
    }
    return { ...r, money: null };
  });
}

// ---------------------------------------------------------------- lists

export type ReminderListType = "due" | "upcoming" | "all";

export async function listActiveReminders(actor: ReminderActor) {
  const module = requireModule(actor);
  const rows = await prisma.reminder.findMany({
    where: { ...visibleWhere(actor, module), doneAt: null },
    include: reminderInclude,
    orderBy: [{ reminderDate: "asc" }, { createdAt: "asc" }],
    take: ACTIVE_LIMIT,
  });
  return module === ReminderModule.DEALER ? withDealerMoney(rows) : rows;
}

export async function listDoneReminders(actor: ReminderActor, limit: number, offset: number) {
  const module = requireModule(actor);
  const where: Prisma.ReminderWhereInput = { ...visibleWhere(actor, module), doneAt: { not: null } };
  const [items, total] = await Promise.all([
    prisma.reminder.findMany({
      where,
      include: reminderInclude,
      orderBy: [{ doneAt: "desc" }, { id: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.reminder.count({ where }),
  ]);
  return { items: module === ReminderModule.DEALER ? await withDealerMoney(items) : items, total };
}

/** Old app versions ask for ?type=due|upcoming|all. Done reminders are hidden. */
export async function listRemindersLegacy(actor: ReminderActor, type: ReminderListType = "due") {
  const module = requireModule(actor);
  const now = new Date();
  const where: Prisma.ReminderWhereInput = { ...visibleWhere(actor, module), doneAt: null };
  if (type === "due") where.reminderDate = { lte: now };
  else if (type === "upcoming") where.reminderDate = { gt: now, lte: new Date(now.getTime() + DAY_MS) };
  return prisma.reminder.findMany({
    where,
    include: reminderInclude,
    orderBy: [{ reminderDate: "asc" }, { createdAt: "desc" }],
    take: ACTIVE_LIMIT,
  });
}

/** People who can be picked: the owner plus active staff of this module. Names only. */
export async function listReminderPeople(actor: ReminderActor) {
  const module = requireModule(actor);
  const [owner, staff] = await Promise.all([
    prisma.user.findUnique({ where: { id: actor.ownerId }, select: { name: true } }),
    prisma.staffUser.findMany({
      where: {
        ownerId: actor.ownerId,
        accountRole: ROLE_BY_MODULE[module],
        isActive: true,
        ...staffPermissionWhere(module),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { owner: { name: owner?.name ?? "Owner" }, staff };
}

// ---------------------------------------------------------------- input checks

export interface ReminderInput {
  title?: unknown;
  reminderDate?: unknown;
  farmId?: unknown;
  batchId?: unknown;
  hatcheryBatchId?: unknown;
  incubationId?: unknown;
  hatcheryPartyId?: unknown;
  dealerCustomerId?: unknown;
  dealerManualCompanyId?: unknown;
  amount?: unknown;
  audience?: unknown;
  notifyOwner?: unknown;
  staffIds?: unknown;
  repeat?: unknown;
  repeatEveryDays?: unknown;
  repeatUntil?: unknown;
}

function optionalId(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ReminderError(400, "Invalid link");
  return value.trim() || null;
}

function parseDate(value: unknown, message: string): Date {
  if (typeof value !== "string" && !(value instanceof Date)) throw new ReminderError(400, message);
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) throw new ReminderError(400, message);
  return date;
}

function parseTitle(value: unknown): string {
  const title = typeof value === "string" ? value.trim() : "";
  if (!title) throw new ReminderError(400, "Write what to remember");
  if (title.length > TITLE_MAX) throw new ReminderError(400, `Keep it under ${TITLE_MAX} letters`);
  return title;
}

function checkWhen(date: Date) {
  const now = Date.now();
  if (date.getTime() < now - PAST_GRACE_MS) throw new ReminderError(400, "Pick a time later than now");
  if (date.getTime() > now + MAX_AHEAD_MS) throw new ReminderError(400, "Pick a date within 2 years");
}

const AMOUNT_MAX = 999_999_999;

/** Money to collect or pay. Dealer reminders only; empty is fine. */
function parseAmount(module: ReminderModule, value: unknown): Prisma.Decimal | null {
  if (value === undefined || value === null || value === "") return null;
  if (module !== ReminderModule.DEALER) throw new ReminderError(400, "Amount is only for dealer reminders");
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  if (!Number.isFinite(n) || n <= 0) throw new ReminderError(400, "Enter an amount more than 0");
  if (n > AMOUNT_MAX) throw new ReminderError(400, "Amount is too big");
  return new Prisma.Decimal(Math.round(n * 100) / 100);
}

type Links = {
  farmId: string | null;
  batchId: string | null;
  hatcheryBatchId: string | null;
  incubationId: string | null;
  hatcheryPartyId: string | null;
  dealerCustomerId: string | null;
  dealerManualCompanyId: string | null;
};

async function checkLinks(ownerId: string, module: ReminderModule, input: ReminderInput): Promise<Links> {
  const links: Links = {
    farmId: optionalId(input.farmId),
    batchId: optionalId(input.batchId),
    hatcheryBatchId: optionalId(input.hatcheryBatchId),
    incubationId: optionalId(input.incubationId),
    hatcheryPartyId: optionalId(input.hatcheryPartyId),
    dealerCustomerId: optionalId(input.dealerCustomerId),
    dealerManualCompanyId: optionalId(input.dealerManualCompanyId),
  };
  const notForThis = () => new ReminderError(400, "This link is not for this account");
  const hasDealerLink = Boolean(links.dealerCustomerId || links.dealerManualCompanyId);

  if (module === ReminderModule.DEALER) {
    if (links.farmId || links.batchId || links.hatcheryBatchId || links.incubationId || links.hatcheryPartyId) {
      throw notForThis();
    }
    if (links.dealerCustomerId && links.dealerManualCompanyId) throw new ReminderError(400, "Link to only one thing");
    // Archived customers and companies are allowed: old dues still need collecting.
    if (links.dealerCustomerId) {
      const found = await prisma.customer.findFirst({
        where: { id: links.dealerCustomerId, userId: ownerId },
        select: { id: true },
      });
      if (!found) throw new ReminderError(404, "Customer not found");
    }
    if (links.dealerManualCompanyId) {
      const found = await prisma.dealerManualCompany.findFirst({
        where: { id: links.dealerManualCompanyId, dealer: { ownerId } },
        select: { id: true },
      });
      if (!found) throw new ReminderError(404, "Company not found");
    }
    return links;
  }
  if (hasDealerLink) throw notForThis();

  if (module === ReminderModule.FARMER) {
    if (links.hatcheryBatchId || links.incubationId || links.hatcheryPartyId) throw notForThis();
    if (links.batchId) {
      const batch = await prisma.batch.findFirst({
        where: { id: links.batchId, farm: { ownerId } },
        select: { farmId: true },
      });
      if (!batch) throw new ReminderError(404, "Batch not found");
      if (links.farmId && links.farmId !== batch.farmId) {
        throw new ReminderError(400, "This batch is not in the chosen farm");
      }
      links.farmId = batch.farmId;
    } else if (links.farmId) {
      const farm = await prisma.farm.findFirst({ where: { id: links.farmId, ownerId }, select: { id: true } });
      if (!farm) throw new ReminderError(404, "Farm not found");
    }
    return links;
  }

  // HATCHERY
  if (links.farmId || links.batchId) throw notForThis();
  const picked = [links.hatcheryBatchId, links.incubationId, links.hatcheryPartyId].filter(Boolean);
  if (picked.length > 1) throw new ReminderError(400, "Link to only one thing");
  if (links.hatcheryBatchId) {
    const found = await prisma.hatcheryBatch.findFirst({
      where: { id: links.hatcheryBatchId, hatcheryOwnerId: ownerId },
      select: { id: true },
    });
    if (!found) throw new ReminderError(404, "Batch not found");
  }
  if (links.incubationId) {
    const found = await prisma.hatcheryIncubationBatch.findFirst({
      where: { id: links.incubationId, hatcheryOwnerId: ownerId },
      select: { id: true },
    });
    if (!found) throw new ReminderError(404, "Incubation not found");
  }
  if (links.hatcheryPartyId) {
    const found = await prisma.hatcheryParty.findFirst({
      where: { id: links.hatcheryPartyId, hatcheryOwnerId: ownerId },
      select: { id: true },
    });
    if (!found) throw new ReminderError(404, "Party not found");
  }
  return links;
}

type AudienceResult = { audience: ReminderAudience; notifyOwner: boolean; staffIds: string[] };

/**
 * Work out who gets the alert. The creator is always included.
 * `creatorStaffId` is the staff who made the reminder (null = owner made it).
 */
async function checkAudience(
  ownerId: string,
  module: ReminderModule,
  input: ReminderInput,
  creatorStaffId: string | null
): Promise<AudienceResult> {
  const raw = input.audience ?? ReminderAudience.ONLY_ME;
  if (!Object.values(ReminderAudience).includes(raw as ReminderAudience)) {
    throw new ReminderError(400, "Choose who gets this reminder");
  }
  const audience = raw as ReminderAudience;

  if (audience === ReminderAudience.EVERYONE) {
    return { audience, notifyOwner: true, staffIds: [] };
  }
  if (audience === ReminderAudience.ONLY_ME) {
    return creatorStaffId
      ? { audience, notifyOwner: false, staffIds: [creatorStaffId] }
      : { audience, notifyOwner: true, staffIds: [] };
  }

  // SELECTED
  if (input.staffIds !== undefined && !Array.isArray(input.staffIds)) {
    throw new ReminderError(400, "Invalid people list");
  }
  const picked = Array.from(
    new Set(((input.staffIds as unknown[]) ?? []).filter((v): v is string => typeof v === "string" && !!v))
  );
  let notifyOwner = input.notifyOwner === true;
  if (picked.length === 0 && !notifyOwner) throw new ReminderError(400, "Pick at least one person");

  if (picked.length > 0) {
    const valid = await prisma.staffUser.findMany({
      where: {
        id: { in: picked },
        ownerId,
        accountRole: ROLE_BY_MODULE[module],
        isActive: true,
      },
      select: { id: true },
    });
    if (valid.length !== picked.length) {
      throw new ReminderError(400, "Some people you picked can't get reminders. Refresh and try again.");
    }
  }

  const staffIds = new Set(picked);
  if (creatorStaffId) staffIds.add(creatorStaffId);
  else notifyOwner = true;
  return { audience, notifyOwner, staffIds: Array.from(staffIds) };
}

type RepeatResult = { repeat: ReminderRepeat; repeatEveryDays: number | null; repeatUntil: Date | null };

function checkRepeat(input: ReminderInput, reminderDate: Date): RepeatResult {
  const raw = input.repeat ?? ReminderRepeat.NONE;
  if (!Object.values(ReminderRepeat).includes(raw as ReminderRepeat)) {
    throw new ReminderError(400, "Choose how often to repeat");
  }
  const repeat = raw as ReminderRepeat;
  if (repeat === ReminderRepeat.NONE) return { repeat, repeatEveryDays: null, repeatUntil: null };

  let repeatEveryDays: number | null = null;
  if (repeat === ReminderRepeat.EVERY_N_DAYS) {
    const n = Number(input.repeatEveryDays);
    if (!Number.isInteger(n) || n < 1 || n > 365) {
      throw new ReminderError(400, "Repeat every 1 to 365 days");
    }
    repeatEveryDays = n;
  }

  let repeatUntil: Date | null = null;
  if (input.repeatUntil !== undefined && input.repeatUntil !== null && input.repeatUntil !== "") {
    repeatUntil = parseDate(input.repeatUntil, "Invalid end date");
    if (repeatUntil.getTime() <= reminderDate.getTime()) {
      throw new ReminderError(400, "The end date must be after the reminder date");
    }
  }
  return { repeat, repeatEveryDays, repeatUntil };
}

// ---------------------------------------------------------------- repeat math

/** Same Nepal time of day, one BS month later. A day the month doesn't have
 * (e.g. 32) becomes that month's last day. */
function addOneBsMonth(date: Date): Date {
  const wall = new Date(date.getTime() + NEPAL_OFFSET_MS);
  const timeOfDayMs = wall.getTime() - Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate());
  const bs = new NepaliDate(new Date(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()));

  let year = bs.getYear();
  let month = bs.getMonth() + 1; // 0-11
  if (month > 11) {
    month = 0;
    year += 1;
  }
  let day = bs.getDate();
  let next = new NepaliDate(year, month, day);
  // The library rolls invalid days into the next month; step back until it fits.
  while (next.getMonth() !== month && day > 1) {
    day -= 1;
    next = new NepaliDate(year, month, day);
  }
  const ad = next.getAD(); // { year, month (0-11), date }
  return new Date(Date.UTC(ad.year, ad.month, ad.date) + timeOfDayMs - NEPAL_OFFSET_MS);
}

function stepOnce(date: Date, repeat: ReminderRepeat, everyDays: number | null): Date {
  switch (repeat) {
    case ReminderRepeat.DAILY:
      return new Date(date.getTime() + DAY_MS);
    case ReminderRepeat.WEEKLY:
      return new Date(date.getTime() + 7 * DAY_MS);
    case ReminderRepeat.MONTHLY:
      return addOneBsMonth(date);
    case ReminderRepeat.EVERY_N_DAYS:
      return new Date(date.getTime() + (everyDays ?? 1) * DAY_MS);
    default:
      return date;
  }
}

/**
 * Next planned time after `from`, counted from the planned date (not from now)
 * and moved forward until it is in the future. Null when it passes repeatUntil.
 */
export function nextRepeatDate(
  from: Date,
  repeat: ReminderRepeat,
  everyDays: number | null,
  repeatUntil: Date | null,
  now: Date = new Date()
): Date | null {
  if (repeat === ReminderRepeat.NONE) return null;
  let next = stepOnce(from, repeat, everyDays);
  let guard = 0;
  while (next.getTime() <= now.getTime() && guard < 5000) {
    next = stepOnce(next, repeat, everyDays);
    guard += 1;
  }
  if (repeatUntil && next.getTime() > repeatUntil.getTime()) return null;
  return next;
}

// ---------------------------------------------------------------- create / edit

export async function createReminder(actor: ReminderActor, input: ReminderInput) {
  const module = requireModule(actor);
  const title = parseTitle(input.title);
  const reminderDate = parseDate(input.reminderDate, "Pick a valid date and time");
  checkWhen(reminderDate);
  const links = await checkLinks(actor.ownerId, module, input);
  const amount = parseAmount(module, input.amount);
  const who = await checkAudience(actor.ownerId, module, input, actor.staffUserId);
  const repeat = checkRepeat(input, reminderDate);

  return prisma.reminder.create({
    data: {
      userId: actor.ownerId,
      module,
      title,
      reminderDate,
      ...links,
      amount,
      audience: who.audience,
      notifyOwner: who.notifyOwner,
      createdByStaffId: actor.staffUserId,
      ...repeat,
      recipients: { create: who.staffIds.map((staffUserId) => ({ staffUserId })) },
    },
    include: reminderInclude,
  });
}

export async function updateReminder(actor: ReminderActor, id: string, input: ReminderInput) {
  const { reminder, module } = await findVisible(actor, id);
  assertCanChange(actor, reminder);
  if (reminder.doneAt) throw new ReminderError(400, "This reminder is done. Undo it first to change it.");

  const title = parseTitle(input.title);
  const reminderDate = parseDate(input.reminderDate, "Pick a valid date and time");
  const dateChanged = reminderDate.getTime() !== reminder.reminderDate.getTime();
  if (dateChanged) checkWhen(reminderDate);
  const links = await checkLinks(actor.ownerId, module, input);
  const amount = parseAmount(module, input.amount);
  // The creator of the reminder stays included, not the person editing it.
  const who = await checkAudience(actor.ownerId, module, input, reminder.createdByStaffId);
  const repeat = checkRepeat(input, reminderDate);

  return prisma.$transaction(async (tx) => {
    await tx.reminderRecipient.deleteMany({ where: { reminderId: id } });
    return tx.reminder.update({
      where: { id },
      data: {
        title,
        reminderDate,
        ...links,
        amount,
        audience: who.audience,
        notifyOwner: who.notifyOwner,
        ...repeat,
        // A new time means it should be sent again.
        ...(dateChanged ? { notifiedAt: null, isNoticed: false } : {}),
        recipients: { create: who.staffIds.map((staffUserId) => ({ staffUserId })) },
      },
      include: reminderInclude,
    });
  });
}

// ---------------------------------------------------------------- done / undo / snooze / delete

export async function markReminderDone(actor: ReminderActor, id: string) {
  const { reminder } = await findVisible(actor, id);
  if (reminder.doneAt) {
    return { reminder, alreadyDone: true as const, next: null };
  }

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.reminder.updateMany({
      where: { id, doneAt: null },
      data: { doneAt: new Date(), doneByStaffId: actor.staffUserId },
    });
    if (claimed.count === 0) {
      const current = await tx.reminder.findUniqueOrThrow({ where: { id }, include: reminderInclude });
      return { reminder: current, alreadyDone: true as const, next: null };
    }

    let next = null;
    if (reminder.repeat !== ReminderRepeat.NONE && !reminder.repeatedTo) {
      const nextDate = nextRepeatDate(
        reminder.reminderDate,
        reminder.repeat,
        reminder.repeatEveryDays,
        reminder.repeatUntil
      );
      if (nextDate) {
        next = await tx.reminder.create({
          data: {
            userId: reminder.userId,
            module: reminder.module,
            title: reminder.title,
            reminderDate: nextDate,
            farmId: reminder.farmId,
            batchId: reminder.batchId,
            hatcheryBatchId: reminder.hatcheryBatchId,
            incubationId: reminder.incubationId,
            hatcheryPartyId: reminder.hatcheryPartyId,
            dealerCustomerId: reminder.dealerCustomerId,
            dealerManualCompanyId: reminder.dealerManualCompanyId,
            amount: reminder.amount,
            audience: reminder.audience,
            notifyOwner: reminder.notifyOwner,
            createdByStaffId: reminder.createdByStaffId,
            repeat: reminder.repeat,
            repeatEveryDays: reminder.repeatEveryDays,
            repeatUntil: reminder.repeatUntil,
            repeatedFromId: reminder.id,
            recipients: {
              create: reminder.recipients.map((r) => ({ staffUserId: r.staffUser.id })),
            },
          },
          include: reminderInclude,
        });
      }
    }

    const updated = await tx.reminder.findUniqueOrThrow({ where: { id }, include: reminderInclude });
    return { reminder: updated, alreadyDone: false as const, next };
  });
}

export async function undoReminderDone(actor: ReminderActor, id: string) {
  const { reminder } = await findVisible(actor, id);
  if (!reminder.doneAt) return { reminder, nextAlreadyMade: false };
  const updated = await prisma.reminder.update({
    where: { id },
    data: { doneAt: null, doneByStaffId: null },
    include: reminderInclude,
  });
  return { reminder: updated, nextAlreadyMade: Boolean(reminder.repeatedTo) };
}

export async function snoozeReminder(actor: ReminderActor, id: string, untilRaw: unknown) {
  const { reminder } = await findVisible(actor, id);
  if (reminder.doneAt) throw new ReminderError(400, "This reminder is done. Undo it first.");
  const until = parseDate(untilRaw, "Pick a valid time");
  const now = Date.now();
  if (until.getTime() <= now) throw new ReminderError(400, "Pick a time later than now");
  if (until.getTime() > now + MAX_SNOOZE_MS) throw new ReminderError(400, "Pick a time within 1 year");
  return prisma.reminder.update({
    where: { id },
    data: { reminderDate: until, notifiedAt: null, isNoticed: false },
    include: reminderInclude,
  });
}

export async function deleteReminder(actor: ReminderActor, id: string) {
  const { reminder } = await findVisible(actor, id);
  assertCanChange(actor, reminder);
  const deleted = await prisma.reminder.deleteMany({ where: { id, userId: actor.ownerId } });
  return deleted.count > 0;
}
