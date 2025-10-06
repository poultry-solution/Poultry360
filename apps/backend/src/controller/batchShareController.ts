import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createBatchShare = async (req: Request, res: Response) => {
  try {
    const {
      batchId,
      title,
      description,
      isPublic = false,
      expiresIn, // '1d' | '7d' | '30d' | 'never'
      sharedWithId,
      conversationId,
    } = req.body || {};

    if (!batchId) {
      return res.status(400).json({ message: "batchId is required" });
    }

    // Load batch and related data to build a snapshot
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        farm: true,
        feedConsumptions: { orderBy: { date: "asc" } },
        mortalities: { orderBy: { date: "asc" } },
        vaccinations: { orderBy: { scheduledDate: "asc" } },
        expenses: true,
        sales: true,
      },
    });

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // Compute some simple aggregates for snapshot
    const totalMortality = batch.mortalities.reduce(
      (sum, m) => sum + (m.count || 0),
      0
    );
    const currentChicks = Math.max(0, batch.initialChicks - totalMortality);

    const totalFeed = batch.feedConsumptions.reduce(
      (sum, f) => sum + Number(f.quantity || 0),
      0
    );

    const totalExpenses = batch.expenses.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );
    const totalRevenue = batch.sales.reduce(
      (sum, s) => sum + Number(s.amount || 0),
      0
    );

    const snapshotData = {
      batch: {
        id: batch.id,
        batchNumber: batch.batchNumber,
        startDate: batch.startDate,
        endDate: batch.endDate,
        status: batch.status,
        initialChicks: batch.initialChicks,
        currentChicks,
      },
      farm: {
        id: batch.farm.id,
        name: batch.farm.name,
        capacity: batch.farm.capacity,
      },
      feed: {
        totalConsumption: totalFeed,
        timeline: batch.feedConsumptions.map((f) => ({
          date: f.date,
          quantity: Number(f.quantity),
          feedType: f.feedType,
        })),
      },
      health: {
        totalMortality,
        mortalityRate:
          batch.initialChicks > 0
            ? (totalMortality / batch.initialChicks) * 100
            : 0,
        vaccinations: batch.vaccinations.map((v) => ({
          name: v.vaccineName,
          date: v.completedDate || v.scheduledDate,
          status: v.status,
          notes: v.notes,
        })),
      },
      financials: {
        totalExpenses,
        totalRevenue,
        netProfit: totalRevenue - totalExpenses,
      },
      meta: {
        snapshotDate: new Date().toISOString(),
        lastUpdated: batch.updatedAt,
      },
    };

    // compute expiration
    let expiresAt: Date | null = null;
    if (expiresIn && expiresIn !== "never") {
      const now = new Date();
      const map: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30 };
      const days = map[expiresIn] || 0;
      if (days > 0) {
        expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      }
    }

    // Create share record
    const share = await prisma.batchShare.create({
      data: {
        batchId: batch.id,
        farmerId: batch.farm.ownerId,
        sharedWithId: sharedWithId || null,
        conversationId: conversationId || null,
        snapshotData,
        title: title || null,
        description: description || null,
        isPublic: Boolean(isPublic),
        expiresAt: expiresAt || null,
      },
      select: {
        id: true,
        shareToken: true,
        expiresAt: true,
        isPublic: true,
      },
    });

    const shareUrl = `/share/batch/${share.shareToken}`;

    return res.status(201).json({
      shareId: share.id,
      shareToken: share.shareToken,
      shareUrl,
      expiresAt: share.expiresAt,
      isPublic: share.isPublic,
    });
  } catch (error) {
    console.error("createBatchShare error:", error);
    return res.status(500).json({ message: "Failed to create batch share" });
  }
};

export const getBatchShareByToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params as { token: string };
    if (!token) return res.status(400).json({ message: "token is required" });

    const share = await prisma.batchShare.findFirst({
      where: { shareToken: token },
      select: {
        id: true,
        title: true,
        description: true,
        isPublic: true,
        expiresAt: true,
        snapshotData: true,
        createdAt: true,
        viewCount: true,
      },
    });

    if (!share) return res.status(404).json({ message: "Share not found" });

    // No auth/security checks for now as requested

    // Increment view count (fire and forget)
    prisma.batchShare
      .update({
        where: { id: share.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {});

    return res.json({
      share: {
        id: share.id,
        title: share.title,
        description: share.description,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        snapshotData: share.snapshotData,
        viewCount: share.viewCount,
      },
      canAddNotes: false,
    });
  } catch (error) {
    console.error("getBatchShareByToken error:", error);
    return res.status(500).json({ message: "Failed to load share" });
  }
};
