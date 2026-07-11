/**
 * Dealer Cash In Hand service.
 *
 * All "today" is determined server-side via Nepal UTC+5:45 clock.
 * Clients never supply a bsDate; it is always stamped here.
 *
 * Computation chain for opening(D):
 *   - If D === settings.startBsDate → settings.initialOpening
 *   - Else: find DealerCashDayClose for D_prev.
 *       - If row exists → closingSnapshot
 *       - Else: recurse to computeOpeningForBsDate(D_prev) + dayNet(D_prev)
 *   Recursion bottoms out at startBsDate.
 *
 * ensureSystemCloseYesterday is called at the start of every API handler.
 * It closes yesterday lazily when the day has rolled over but no USER or
 * SYSTEM close row exists yet.
 */

import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import {
  getNepalBsTodayString,
  prevBsDate,
  bsDateBefore,
} from "../utils/nepalBsDate";

// ── Compute net cash change for a specific BS date ───────────────────────────

export async function computeDayNet(
  dealerId: string,
  bsDate: string
): Promise<number> {
  const movements = await prisma.dealerCashMovement.findMany({
    where: { dealerId, bsDate },
    select: { direction: true, amount: true },
  });
  let net = 0;
  for (const m of movements) {
    const amt = Number(m.amount);
    if (m.direction === "IN") net += amt;
    else net -= amt;
  }
  return net;
}

// ── Compute opening balance for a BS date ────────────────────────────────────

export async function computeOpeningForBsDate(
  dealerId: string,
  bsDate: string,
  settings: { initialOpening: number; startBsDate: string }
): Promise<number> {
  if (bsDate === settings.startBsDate || bsDateBefore(bsDate, settings.startBsDate)) {
    return settings.initialOpening;
  }

  const prev = prevBsDate(bsDate);

  // Check if a close row exists for yesterday
  const closeRow = await prisma.dealerCashDayClose.findUnique({
    where: { dealerId_bsDate: { dealerId, bsDate: prev } },
    select: { closingSnapshot: true },
  });

  if (closeRow) {
    return Number(closeRow.closingSnapshot);
  }

  // No close row; recurse
  const prevOpening = await computeOpeningForBsDate(dealerId, prev, settings);
  const prevNet = await computeDayNet(dealerId, prev);
  return prevOpening + prevNet;
}

// ── Lazy system close for yesterday ──────────────────────────────────────────

/**
 * If yesterday has not been closed yet, insert a SYSTEM close row.
 * Idempotent — safe to call on every request.
 */
export async function ensureSystemCloseYesterday(
  dealerId: string,
  todayBs: string,
  settings: { initialOpening: number; startBsDate: string }
): Promise<void> {
  const yesterday = prevBsDate(todayBs);

  // Don't go back before the book was opened
  if (bsDateBefore(yesterday, settings.startBsDate)) return;

  const existing = await prisma.dealerCashDayClose.findUnique({
    where: { dealerId_bsDate: { dealerId, bsDate: yesterday } },
  });
  if (existing) return;

  const opening = await computeOpeningForBsDate(dealerId, yesterday, settings);
  const net = await computeDayNet(dealerId, yesterday);
  const closing = opening + net;

  await prisma.dealerCashDayClose.create({
    data: {
      dealerId,
      bsDate: yesterday,
      openingSnapshot: new Prisma.Decimal(opening),
      closingSnapshot: new Prisma.Decimal(closing),
      source: "SYSTEM",
      closedAt: new Date(),
    },
  });
}

// ── Load settings helper ──────────────────────────────────────────────────────

export async function getSettings(dealerId: string) {
  const s = await prisma.dealerCashSettings.findUnique({ where: { dealerId } });
  if (!s) return null;
  return {
    initialOpening: Number(s.initialOpening),
    startBsDate: s.startBsDate,
  };
}

// ── Fetch today's data ────────────────────────────────────────────────────────

export async function getTodayData(dealerId: string) {
  const todayBs = getNepalBsTodayString();
  const settings = await getSettings(dealerId);

  if (!settings) {
    return { needsSetup: true, todayBs };
  }

  await ensureSystemCloseYesterday(dealerId, todayBs, settings);

  const opening = await computeOpeningForBsDate(dealerId, todayBs, settings);
  const movements = await prisma.dealerCashMovement.findMany({
    where: { dealerId, bsDate: todayBs },
    orderBy: { createdAt: "asc" },
  });

  const dayClose = await prisma.dealerCashDayClose.findUnique({
    where: { dealerId_bsDate: { dealerId, bsDate: todayBs } },
  });

  let net = 0;
  for (const m of movements) {
    const amt = Number(m.amount);
    if (m.direction === "IN") net += amt;
    else net -= amt;
  }
  const closing = opening + net;

  return {
    needsSetup: false,
    todayBs,
    opening,
    closing,
    isClosed: !!dayClose,
    closedAt: dayClose?.closedAt ?? null,
    movements: movements.map((m) => ({
      id: m.id,
      direction: m.direction,
      amount: Number(m.amount),
      partyName: m.partyName,
      notes: m.notes,
      createdAt: m.createdAt,
    })),
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

export async function setupCashBook(
  dealerId: string,
  initialOpening: number
): Promise<void> {
  const existing = await prisma.dealerCashSettings.findUnique({ where: { dealerId } });
  if (existing) throw new Error("Cash book already set up");

  const todayBs = getNepalBsTodayString();
  await prisma.dealerCashSettings.create({
    data: {
      dealerId,
      initialOpening: new Prisma.Decimal(initialOpening),
      startBsDate: todayBs,
    },
  });
}

// ── Add movement ──────────────────────────────────────────────────────────────

export async function addMovement(
  dealerId: string,
  recordedById: string,
  direction: "IN" | "OUT",
  amount: number,
  partyName: string,
  notes?: string
): Promise<void> {
  const settings = await getSettings(dealerId);
  if (!settings) throw new Error("Cash book not set up yet");

  const todayBs = getNepalBsTodayString();

  await ensureSystemCloseYesterday(dealerId, todayBs, settings);

  const todayClose = await prisma.dealerCashDayClose.findUnique({
    where: { dealerId_bsDate: { dealerId, bsDate: todayBs } },
  });
  if (todayClose) {
    throw new Error("Today is already closed. New entries will be added to tomorrow.");
  }

  if (amount <= 0) throw new Error("Amount must be greater than 0");

  await prisma.dealerCashMovement.create({
    data: {
      dealerId,
      bsDate: todayBs,
      direction,
      amount: new Prisma.Decimal(amount),
      partyName: partyName.trim(),
      notes: notes?.trim() || null,
      recordedById,
    },
  });
}

export async function deleteMovement(dealerId: string, movementId: string): Promise<void> {
  const settings = await getSettings(dealerId);
  if (!settings) throw new Error("Cash book not set up yet");

  const todayBs = getNepalBsTodayString();
  await ensureSystemCloseYesterday(dealerId, todayBs, settings);

  const todayClose = await prisma.dealerCashDayClose.findUnique({
    where: { dealerId_bsDate: { dealerId, bsDate: todayBs } },
  });
  if (todayClose) {
    throw new Error("Today is already closed. Movements cannot be deleted.");
  }

  const movement = await prisma.dealerCashMovement.findFirst({
    where: { id: movementId, dealerId },
  });
  if (!movement) {
    throw new Error("Movement not found");
  }
  if (movement.bsDate !== todayBs) {
    throw new Error("Only today's movements can be deleted");
  }

  await prisma.dealerCashMovement.delete({ where: { id: movementId } });
}

// ── Close day ─────────────────────────────────────────────────────────────────

export async function closeToday(dealerId: string): Promise<{
  bsDate: string;
  opening: number;
  closing: number;
  alreadyClosed: boolean;
}> {
  const settings = await getSettings(dealerId);
  if (!settings) throw new Error("Cash book not set up yet");

  const todayBs = getNepalBsTodayString();

  await ensureSystemCloseYesterday(dealerId, todayBs, settings);

  // Idempotent – if already closed, return snapshot
  const existing = await prisma.dealerCashDayClose.findUnique({
    where: { dealerId_bsDate: { dealerId, bsDate: todayBs } },
  });
  if (existing) {
    return {
      bsDate: todayBs,
      opening: Number(existing.openingSnapshot),
      closing: Number(existing.closingSnapshot),
      alreadyClosed: true,
    };
  }

  const opening = await computeOpeningForBsDate(dealerId, todayBs, settings);
  const net = await computeDayNet(dealerId, todayBs);
  const closing = opening + net;

  await prisma.dealerCashDayClose.create({
    data: {
      dealerId,
      bsDate: todayBs,
      openingSnapshot: new Prisma.Decimal(opening),
      closingSnapshot: new Prisma.Decimal(closing),
      source: "USER",
      closedAt: new Date(),
    },
  });

  return { bsDate: todayBs, opening, closing, alreadyClosed: false };
}

// ── History ───────────────────────────────────────────────────────────────────

export async function getHistory(
  dealerId: string,
  limit = 30
): Promise<
  Array<{
    bsDate: string;
    openingSnapshot: number;
    closingSnapshot: number;
    source: string;
    closedAt: Date;
    movementsCount: number;
  }>
> {
  const closes = await prisma.dealerCashDayClose.findMany({
    where: { dealerId },
    orderBy: { bsDate: "desc" },
    take: limit,
  });

  const result = await Promise.all(
    closes.map(async (c) => {
      const count = await prisma.dealerCashMovement.count({
        where: { dealerId, bsDate: c.bsDate },
      });
      return {
        bsDate: c.bsDate,
        openingSnapshot: Number(c.openingSnapshot),
        closingSnapshot: Number(c.closingSnapshot),
        source: c.source,
        closedAt: c.closedAt,
        movementsCount: count,
      };
    })
  );

  return result;
}

const BS_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Movements for a closed BS day (must have a day-close row). */
export async function getClosedDayDetail(dealerId: string, bsDate: string) {
  if (!BS_DATE_REGEX.test(bsDate)) {
    throw new Error("Invalid bsDate");
  }

  const close = await prisma.dealerCashDayClose.findUnique({
    where: { dealerId_bsDate: { dealerId, bsDate } },
  });
  if (!close) {
    throw new Error("Day not found or not closed");
  }

  const movements = await prisma.dealerCashMovement.findMany({
    where: { dealerId, bsDate },
    orderBy: { createdAt: "asc" },
  });

  return {
    bsDate,
    openingSnapshot: Number(close.openingSnapshot),
    closingSnapshot: Number(close.closingSnapshot),
    source: close.source,
    closedAt: close.closedAt,
    movements: movements.map((m) => ({
      id: m.id,
      direction: m.direction,
      amount: Number(m.amount),
      partyName: m.partyName,
      notes: m.notes,
      createdAt: m.createdAt,
    })),
  };
}
