/**
 * Farmer cash in hand — same rules as dealer cash in hand, keyed by userId (OWNER account).
 */

import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import {
  getNepalBsTodayString,
  prevBsDate,
  bsDateBefore,
} from "../utils/nepalBsDate";

export async function computeDayNet(
  userId: string,
  bsDate: string
): Promise<number> {
  const movements = await prisma.farmerCashMovement.findMany({
    where: { userId, bsDate },
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

export async function computeOpeningForBsDate(
  userId: string,
  bsDate: string,
  settings: { initialOpening: number; startBsDate: string }
): Promise<number> {
  if (bsDate === settings.startBsDate || bsDateBefore(bsDate, settings.startBsDate)) {
    return settings.initialOpening;
  }

  const prev = prevBsDate(bsDate);

  const closeRow = await prisma.farmerCashDayClose.findUnique({
    where: { userId_bsDate: { userId, bsDate: prev } },
    select: { closingSnapshot: true },
  });

  if (closeRow) {
    return Number(closeRow.closingSnapshot);
  }

  const prevOpening = await computeOpeningForBsDate(userId, prev, settings);
  const prevNet = await computeDayNet(userId, prev);
  return prevOpening + prevNet;
}

export async function ensureSystemCloseYesterday(
  userId: string,
  todayBs: string,
  settings: { initialOpening: number; startBsDate: string }
): Promise<void> {
  const yesterday = prevBsDate(todayBs);

  if (bsDateBefore(yesterday, settings.startBsDate)) return;

  const existing = await prisma.farmerCashDayClose.findUnique({
    where: { userId_bsDate: { userId, bsDate: yesterday } },
  });
  if (existing) return;

  const opening = await computeOpeningForBsDate(userId, yesterday, settings);
  const net = await computeDayNet(userId, yesterday);
  const closing = opening + net;

  await prisma.farmerCashDayClose.create({
    data: {
      userId,
      bsDate: yesterday,
      openingSnapshot: new Prisma.Decimal(opening),
      closingSnapshot: new Prisma.Decimal(closing),
      source: "SYSTEM",
      closedAt: new Date(),
    },
  });
}

export async function getSettings(userId: string) {
  const s = await prisma.farmerCashSettings.findUnique({ where: { userId } });
  if (!s) return null;
  return {
    initialOpening: Number(s.initialOpening),
    startBsDate: s.startBsDate,
  };
}

export async function getTodayData(userId: string) {
  const todayBs = getNepalBsTodayString();
  const settings = await getSettings(userId);

  if (!settings) {
    return { needsSetup: true, todayBs };
  }

  await ensureSystemCloseYesterday(userId, todayBs, settings);

  const opening = await computeOpeningForBsDate(userId, todayBs, settings);
  const movements = await prisma.farmerCashMovement.findMany({
    where: { userId, bsDate: todayBs },
    orderBy: { createdAt: "asc" },
  });

  const dayClose = await prisma.farmerCashDayClose.findUnique({
    where: { userId_bsDate: { userId, bsDate: todayBs } },
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

export async function setupCashBook(
  userId: string,
  initialOpening: number
): Promise<void> {
  const existing = await prisma.farmerCashSettings.findUnique({ where: { userId } });
  if (existing) throw new Error("Cash book already set up");

  const todayBs = getNepalBsTodayString();
  await prisma.farmerCashSettings.create({
    data: {
      userId,
      initialOpening: new Prisma.Decimal(initialOpening),
      startBsDate: todayBs,
    },
  });
}

export async function addMovement(
  userId: string,
  recordedById: string,
  direction: "IN" | "OUT",
  amount: number,
  partyName: string,
  notes?: string
): Promise<void> {
  const settings = await getSettings(userId);
  if (!settings) throw new Error("Cash book not set up yet");

  const todayBs = getNepalBsTodayString();

  await ensureSystemCloseYesterday(userId, todayBs, settings);

  const todayClose = await prisma.farmerCashDayClose.findUnique({
    where: { userId_bsDate: { userId, bsDate: todayBs } },
  });
  if (todayClose) {
    throw new Error("Today is already closed. New entries will be added to tomorrow.");
  }

  if (amount <= 0) throw new Error("Amount must be greater than 0");

  await prisma.farmerCashMovement.create({
    data: {
      userId,
      bsDate: todayBs,
      direction,
      amount: new Prisma.Decimal(amount),
      partyName: partyName.trim(),
      notes: notes?.trim() || null,
      recordedById,
    },
  });
}

export async function closeToday(userId: string): Promise<{
  bsDate: string;
  opening: number;
  closing: number;
  alreadyClosed: boolean;
}> {
  const settings = await getSettings(userId);
  if (!settings) throw new Error("Cash book not set up yet");

  const todayBs = getNepalBsTodayString();

  await ensureSystemCloseYesterday(userId, todayBs, settings);

  const existing = await prisma.farmerCashDayClose.findUnique({
    where: { userId_bsDate: { userId, bsDate: todayBs } },
  });
  if (existing) {
    return {
      bsDate: todayBs,
      opening: Number(existing.openingSnapshot),
      closing: Number(existing.closingSnapshot),
      alreadyClosed: true,
    };
  }

  const opening = await computeOpeningForBsDate(userId, todayBs, settings);
  const net = await computeDayNet(userId, todayBs);
  const closing = opening + net;

  await prisma.farmerCashDayClose.create({
    data: {
      userId,
      bsDate: todayBs,
      openingSnapshot: new Prisma.Decimal(opening),
      closingSnapshot: new Prisma.Decimal(closing),
      source: "USER",
      closedAt: new Date(),
    },
  });

  return { bsDate: todayBs, opening, closing, alreadyClosed: false };
}

export async function getHistory(
  userId: string,
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
  const closes = await prisma.farmerCashDayClose.findMany({
    where: { userId },
    orderBy: { bsDate: "desc" },
    take: limit,
  });

  const result = await Promise.all(
    closes.map(async (c) => {
      const count = await prisma.farmerCashMovement.count({
        where: { userId, bsDate: c.bsDate },
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

export async function getClosedDayDetail(userId: string, bsDate: string) {
  if (!BS_DATE_REGEX.test(bsDate)) {
    throw new Error("Invalid bsDate");
  }

  const close = await prisma.farmerCashDayClose.findUnique({
    where: { userId_bsDate: { userId, bsDate } },
  });
  if (!close) {
    throw new Error("Day not found or not closed");
  }

  const movements = await prisma.farmerCashMovement.findMany({
    where: { userId, bsDate },
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
