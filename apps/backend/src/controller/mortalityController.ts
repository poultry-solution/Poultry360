import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole } from "@prisma/client";
import { CreateMortalitySchema } from "@myapp/shared-types";

// ==================== GET ALL MORTALITIES ====================
export const getAllMortalities = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      page = 1,
      limit = 10,
      batchId,
      farmId,
      startDate,
      endDate,
      reason,
    } = req.query;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};

    // Role-based filtering
    if (currentUserRole === UserRole.MANAGER) {
      const userFarms = await prisma.farm.findMany({
        where: {
          OR: [
            { ownerId: currentUserId },
            { managers: { some: { id: currentUserId } } },
          ],
        },
        select: { id: true },
      });
      const farmIds = userFarms.map((farm) => farm.id);

      // Get batches from user's farms
      const userBatches = await prisma.batch.findMany({
        where: { farmId: { in: farmIds } },
        select: { id: true },
      });
      where.batchId = { in: userBatches.map((batch) => batch.id) };
    }

    if (batchId) {
      where.batchId = batchId as string;
    }

    if (farmId) {
      // Get batches from this farm
      const farmBatches = await prisma.batch.findMany({
        where: { farmId: farmId as string },
        select: { id: true },
      });
      where.batchId = { in: farmBatches.map((batch) => batch.id) };
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    if (reason) {
      where.reason = { contains: reason as string, mode: "insensitive" };
    }

    // Exclude sale-related mortality (slaughtered for sale)
    where.NOT = {
      reason: "SLAUGHTERED_FOR_SALE",
    };

    const [mortalities, total] = await Promise.all([
      prisma.mortality.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          batch: {
            select: {
              id: true,
              batchNumber: true,
              status: true,
              farm: {
                select: {
                  id: true,
                  name: true,
                  owner: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          sale: {
            select: {
              id: true,
              amount: true,
              quantity: true,
              date: true,
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.mortality.count({ where }),
    ]);

    return res.json({
      success: true,
      data: mortalities,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all mortalities error:", error);
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
  }
};

// ==================== GET MORTALITY BY ID ====================
export const getMortalityById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const mortality = await prisma.mortality.findUnique({
      where: { id },
      include: {
        batch: {
          include: {
            farm: {
              include: {
                owner: true,
                managers: true,
              },
            },
          },
        },
        sale: {
          select: {
            id: true,
            amount: true,
            quantity: true,
            weight: true,
            date: true,
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!mortality) {
      return res.status(404).json({ message: "Mortality record not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        mortality.batch.farm.ownerId === currentUserId ||
        mortality.batch.farm.managers.some(
          (manager) => manager.id === currentUserId
        );

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    return res.json({
      success: true,
      data: mortality,
    });
  } catch (error) {
    console.error("Get mortality by ID error:", error);
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
  }
};

// ==================== GET BATCH MORTALITIES ====================
export const getBatchMortalities = async (
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
          include: {
            owner: true,
            managers: true,
          },
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

    // Get ALL mortalities for statistics calculation (including sales)
    const allMortalities = await prisma.mortality.findMany({
      where: { batchId },
    });

    // Get only natural deaths for display (excluding sales)
    const mortalities = await prisma.mortality.findMany({
      where: {
        batchId,
        NOT: {
          reason: "SLAUGHTERED_FOR_SALE", // Exclude sale-related mortality from display
        },
      },
      include: {
        sale: {
          select: {
            id: true,
            amount: true,
            quantity: true,
            weight: true,
            date: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Calculate statistics using ALL mortalities (including sales for accurate current birds)
    const totalAllMortality = allMortalities.reduce((sum, m) => sum + m.count, 0);
    const currentBirds = batch.initialChicks - totalAllMortality;

    // Calculate natural mortality stats (excluding sales)
    const totalNaturalMortality = mortalities.reduce((sum, m) => sum + m.count, 0);
    const mortalityRate = (totalNaturalMortality / batch.initialChicks) * 100;

    // Group by reason
    const reasonStats = mortalities.reduce((acc: any, m) => {
      const reason = m.reason || "UNKNOWN";
      if (!acc[reason]) {
        acc[reason] = { count: 0, totalBirds: 0 };
      }
      acc[reason].count += 1;
      acc[reason].totalBirds += m.count;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: mortalities,
      statistics: {
        totalRecords: mortalities.length,
        totalMortality: totalNaturalMortality, // Only natural deaths
        currentBirds, // Accurate count including sales
        mortalityRate: mortalityRate.toFixed(2),
        reasonBreakdown: reasonStats,
      },
    });
  } catch (error) {
    console.error("Get batch mortalities error:", error);
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
  }
};

// ==================== CREATE MORTALITY ====================
export const createMortality = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Validate request body
    console.log("Received mortality data:", req.body);

    // Handle date conversion if it's a string
    const requestData = {
      ...req.body,
      date: req.body.date ? new Date(req.body.date) : req.body.date
    };

    const { success, data, error } = CreateMortalitySchema.safeParse(requestData);
    if (!success) {
      console.log("Validation error:", error);
      return res.status(400).json({ message: error?.message });
    }

    const { date, count, reason, batchId } = data;

    // Validate batch access
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        farm: {
          include: {
            owner: true,
            managers: true,
          },
        },
        mortalities: true,
      },
    });

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        batch.farm.ownerId === currentUserId ||
        batch.farm.managers.some((manager) => manager.id === currentUserId);

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to batch" });
      }
    }

    // Validate count doesn't exceed available birds
    // Use ALL mortalities (including sales) to get accurate current bird count
    const totalMortality = batch.mortalities.reduce((sum, m) => sum + m.count, 0);
    const currentBirds = batch.initialChicks - totalMortality;

    if (count > currentBirds) {
      return res.status(400).json({
        message: `Cannot record ${count} deaths. Only ${currentBirds} birds available in batch (Initial: ${batch.initialChicks}, Total Mortality/Sales: ${totalMortality})`,
      });
    }

    // Create mortality record
    const mortality = await prisma.mortality.create({
      data: {
        date: new Date(date),
        count,
        reason: reason || null,
        batchId,
      },
      include: {
        batch: {
          select: {
            id: true,
            batchNumber: true,
            status: true,
            farm: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Check mortality thresholds and send notifications (only for natural deaths, not sales)
    if (reason !== 'SLAUGHTERED_FOR_SALE') {
      try {
        const { mortalityNotificationService } = await import('../services/mortalityNotificationService');
        const result = await mortalityNotificationService.checkBatchMortalityThresholds(batchId);

        if (result.thresholdExceeded !== 'none') {
          console.log(`Mortality threshold ${result.thresholdExceeded} exceeded for batch ${mortality.batch.batchNumber}: ${result.mortalityRate.toFixed(2)}%`);
        }
      } catch (notificationError) {
        console.error('Failed to check mortality thresholds:', notificationError);
        // Don't fail the mortality creation if notification fails
      }
    }

    return res.status(201).json({
      success: true,
      data: mortality,
      message: "Mortality record created successfully",
    });
  } catch (error) {
    console.error("Create mortality error:", error);
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
  }
};

// ==================== UPDATE MORTALITY ====================
export const updateMortality = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Handle date conversion if it's a string
    const requestData = {
      ...req.body,
      date: req.body.date ? new Date(req.body.date) : req.body.date
    };

    const { date, count, reason } = requestData;

    // Check if mortality exists and user has access
    const existingMortality = await prisma.mortality.findUnique({
      where: { id },
      include: {
        batch: {
          include: {
            farm: {
              include: {
                owner: true,
                managers: true,
              },
            },
            mortalities: true,
          },
        },
        sale: true,
      },
    });

    if (!existingMortality) {
      return res.status(404).json({ message: "Mortality record not found" });
    }

    // Check if it's linked to a sale (auto-generated mortality)
    if (existingMortality.saleId) {
      return res.status(400).json({
        message: "Cannot update mortality record linked to a sale. Please update or delete the sale instead.",
      });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        existingMortality.batch.farm.ownerId === currentUserId ||
        existingMortality.batch.farm.managers.some(
          (manager) => manager.id === currentUserId
        );

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Validate count if being updated
    if (count && count !== existingMortality.count) {
      // Use ALL mortalities (including sales) to get accurate current bird count
      const totalMortality = existingMortality.batch.mortalities
        .filter((m) => m.id !== id) // Exclude current record being updated
        .reduce((sum, m) => sum + m.count, 0);
      const currentBirds = existingMortality.batch.initialChicks - totalMortality;

      if (count > currentBirds) {
        return res.status(400).json({
          message: `Cannot update to ${count} deaths. Only ${currentBirds} birds available (including sales)`,
        });
      }
    }

    // Update mortality
    const updatedMortality = await prisma.mortality.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        count: count || undefined,
        reason: reason !== undefined ? reason : undefined,
      },
      include: {
        batch: {
          select: {
            id: true,
            batchNumber: true,
            status: true,
            farm: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return res.json({
      success: true,
      data: updatedMortality,
      message: "Mortality record updated successfully",
    });
  } catch (error) {
    console.error("Update mortality error:", error);
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
  }
};

// ==================== DELETE MORTALITY ====================
export const deleteMortality = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Check if mortality exists and user has access
    const existingMortality = await prisma.mortality.findUnique({
      where: { id },
      include: {
        batch: {
          include: {
            farm: {
              include: {
                owner: true,
                managers: true,
              },
            },
          },
        },
        sale: true,
      },
    });

    if (!existingMortality) {
      return res.status(404).json({ message: "Mortality record not found" });
    }

    // Check if it's linked to a sale (auto-generated mortality)
    if (existingMortality.saleId) {
      return res.status(400).json({
        message: "Cannot delete mortality record linked to a sale. Please delete the sale instead.",
      });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        existingMortality.batch.farm.ownerId === currentUserId ||
        existingMortality.batch.farm.managers.some(
          (manager) => manager.id === currentUserId
        );

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Delete mortality
    await prisma.mortality.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Mortality record deleted successfully",
    });
  } catch (error) {
    console.error("Delete mortality error:", error);
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
  }
};

// ==================== GET MORTALITY STATISTICS ====================
export const getMortalityStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { batchId, farmId, startDate, endDate } = req.query;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Build where clause
    const where: any = {};

    // Role-based filtering
    if (currentUserRole === UserRole.MANAGER) {
      const userFarms = await prisma.farm.findMany({
        where: {
          OR: [
            { ownerId: currentUserId },
            { managers: { some: { id: currentUserId } } },
          ],
        },
        select: { id: true },
      });
      const farmIds = userFarms.map((farm) => farm.id);

      const userBatches = await prisma.batch.findMany({
        where: { farmId: { in: farmIds } },
        select: { id: true },
      });
      where.batchId = { in: userBatches.map((batch) => batch.id) };
    }

    if (batchId) {
      where.batchId = batchId as string;
    }

    if (farmId) {
      const farmBatches = await prisma.batch.findMany({
        where: { farmId: farmId as string },
        select: { id: true },
      });
      where.batchId = { in: farmBatches.map((batch) => batch.id) };
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    // Exclude sale-related mortality
    where.NOT = {
      reason: "SLAUGHTERED_FOR_SALE",
    };

    const [totalRecords, totalDeaths, mortalityByReason] = await Promise.all([
      prisma.mortality.count({ where }),
      prisma.mortality.aggregate({
        where,
        _sum: { count: true },
      }),
      prisma.mortality.groupBy({
        by: ["reason"],
        where,
        _sum: { count: true },
        _count: { reason: true },
      }),
    ]);

    // Format reason breakdown
    const reasonBreakdown = mortalityByReason.map((item) => ({
      reason: item.reason || "UNKNOWN",
      records: item._count.reason,
      totalDeaths: item._sum.count || 0,
    }));

    return res.json({
      success: true,
      data: {
        totalRecords,
        totalDeaths: totalDeaths._sum.count || 0,
        reasonBreakdown,
      },
    });
  } catch (error) {
    console.error("Get mortality statistics error:", error);
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
  }
};

