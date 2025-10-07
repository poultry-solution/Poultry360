import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, WeightSource } from "@prisma/client";

// ==================== ADD BIRD WEIGHT ====================
export const addBirdWeight = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { batchId } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;
    const { date, avgWeight, sampleCount, notes } = req.body;

    // Validate required fields
    if (!date || !avgWeight || !sampleCount) {
      return res.status(400).json({
        message: "date, avgWeight, and sampleCount are required",
      });
    }

    if (avgWeight <= 0 || sampleCount <= 0) {
      return res.status(400).json({
        message: "avgWeight and sampleCount must be positive numbers",
      });
    }

    // Check if batch exists and user has access
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        farm: {
          include: { managers: true },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        batch.farm.ownerId === currentUserId ||
        batch.farm.managers.some((manager) => manager.id === currentUserId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Create bird weight record and update batch's currentWeight
    const result = await prisma.$transaction(async (tx) => {
      // Create the weight record
      const birdWeight = await tx.birdWeight.create({
        data: {
          batchId,
          date: new Date(date),
          avgWeight: Number(avgWeight),
          sampleCount: Number(sampleCount),
          source: WeightSource.MANUAL,
          notes: notes || null,
        },
      });

      // Update batch's currentWeight to this new value
      await tx.batch.update({
        where: { id: batchId },
        data: {
          currentWeight: Number(avgWeight),
        },
      });

      return birdWeight;
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Add bird weight error:", error);
    return res.status(500).json({
      message: error?.message || "Failed to add bird weight",
    });
  }
};

// ==================== GET BIRD WEIGHTS ====================
export const getBirdWeights = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { batchId } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;
    const { startDate, endDate, source } = req.query;

    // Check if batch exists and user has access
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        farm: {
          include: { managers: true },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        batch.farm.ownerId === currentUserId ||
        batch.farm.managers.some((manager) => manager.id === currentUserId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Build where clause
    const where: any = { batchId };

    if (startDate) {
      where.date = { ...where.date, gte: new Date(startDate as string) };
    }

    if (endDate) {
      where.date = { ...where.date, lte: new Date(endDate as string) };
    }

    if (source) {
      where.source = source as WeightSource;
    }

    // Fetch weights
    const weights = await prisma.birdWeight.findMany({
      where,
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        avgWeight: true,
        sampleCount: true,
        source: true,
        notes: true,
        createdAt: true,
      },
    });

    // Calculate growth metrics
    let growthRate = null;
    let totalGrowth = null;
    let daysActive = null;

    if (weights.length >= 2) {
      const latestWeight = weights[0];
      const earliestWeight = weights[weights.length - 1];
      
      const days = Math.floor(
        (new Date(latestWeight.date).getTime() -
          new Date(earliestWeight.date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      
      if (days > 0) {
        totalGrowth = Number(latestWeight.avgWeight) - Number(earliestWeight.avgWeight);
        growthRate = totalGrowth / days;
        daysActive = days;
      }
    }

    return res.json({
      success: true,
      data: {
        weights,
        currentWeight: batch.currentWeight ? Number(batch.currentWeight) : null,
        growthMetrics: {
          growthRate: growthRate ? Number(growthRate.toFixed(4)) : null,
          totalGrowth: totalGrowth ? Number(totalGrowth.toFixed(3)) : null,
          daysActive,
          recordCount: weights.length,
        },
      },
    });
  } catch (error: any) {
    console.error("Get bird weights error:", error);
    return res.status(500).json({
      message: error?.message || "Failed to fetch bird weights",
    });
  }
};

// ==================== UPDATE BIRD WEIGHT ====================
export const updateBirdWeight = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { batchId, weightId } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;
    const { date, avgWeight, sampleCount, notes } = req.body;

    // Check if weight record exists
    const existingWeight = await prisma.birdWeight.findUnique({
      where: { id: weightId },
      include: {
        batch: {
          include: {
            farm: {
              include: { managers: true },
            },
          },
        },
      },
    });

    if (!existingWeight) {
      return res.status(404).json({ message: "Weight record not found" });
    }

    if (existingWeight.batchId !== batchId) {
      return res.status(400).json({ message: "Weight does not belong to this batch" });
    }

    // Only allow updating MANUAL entries
    if (existingWeight.source !== WeightSource.MANUAL) {
      return res.status(403).json({
        message: "Can only update manually entered weights. This weight was auto-generated from sales.",
      });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        existingWeight.batch.farm.ownerId === currentUserId ||
        existingWeight.batch.farm.managers.some(
          (manager) => manager.id === currentUserId
        );
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Update the weight record
    const updateData: any = {};
    if (date) updateData.date = new Date(date);
    if (avgWeight) updateData.avgWeight = Number(avgWeight);
    if (sampleCount) updateData.sampleCount = Number(sampleCount);
    if (notes !== undefined) updateData.notes = notes;

    const result = await prisma.$transaction(async (tx) => {
      // Update the weight record
      const updatedWeight = await tx.birdWeight.update({
        where: { id: weightId },
        data: updateData,
      });

      // Check if this was the latest weight - if so, update batch's currentWeight
      const latestWeight = await tx.birdWeight.findFirst({
        where: { batchId },
        orderBy: { date: "desc" },
      });

      if (latestWeight && latestWeight.id === weightId) {
        await tx.batch.update({
          where: { id: batchId },
          data: {
            currentWeight: updatedWeight.avgWeight,
          },
        });
      }

      return updatedWeight;
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Update bird weight error:", error);
    return res.status(500).json({
      message: error?.message || "Failed to update bird weight",
    });
  }
};

// ==================== DELETE BIRD WEIGHT ====================
export const deleteBirdWeight = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { batchId, weightId } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Check if weight record exists
    const existingWeight = await prisma.birdWeight.findUnique({
      where: { id: weightId },
      include: {
        batch: {
          include: {
            farm: {
              include: { managers: true },
            },
          },
        },
      },
    });

    if (!existingWeight) {
      return res.status(404).json({ message: "Weight record not found" });
    }

    if (existingWeight.batchId !== batchId) {
      return res.status(400).json({ message: "Weight does not belong to this batch" });
    }

    // Only allow deleting MANUAL entries
    if (existingWeight.source !== WeightSource.MANUAL) {
      return res.status(403).json({
        message: "Can only delete manually entered weights. This weight was auto-generated from sales.",
      });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        existingWeight.batch.farm.ownerId === currentUserId ||
        existingWeight.batch.farm.managers.some(
          (manager) => manager.id === currentUserId
        );
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Delete the weight record and recalculate currentWeight
    await prisma.$transaction(async (tx) => {
      // Delete the weight
      await tx.birdWeight.delete({
        where: { id: weightId },
      });

      // Recalculate batch's currentWeight from remaining weights
      const latestWeight = await tx.birdWeight.findFirst({
        where: { batchId },
        orderBy: { date: "desc" },
      });

      await tx.batch.update({
        where: { id: batchId },
        data: {
          currentWeight: latestWeight ? latestWeight.avgWeight : null,
        },
      });
    });

    return res.json({
      success: true,
      message: "Weight record deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete bird weight error:", error);
    return res.status(500).json({
      message: error?.message || "Failed to delete bird weight",
    });
  }
};

// ==================== GET GROWTH CHART DATA ====================
export const getGrowthChartData = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { batchId } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Check if batch exists and user has access
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        farm: {
          include: { managers: true },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        batch.farm.ownerId === currentUserId ||
        batch.farm.managers.some((manager) => manager.id === currentUserId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Fetch all weights for charting
    const weights = await prisma.birdWeight.findMany({
      where: { batchId },
      orderBy: { date: "asc" },
      select: {
        date: true,
        avgWeight: true,
        source: true,
      },
    });

    // Format for chart
    const chartData = weights.map((w) => ({
      date: w.date.toISOString().split("T")[0],
      weight: Number(w.avgWeight),
      source: w.source,
    }));

    return res.json({
      success: true,
      data: chartData,
    });
  } catch (error: any) {
    console.error("Get growth chart data error:", error);
    return res.status(500).json({
      message: error?.message || "Failed to fetch growth chart data",
    });
  }
};

