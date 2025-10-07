import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, BatchStatus } from "@prisma/client";
import {
  CreateBatchSchema,
  UpdateBatchSchema,
  BatchSchema,
  CloseBatchSchema,
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
    if (
      currentUserRole === UserRole.MANAGER ||
      currentUserRole === UserRole.OWNER
    ) {
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
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
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
              },
            },
            managers: {
              select: {
                id: true,
                name: true,
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
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
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
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
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

    // Create batch and deduct chicks from inventory in a transaction (supports multiple allocations)
    const result = await prisma.$transaction(async (tx) => {
      const { chicksInventory } = data as any;

      if (!Array.isArray(chicksInventory) || chicksInventory.length === 0) {
        throw new Error(
          "chicksInventory array with at least one allocation is required"
        );
      }

      // Validate each allocation, ensure sufficient stock per item, and compute pricing
      const allocations = await Promise.all(
        chicksInventory.map(async (alloc: any) => {
          const item = await tx.inventoryItem.findUnique({
            where: { id: alloc.itemId },
          });
          if (!item) {
            throw new Error(`Chicks inventory item not found: ${alloc.itemId}`);
          }
          const available = Number(item.currentStock);
          const requested = Number(alloc.quantity);
          if (available < requested) {
            throw new Error(
              `Insufficient chicks stock for item ${alloc.itemId}. Available: ${available}, Required: ${requested}`
            );
          }
          const latestPurchase = await tx.inventoryTransaction.findFirst({
            where: { itemId: alloc.itemId, type: "PURCHASE" },
            orderBy: { date: "desc" },
          });
          const unitPrice = latestPurchase
            ? Number(latestPurchase.unitPrice)
            : 0;
          const totalAmount = unitPrice * requested;
          return {
            itemId: alloc.itemId,
            requested,
            unitPrice,
            totalAmount,
            notes: alloc.notes,
            item,
          };
        })
      );

      const totalChicks = allocations.reduce((sum, a) => sum + a.requested, 0);

      // 1) Create batch using total requested chicks
      const batch = await tx.batch.create({
        data: {
          batchNumber: data.batchNumber,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          status: data.status || BatchStatus.ACTIVE,
          initialChicks: totalChicks,
          currentWeight: null, // Will be set when first weight is recorded
          farmId: data.farmId,
        },
        include: {
          farm: {
            select: {
              id: true,
              name: true,
              owner: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      // 2) For each allocation: record usage, decrement stock, and create transaction
      const usages = [] as any[];
      for (const alloc of allocations) {
        const usage = await tx.inventoryUsage.create({
          data: {
            date: new Date(),
            quantity: alloc.requested,
            unitPrice: alloc.unitPrice,
            totalAmount: alloc.totalAmount,
            notes: alloc.notes || `Allocated to batch ${batch.batchNumber}`,
            itemId: alloc.itemId,
            farmId: data.farmId,
            batchId: batch.id,
          },
        });

        const expense = await tx.expense.create({
          data: {
            date: new Date(),
            amount: alloc.totalAmount,
            description: `Purchase of ${alloc.item.name} for batch creation ${batch.batchNumber}`,
            quantity: alloc.requested,
            unitPrice: alloc.unitPrice,
            farmId: data.farmId, // No specific farm - this is general inventory
            batchId: batch.id, // No specific batch - this is general inventory
            categoryId: alloc.item.categoryId,
          },
        });

        await tx.inventoryItem.update({
          where: { id: alloc.itemId },
          data: { currentStock: { decrement: alloc.requested } },
        });

        await tx.inventoryTransaction.create({
          data: {
            type: "USAGE",
            quantity: alloc.requested,
            unitPrice: alloc.unitPrice,
            totalAmount: alloc.totalAmount,
            date: new Date(),
            description: `Chicks allocated to batch ${batch.batchNumber}`,
            itemId: alloc.itemId,
          },
        });

        usages.push(usage);
      }

      return { batch, usages };
    });

    return res.status(201).json({
      success: true,
      data: {
        ...result.batch,
        inventoryUsages: result.usages,
      },
      message: "Batch created successfully",
    });
  } catch (error) {
    console.error("Create batch error:", error);
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
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
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
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

    // Identify initial, system-generated records to allow safe rollback
    const initialUsageNotes = `Allocated to batch ${existingBatch.batchNumber}`;
    const initialUsageDescContains = `batch ${existingBatch.batchNumber}`;
    const initialExpenseDescContains = `batch creation ${existingBatch.batchNumber}`;

    // Fetch all expenses linked to batch
    const expenses = await prisma.expense.findMany({
      where: { batchId: id },
      select: { id: true, description: true },
    });
    const initialExpenseIds = expenses
      .filter((e) => (e.description || "").includes(initialExpenseDescContains))
      .map((e) => e.id);
    const nonInitialExpenseExists = expenses.length > initialExpenseIds.length;

    // Count usages for batch and fetch initial usages
    const [usageCount, initialUsages] = await Promise.all([
      prisma.inventoryUsage.count({ where: { batchId: id } }),
      prisma.inventoryUsage.findMany({
        where: {
          batchId: id,
          OR: [
            { notes: { contains: initialUsageNotes } },
            // Fallback: usages created without the exact note, but still tied to batch
            { notes: { equals: null } },
          ],
        },
        select: { id: true, itemId: true, quantity: true },
      }),
    ]);

    const onlyInitialUsagesPresent = initialUsages.length === usageCount;

    // Block deletion if there is any non-initial data present
    if (
      existingBatch._count.sales > 0 ||
      existingBatch._count.mortalities > 0 ||
      existingBatch._count.vaccinations > 0 ||
      existingBatch._count.feedConsumptions > 0 ||
      existingBatch._count.birdWeights > 0 ||
      nonInitialExpenseExists ||
      (!onlyInitialUsagesPresent && usageCount > 0)
    ) {
      return res.status(400).json({
        message:
          "Cannot delete batch: non-initial records exist. Remove related data first.",
      });
    }

    // Rollback initial allocations and delete batch atomically
    await prisma.$transaction(async (tx) => {
      // 1) Restore inventory for initial usages
      for (const usage of initialUsages) {
        await tx.inventoryItem.update({
          where: { id: usage.itemId },
          data: { currentStock: { increment: Number(usage.quantity || 0) } },
        });
      }

      if (initialUsages.length > 0) {
        await tx.inventoryUsage.deleteMany({
          where: { id: { in: initialUsages.map((u) => u.id) } },
        });
      }

      // 2) Remove related inventory transactions created for initial allocation
      await tx.inventoryTransaction.deleteMany({
        where: {
          type: "USAGE",
          description: { contains: initialUsageDescContains },
        },
      });

      // 3) Remove initial expenses created during batch creation
      if (initialExpenseIds.length > 0) {
        await tx.expense.deleteMany({
          where: { id: { in: initialExpenseIds } },
        });
      }

      // 4) Finally, delete the batch
      await tx.batch.delete({ where: { id } });
    });

    return res.json({ success: true, message: "Batch deleted successfully" });
  } catch (error) {
    console.error("Delete batch error:", error);
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
  }
};

// ==================== CLOSE BATCH ====================
export const closeBatch = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Validate request body
    const { success, data, error } = CloseBatchSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    const { endDate, finalNotes } = data;

    // Check if batch exists and get current data
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

    // Validate that batch is currently active
    if (existingBatch.status === BatchStatus.COMPLETED) {
      return res.status(400).json({ message: "Batch is already closed" });
    }

    // Validate end date
    const batchEndDate = endDate ? new Date(endDate) : new Date();
    if (batchEndDate < existingBatch.startDate) {
      return res.status(400).json({
        message: "End date cannot be before start date",
      });
    }

    // Calculate current statistics for the batch
    const [
      totalNonSaleMortality,
      totalSaleMortality,
      totalSales,
      totalExpenses,
      totalSalesQuantity,
      totalSalesWeight,
    ] = await Promise.all([
      // Non-sale mortality (natural deaths, diseases, etc.)
      prisma.mortality.aggregate({
        where: {
          batchId: id,
          reason: {
            not: {
              equals: "SLAUGHTERED_FOR_SALE",
            },
          },
        },
        _sum: { count: true },
      }),
      // Sale mortality (birds sold/slaughtered)
      prisma.mortality.aggregate({
        where: {
          batchId: id,
          reason: "SLAUGHTERED_FOR_SALE",
        },
        _sum: { count: true },
      }),
      prisma.sale.aggregate({
        where: { batchId: id },
        _sum: { amount: true, quantity: true, weight: true },
      }),
      prisma.expense.aggregate({
        where: { batchId: id },
        _sum: { amount: true },
      }),
      prisma.sale.count({
        where: { batchId: id },
      }),
      prisma.sale.aggregate({
        where: { batchId: id },
        _sum: { weight: true },
      }),
    ]);

    const totalDeadChicks = Number(totalNonSaleMortality._sum.count || 0);
    const totalSoldChicks = Number(totalSaleMortality._sum.count || 0);
    const remainingChicks = Math.max(
      0,
      existingBatch.initialChicks - totalDeadChicks - totalSoldChicks
    );

    // Perform batch closure in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // If there are remaining chicks, record them as mortality (batch closure)
      if (remainingChicks > 0) {
        await tx.mortality.create({
          data: {
            date: batchEndDate,
            count: remainingChicks,
            reason: "BATCH_CLOSURE",
            batchId: id,
          },
        });
      }

      // Update batch status and end date
      const closedBatch = await tx.batch.update({
        where: { id },
        data: {
          status: BatchStatus.COMPLETED,
          endDate: batchEndDate,
          notes: finalNotes
            ? existingBatch.notes
              ? `${existingBatch.notes}\n\nClosure Notes: ${finalNotes}`
              : `Closure Notes: ${finalNotes}`
            : existingBatch.notes,
        },
        include: {
          farm: {
            select: {
              id: true,
              name: true,
              owner: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      // Create a notification for batch closure
      await tx.notification.create({
        data: {
          type: "BATCH_COMPLETION",
          title: `Batch ${existingBatch.batchNumber} Closed`,
          message: `Batch ${existingBatch.batchNumber} has been successfully closed. Initial: ${existingBatch.initialChicks}, Sold: ${totalSoldChicks}, Natural Deaths: ${totalDeadChicks}, Remaining at Closure: ${remainingChicks}, Total Sales: ₹${Number(totalSales._sum.amount || 0).toLocaleString()}`,
          userId: currentUserId as string,
          farmId: existingBatch.farmId,
          batchId: id,
        },
      });

      // Calculate final summary after accounting for remaining chicks
      const finalNaturalMortality = totalDeadChicks + remainingChicks;
      
      return {
        batch: closedBatch,
        summary: {
          initialChicks: existingBatch.initialChicks,
          finalChicks: 0, // All chicks are now accounted for (sold or dead)
          soldChicks: totalSoldChicks,
          naturalMortality: totalDeadChicks,
          remainingAtClosure: remainingChicks,
          totalMortality: finalNaturalMortality,
          totalSales: Number(totalSales._sum.amount || 0),
          totalExpenses: Number(totalExpenses._sum.amount || 0),
          profit:
            Number(totalSales._sum.amount || 0) -
            Number(totalExpenses._sum.amount || 0),
          totalSalesQuantity: Number(totalSales._sum.quantity || 0),
          totalSalesWeight: Number(totalSales._sum.weight || 0),
          daysActive: Math.ceil(
            (batchEndDate.getTime() - existingBatch.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          ),
        },
      };
    });

    return res.json({
      success: true,
      data: result.batch,
      summary: result.summary,
      message: "Batch closed successfully",
    });
  } catch (error) {
    console.error("Close batch error:", error);
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
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

    // If trying to close batch via status update, recommend using closeBatch endpoint
    if (
      status === BatchStatus.COMPLETED &&
      existingBatch.status === BatchStatus.ACTIVE
    ) {
      return res.status(400).json({
        message:
          "To close a batch, please use the /close endpoint for proper batch closure process",
      });
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
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
  }
};

// ==================== GET BATCH CLOSURE SUMMARY ====================
export const getBatchClosureSummary = async (
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

    // Only provide closure summary for completed batches
    if (batch.status !== BatchStatus.COMPLETED) {
      return res.status(400).json({ 
        message: "Batch closure summary is only available for completed batches" 
      });
    }

    // Get comprehensive closure data
    const [
      totalNonSaleMortality,
      totalSaleMortality,
      closureMortality,
      totalSales,
      totalExpenses,
      expensesByCategory,
    ] = await Promise.all([
      // Natural deaths (excluding sales and closure)
      prisma.mortality.aggregate({
        where: {
          batchId: id,
          reason: {
            notIn: ["SLAUGHTERED_FOR_SALE", "BATCH_CLOSURE"],
          },
        },
        _sum: { count: true },
      }),
      // Birds sold
      prisma.mortality.aggregate({
        where: {
          batchId: id,
          reason: "SLAUGHTERED_FOR_SALE",
        },
        _sum: { count: true },
      }),
      // Birds remaining at closure
      prisma.mortality.aggregate({
        where: {
          batchId: id,
          reason: "BATCH_CLOSURE",
        },
        _sum: { count: true },
      }),
      // Sales data
      prisma.sale.aggregate({
        where: { batchId: id },
        _sum: { amount: true, quantity: true, weight: true },
        _count: true,
      }),
      // Expenses data
      prisma.expense.aggregate({
        where: { batchId: id },
        _sum: { amount: true },
        _count: true,
      }),
      // Expenses by category
      prisma.expense.groupBy({
        by: ["categoryId"],
        where: { batchId: id },
        _sum: { amount: true },
        _count: { categoryId: true },
      }),
    ]);

    // Calculate final statistics
    const naturalDeaths = Number(totalNonSaleMortality._sum.count || 0);
    const birdsSold = Number(totalSaleMortality._sum.count || 0);
    const remainingAtClosure = Number(closureMortality._sum.count || 0);
    const totalMortality = naturalDeaths + remainingAtClosure;
    
    const revenue = Number(totalSales._sum.amount || 0);
    const expenses = Number(totalExpenses._sum.amount || 0);
    const profit = revenue - expenses;
    
    const daysActive = batch.endDate && batch.startDate 
      ? Math.ceil((batch.endDate.getTime() - batch.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate efficiency metrics
    const mortalityRate = batch.initialChicks > 0 
      ? (naturalDeaths / batch.initialChicks) * 100 
      : 0;
    
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const roi = expenses > 0 ? (profit / expenses) * 100 : 0;
    
    const revenuePerBird = batch.initialChicks > 0 ? revenue / batch.initialChicks : 0;
    const costPerBird = batch.initialChicks > 0 ? expenses / batch.initialChicks : 0;
    const profitPerBird = batch.initialChicks > 0 ? profit / batch.initialChicks : 0;

    return res.json({
      success: true,
      data: {
        batchId: id,
        batchNumber: batch.batchNumber,
        status: batch.status,
        
        // Timeline
        startDate: batch.startDate,
        endDate: batch.endDate,
        daysActive,
        
        // Bird tracking
        initialChicks: batch.initialChicks,
        birdsSold,
        naturalDeaths,
        remainingAtClosure,
        totalMortality,
        mortalityRate,
        
        // Financial summary
        totalRevenue: revenue,
        totalExpenses: expenses,
        netProfit: profit,
        profitMargin,
        roi,
        
        // Per-bird metrics
        revenuePerBird,
        costPerBird,
        profitPerBird,
        
        // Sales details
        totalSalesCount: totalSales._count,
        totalSalesQuantity: Number(totalSales._sum.quantity || 0),
        totalSalesWeight: Number(totalSales._sum.weight || 0),
        
        // Expense breakdown
        totalExpenseCount: totalExpenses._count,
        expensesByCategory: await Promise.all(
          expensesByCategory.map(async (cat: any) => {
            const category = await prisma.category.findUnique({
              where: { id: cat.categoryId },
              select: { name: true, type: true },
            });
            return {
              categoryId: cat.categoryId,
              categoryName: category?.name || "Unknown",
              amount: Number(cat._sum.amount || 0),
              count: cat._count.categoryId,
            };
          })
        ),
        
        // Closure notes
        closureNotes: batch.notes,
      },
    });
  } catch (error) {
    console.error("Get batch closure summary error:", error);
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
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

    const mortaility = await prisma.mortality.findMany({
      where: {
        batchId: id,
      },
    });

    console.log(mortaility);

    // Get analytics data
    const [
      saleMortality,
      normalMortality,
      totalExpenses,
      totalSales,
      totalFeedConsumption,
      latestWeight,
      vaccinationStats,
    ] = await Promise.all([
      prisma.mortality.aggregate({
        where: {
          batchId: id,
          reason: {
            equals: "SLAUGHTERED_FOR_SALE",
          },
        },
        _sum: { count: true },
      }),
      prisma.mortality.aggregate({
        where: {
          batchId: id,
          reason: {
            not: {
              equals: "SLAUGHTERED_FOR_SALE",
            },
          },
        },
        _sum: { count: true },
      }),
      prisma.expense.aggregate({
        where: { batchId: id },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: { batchId: id },
        _sum: { amount: true, quantity: true, weight: true },
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

    console.log(saleMortality);
    console.log(normalMortality);
    console.log(totalExpenses);
    console.log(totalSales);
    console.log(totalFeedConsumption);
    console.log(latestWeight);
    console.log(vaccinationStats);

    const currentChicks =
      batch.initialChicks -
      (Number(saleMortality._sum.count || 0) +
        Number(normalMortality._sum.count || 0));

    // donot include sale mortality here
    const mortalityRate =
      batch.initialChicks > 0
        ? (Number(normalMortality._sum.count || 0) / batch.initialChicks) * 100
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

    // also include total sales quantity
    const totalSalesQuantity = Number(totalSales._sum.quantity || 0);

    return res.json({
      success: true,
      data: {
        batchId: id,
        batchNumber: batch.batchNumber,
        currentChicks: Math.max(0, currentChicks),
        initialChicks: batch.initialChicks,
        totalMortality: Number(normalMortality._sum.count || 0),
        mortalityRate,
        totalExpenses: totalExpensesAmount,
        totalSales: totalSalesAmount,
        totalSalesQuantity,
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
    const message = (error as any)?.message || "Internal server error";
    return res.status(500).json({ message });
  }
};
