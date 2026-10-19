import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole } from "@prisma/client";
import { CreateMortalitySchema } from "@myapp/shared-types";
import { refreshFarmerFcrHistorySafely } from "../services/farmerFcrService";
import { batchScopedBy } from "../services/ownershipService";

// ==================== GET MORTALITY BY ID ====================
export const getMortalityById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    let mortalityOwnershipWhere: any = {};
    if (currentUserRole !== UserRole.SUPER_ADMIN) {
      mortalityOwnershipWhere = { batch: { farm: { ownerId: currentUserId } } };
    }
    const mortality = await prisma.mortality.findFirst({
      where: { id, ...mortalityOwnershipWhere },
      include: {
        batch: {
          include: {
            farm: {
              include: {
                owner: true,
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

    let batchOwnershipWhere: any = {};
    if (currentUserRole !== UserRole.SUPER_ADMIN) {
      batchOwnershipWhere = { farm: { ownerId: currentUserId } };
    }
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, ...batchOwnershipWhere },
      include: {
        farm: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
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

    // Scoped find — non-owner gets null -> 404.
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, ...batchScopedBy(currentUserId!, currentUserRole) },
      include: {
        farm: {
          include: {
            owner: true,
          },
        },
        mortalities: true,
      },
    });

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
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

    await refreshFarmerFcrHistorySafely(batchId);

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

    let mortalityOwnershipWhere: any = {};
    if (currentUserRole !== UserRole.SUPER_ADMIN) {
      mortalityOwnershipWhere = { batch: { farm: { ownerId: currentUserId } } };
    }
    const existingMortality = await prisma.mortality.findFirst({
      where: { id, ...mortalityOwnershipWhere },
      include: {
        batch: {
          include: {
            farm: {
              include: {
                owner: true,
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

    await refreshFarmerFcrHistorySafely(existingMortality.batchId);

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

    let mortalityOwnershipWhere: any = {};
    if (currentUserRole !== UserRole.SUPER_ADMIN) {
      mortalityOwnershipWhere = { batch: { farm: { ownerId: currentUserId } } };
    }
    const existingMortality = await prisma.mortality.findFirst({
      where: { id, ...mortalityOwnershipWhere },
      include: {
        batch: {
          include: {
            farm: {
              include: {
                owner: true,
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

    // Delete mortality
    await prisma.mortality.delete({
      where: { id },
    });

    await refreshFarmerFcrHistorySafely(existingMortality.batchId);

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

