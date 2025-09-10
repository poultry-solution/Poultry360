import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, BatchStatus } from "@prisma/client";
import {
  CreateBatchSchema,
  UpdateBatchSchema,
  BatchSchema,
} from "@myapp/shared-types";

// ==================== GET ALL BATCHES ====================
export const getAllBatches = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10, farmId, status, search } = req.query;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};

    // Role-based filtering
    if (currentUserRole === UserRole.MANAGER || currentUserRole === UserRole.OWNER) {
      // Managers can only see batches from farms they manage or own
      where.farm = {
        OR: [
          { ownerId: currentUserId },
          { managers: { some: { id: currentUserId } } },
        ],
      };
    }

    if (farmId) {
      where.farmId = farmId as string;
    }

    if (status) {
      where.status = status as BatchStatus;
    }

    if (search) {
      where.batchNumber = { contains: search as string, mode: "insensitive" };
    }

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          farm: {
            select: {
              id: true,
              name: true,
              capacity: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              expenses: true,
              sales: true,
              mortalities: true,
              vaccinations: true,
              feedConsumptions: true,
              birdWeights: true,
            },
          },
        },
        orderBy: { startDate: "desc" },
      }),
      prisma.batch.count({ where }),
    ]);

    // Calculate current chicks for each batch
    const batchesWithCurrentChicks = await Promise.all(
      batches.map(async (batch) => {
        const totalMortality = await prisma.mortality.aggregate({
          where: { batchId: batch.id },
          _sum: { count: true },
        });

        const currentChicks =
          batch.initialChicks - Number(totalMortality._sum.count || 0);

        return {
          ...batch,
          currentChicks: Math.max(0, currentChicks),
        };
      })
    );

    return res.json({
      success: true,
      data: batchesWithCurrentChicks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all batches error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET BATCH BY ID ====================
export const getBatchById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
            capacity: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            managers: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        expenses: {
          select: {
            id: true,
            date: true,
            amount: true,
            description: true,
            quantity: true,
            unitPrice: true,
            category: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: { date: "desc" },
        },
        sales: {
          select: {
            id: true,
            date: true,
            amount: true,
            quantity: true,
            unitPrice: true,
            description: true,
            isCredit: true,
            paidAmount: true,
            dueAmount: true,
            category: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: { date: "desc" },
        },
        mortalities: {
          select: {
            id: true,
            date: true,
            count: true,
            reason: true,
            createdAt: true,
          },
          orderBy: { date: "desc" },
        },
        vaccinations: {
          select: {
            id: true,
            vaccineName: true,
            scheduledDate: true,
            completedDate: true,
            status: true,
            notes: true,
            createdAt: true,
          },
          orderBy: { scheduledDate: "asc" },
        },
        feedConsumptions: {
          select: {
            id: true,
            date: true,
            quantity: true,
            feedType: true,
            createdAt: true,
          },
          orderBy: { date: "desc" },
        },
        birdWeights: {
          select: {
            id: true,
            date: true,
            avgWeight: true,
            sampleCount: true,
            createdAt: true,
          },
          orderBy: { date: "desc" },
        },
        _count: {
          select: {
            expenses: true,
            sales: true,
            mortalities: true,
            vaccinations: true,
            feedConsumptions: true,
            birdWeights: true,
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
        batch.farm.owner.id === currentUserId ||
        batch.farm.managers.some((manager) => manager.id === currentUserId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Calculate current chicks
    const totalMortality = await prisma.mortality.aggregate({
      where: { batchId: batch.id },
      _sum: { count: true },
    });

    const currentChicks =
      batch.initialChicks - Number(totalMortality._sum.count || 0);

    return res.json({
      success: true,
      data: {
        ...batch,
        currentChicks: Math.max(0, currentChicks),
      },
    });
  } catch (error) {
    console.error("Get batch by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET FARM BATCHES ====================
export const getFarmBatches = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { farmId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const skip = (Number(page) - 1) * Number(limit);

    // Check if user has access to this farm
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: { managers: true },
    });

    if (!farm) {
      return res.status(404).json({ message: "Farm not found" });
    }

    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        farm.ownerId === currentUserId ||
        farm.managers.some((manager) => manager.id === currentUserId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const where: any = { farmId };

    if (status) {
      where.status = status as BatchStatus;
    }

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          _count: {
            select: {
              expenses: true,
              sales: true,
              mortalities: true,
              vaccinations: true,
              feedConsumptions: true,
              birdWeights: true,
            },
          },
        },
        orderBy: { startDate: "desc" },
      }),
      prisma.batch.count({ where }),
    ]);

    // Calculate current chicks for each batch
    const batchesWithCurrentChicks = await Promise.all(
      batches.map(async (batch) => {
        const totalMortality = await prisma.mortality.aggregate({
          where: { batchId: batch.id },
          _sum: { count: true },
        });

        const currentChicks =
          batch.initialChicks - Number(totalMortality._sum.count || 0);

        return {
          ...batch,
          currentChicks: Math.max(0, currentChicks),
        };
      })
    );

    return res.json({
      success: true,
      data: batchesWithCurrentChicks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get farm batches error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE BATCH ====================
export const createBatch = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Validate request body
    const { success, data, error } = CreateBatchSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if farm exists and user has access
    const farm = await prisma.farm.findUnique({
      where: { id: data.farmId },
      include: { managers: true },
    });

    if (!farm) {
      return res.status(404).json({ message: "Farm not found" });
    }

    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        farm.ownerId === currentUserId ||
        farm.managers.some((manager) => manager.id === currentUserId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Check if batch number already exists for this farm
    const existingBatch = await prisma.batch.findUnique({
      where: {
        farmId_batchNumber: {
          farmId: data.farmId,
          batchNumber: data.batchNumber,
        },
      },
    });

    if (existingBatch) {
      return res.status(400).json({
        message: "Batch number already exists for this farm",
      });
    }

    // Create batch
    const batch = await prisma.batch.create({
      data: {
        batchNumber: data.batchNumber,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status || BatchStatus.ACTIVE,
        initialChicks: data.initialChicks,
        initialChickWeight: data.initialChickWeight || 0.045,
        farmId: data.farmId,
      },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: batch,
      message: "Batch created successfully",
    });
  } catch (error) {
    console.error("Create batch error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE BATCH ====================
export const updateBatch = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Validate request body
    const { success, data, error } = UpdateBatchSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if batch exists
    const existingBatch = await prisma.batch.findUnique({
      where: { id },
      include: {
        farm: {
          include: { managers: true },
        },
      },
    });

    if (!existingBatch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        existingBatch.farm.ownerId === currentUserId ||
        existingBatch.farm.managers.some(
          (manager) => manager.id === currentUserId
        );
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Check if batch number already exists for this farm (if being updated)
    if (data.batchNumber && data.batchNumber !== existingBatch.batchNumber) {
      const existingBatchNumber = await prisma.batch.findUnique({
        where: {
          farmId_batchNumber: {
            farmId: existingBatch.farmId,
            batchNumber: data.batchNumber,
          },
        },
      });

      if (existingBatchNumber) {
        return res.status(400).json({
          message: "Batch number already exists for this farm",
        });
      }
    }

    // Update batch
    const updateData: any = { ...data };

    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }

    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    }

    const updatedBatch = await prisma.batch.update({
      where: { id },
      data: updateData,
      include: {
        farm: {
          select: {
            id: true,
            name: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return res.json({
      success: true,
      data: updatedBatch,
      message: "Batch updated successfully",
    });
  } catch (error) {
    console.error("Update batch error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE BATCH ====================
export const deleteBatch = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Check if batch exists
    const existingBatch = await prisma.batch.findUnique({
      where: { id },
      include: {
        farm: {
          include: { managers: true },
        },
        _count: {
          select: {
            expenses: true,
            sales: true,
            mortalities: true,
            vaccinations: true,
            feedConsumptions: true,
            birdWeights: true,
          },
        },
      },
    });

    if (!existingBatch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        existingBatch.farm.ownerId === currentUserId ||
        existingBatch.farm.managers.some(
          (manager) => manager.id === currentUserId
        );
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Check if batch has any data
    const hasData =
      existingBatch._count.expenses > 0 ||
      existingBatch._count.sales > 0 ||
      existingBatch._count.mortalities > 0 ||
      existingBatch._count.vaccinations > 0 ||
      existingBatch._count.feedConsumptions > 0 ||
      existingBatch._count.birdWeights > 0;

    if (hasData) {
      return res.status(400).json({
        message:
          "Cannot delete batch with existing data. Please remove all related data first.",
      });
    }

    // Delete batch
    await prisma.batch.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (error) {
    console.error("Delete batch error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE BATCH STATUS ====================
export const updateBatchStatus = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Validate status
    if (!Object.values(BatchStatus).includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Check if batch exists
    const existingBatch = await prisma.batch.findUnique({
      where: { id },
      include: {
        farm: {
          include: { managers: true },
        },
      },
    });

    if (!existingBatch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        existingBatch.farm.ownerId === currentUserId ||
        existingBatch.farm.managers.some(
          (manager) => manager.id === currentUserId
        );
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Update batch status
    const updatedBatch = await prisma.batch.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        batchNumber: true,
        status: true,
        startDate: true,
        endDate: true,
        updatedAt: true,
      },
    });

    return res.json({
      success: true,
      data: updatedBatch,
      message: "Batch status updated successfully",
    });
  } catch (error) {
    console.error("Update batch status error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET BATCH ANALYTICS ====================
export const getBatchAnalytics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Check if batch exists and user has access
    const batch = await prisma.batch.findUnique({
      where: { id },
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

    // Get analytics data
    const [
      totalMortality,
      totalExpenses,
      totalSales,
      totalFeedConsumption,
      latestWeight,
      vaccinationStats,
    ] = await Promise.all([
      prisma.mortality.aggregate({
        where: { batchId: id },
        _sum: { count: true },
      }),
      prisma.expense.aggregate({
        where: { batchId: id },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: { batchId: id },
        _sum: { amount: true },
      }),
      prisma.feedConsumption.aggregate({
        where: { batchId: id },
        _sum: { quantity: true },
      }),
      prisma.birdWeight.findFirst({
        where: { batchId: id },
        orderBy: { date: "desc" },
        select: {
          avgWeight: true,
          sampleCount: true,
          date: true,
        },
      }),
      prisma.vaccination.groupBy({
        by: ["status"],
        where: { batchId: id },
        _count: { status: true },
      }),
    ]);

    const currentChicks =
      batch.initialChicks - Number(totalMortality._sum.count || 0);
    const mortalityRate =
      batch.initialChicks > 0
        ? (Number(totalMortality._sum.count || 0) / batch.initialChicks) * 100
        : 0;

    const totalExpensesAmount = Number(totalExpenses._sum.amount || 0);
    const totalSalesAmount = Number(totalSales._sum.amount || 0);
    const profit = totalSalesAmount - totalExpensesAmount;
    const profitMargin =
      totalSalesAmount > 0 ? (profit / totalSalesAmount) * 100 : 0;

    const totalFeedConsumptionAmount = Number(
      totalFeedConsumption._sum.quantity || 0
    );

    // Calculate FCR (Feed Conversion Ratio)
    const currentWeight = latestWeight
      ? Number(latestWeight.avgWeight) * currentChicks
      : 0;
    const fcr =
      currentWeight > 0 ? totalFeedConsumptionAmount / currentWeight : null;

    // Calculate days active
    const daysActive = Math.ceil(
      (new Date().getTime() - batch.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return res.json({
      success: true,
      data: {
        batchId: id,
        batchNumber: batch.batchNumber,
        currentChicks: Math.max(0, currentChicks),
        initialChicks: batch.initialChicks,
        totalMortality: Number(totalMortality._sum.count || 0),
        mortalityRate,
        totalExpenses: totalExpensesAmount,
        totalSales: totalSalesAmount,
        profit,
        profitMargin,
        totalFeedConsumption: totalFeedConsumptionAmount,
        currentAvgWeight: latestWeight ? Number(latestWeight.avgWeight) : null,
        fcr,
        daysActive,
        vaccinationStats: vaccinationStats.reduce(
          (acc, stat) => {
            acc[stat.status] = stat._count.status;
            return acc;
          },
          {} as Record<string, number>
        ),
        status: batch.status,
        startDate: batch.startDate,
        endDate: batch.endDate,
      },
    });
  } catch (error) {
    console.error("Get batch analytics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
