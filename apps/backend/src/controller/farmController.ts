import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole } from "@prisma/client";
import {
  CreateFarmSchema,
  UpdateFarmSchema,
  FarmSchema,
} from "@myapp/shared-types";

// ==================== GET ALL FARMS ====================
export const getAllFarms = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10, search, ownerId, managerId } = req.query;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};

    // Role-based filtering
    if (currentUserRole === UserRole.MANAGER) {
      // Managers can only see farms they manage or own
      where.OR = [
        { ownerId: currentUserId },
        { managers: { some: { id: currentUserId } } },
      ];
    } else if (currentUserRole === UserRole.OWNER) {
      // Owners can see all farms, but can filter by specific owner
      if (ownerId) {
        where.ownerId = ownerId as string;
      }
    }

    if (managerId) {
      where.managers = { some: { id: managerId as string } };
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { location: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [farms, total] = await Promise.all([
      prisma.farm.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
            },
          },
          managers: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
            },
          },
          _count: {
            select: {
              batches: true,
              expenses: true,
              sales: true,
              inventoryUsages: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.farm.count({ where }),
    ]);

    const batches = await prisma.batch.groupBy({
      where: {
        farmId: { in: farms.map((farm) => farm.id) },
      },
      by: ["farmId", "status"],
      _count: {
        status: true,
      },
    });
    
    const farmsWithBatches = farms.map((farm) => {
      const activeBatches = batches
        .filter((b) => b.farmId === farm.id && b.status === "ACTIVE")
        .reduce((acc, b) => acc + b._count.status, 0);
    
      const closedBatches = batches
        .filter((b) => b.farmId === farm.id && b.status === "COMPLETED")
        .reduce((acc, b) => acc + b._count.status, 0);
    
      return {
        ...farm,
        _count: {
          ...farm._count,
          activeBatches,
          closedBatches,
        },
      };
    });

    console.log(farmsWithBatches);
    


    return res.json({
      success: true,
      data: farmsWithBatches,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all farms error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET FARM BY ID ====================
export const getFarmById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const farm = await prisma.farm.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
        managers: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
        batches: {
          select: {
            id: true,
            batchNumber: true,
            startDate: true,
            endDate: true,
            status: true,
            currentWeight: true,
            createdAt: true,
          },
          orderBy: { startDate: "desc" },
        },
        expenses: {
          select: {
            id: true,
            date: true,
            amount: true,
            description: true,
            category: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: { date: "desc" },
          take: 10, // Recent expenses
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
          take: 10, // Recent sales
        },
        _count: {
          select: {
            batches: true,
            expenses: true,
            sales: true,
            inventoryUsages: true,
          },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({ message: "Farm not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        farm.ownerId === currentUserId ||
        (farm.managers || []).some((manager: any) => manager.id === currentUserId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    return res.json({
      success: true,
      data: farm,
    });
  } catch (error) {
    console.error("Get farm by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET USER'S FARMS ====================
export const getUserFarms = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const { type = "all" } = req.query; // "owned", "managed", "all"

    const where: any = {};

    if (type === "owned") {
      where.ownerId = currentUserId;
    } else if (type === "managed") {
      where.managers = { some: { id: currentUserId } };
    } else {
      // All farms user has access to
      where.OR = [
        { ownerId: currentUserId },
        { managers: { some: { id: currentUserId } } },
      ];
    }

    const farms = await prisma.farm.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        managers: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        _count: {
          select: {
            batches: true,
            expenses: true,
            sales: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const batches = await prisma.batch.groupBy({
      where: {
        farmId: { in: farms.map((farm) => farm.id) },
      },
      by: ["farmId", "status"],
      _count: {
        status: true,
      },
    });

    const farmsWithBatches = farms.map((farm) => {
      const activeBatches = batches
        .filter((b) => b.farmId === farm.id && b.status === "ACTIVE")
        .reduce((acc, b) => acc + b._count.status, 0);
        
      const closedBatches = batches
        .filter((b) => b.farmId === farm.id && b.status === "COMPLETED")
        .reduce((acc, b) => acc + b._count.status, 0);
        
      return {
        ...farm,
        _count: {
          ...farm._count,
          activeBatches,
          closedBatches,
        },
      };
    });

    console.log(farmsWithBatches);

    return res.json({
      success: true,
      data: farmsWithBatches,
    });
  } catch (error) {
    console.error("Get user farms error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE FARM ====================
export const createFarm = async (req: Request, res: Response): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Validate request body
    const { success, data, error } = CreateFarmSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if user can create farms
    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({ message: "Only owners can create farms" });
    }

    // Validate managers exist and are MANAGER role
    if (data.managers && data.managers.length > 0) {
      const managers = await prisma.user.findMany({
        where: {
          id: { in: data.managers },
          role: UserRole.MANAGER,
        },
      });

      if (managers.length !== data.managers.length) {
        return res.status(400).json({
          message: "Some managers are invalid or not MANAGER role",
        });
      }
    }

    // Create farm
    const farm = await prisma.farm.create({
      data: {
        name: data.name,
        capacity: data.capacity,
        description: data.description,
        ownerId: currentUserId as string,
        managers: {
          connect: data.managers?.map((id) => ({ id })) || [],
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        managers: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: farm,
      message: "Farm created successfully",
    });
  } catch (error) {
    console.error("Create farm error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE FARM ====================
export const updateFarm = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Validate request body
    const { success, data, error } = UpdateFarmSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if farm exists
    const existingFarm = await prisma.farm.findUnique({
      where: { id },
      include: { managers: true, owner: true },
    });

    if (!existingFarm) {
      return res.status(404).json({ message: "Farm not found" });
    }

    // Check access permissions
    const isOwner = existingFarm.ownerId === currentUserId;
    const isManager = existingFarm.managers.some(
      (manager) => manager.id === currentUserId
    );

    if (currentUserRole === UserRole.MANAGER && !isManager) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Only owner can change ownerId and managers
    if (currentUserRole !== UserRole.OWNER && !isOwner) {
      delete data.ownerId;
      delete data.managers;
    }

    // Validate managers if being updated
    if (data.managers && data.managers.length > 0) {
      const managers = await prisma.user.findMany({
        where: {
          id: { in: data.managers },
          role: UserRole.MANAGER,
        },
      });

      if (managers.length !== data.managers.length) {
        return res.status(400).json({
          message: "Some managers are invalid or not MANAGER role",
        });
      }
    }

    // Update farm
    const updateData: any = {
      ...data,
    };

    if (data.managers) {
      updateData.managers = {
        set: data.managers.map((id) => ({ id })),
      };
    }

    const updatedFarm = await prisma.farm.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        managers: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: updatedFarm,
      message: "Farm updated successfully",
    });
  } catch (error) {
    console.error("Update farm error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE FARM ====================
export const deleteFarm = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Check if farm exists
    const existingFarm = await prisma.farm.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            batches: true,
            expenses: true,
            sales: true,
          },
        },
      },
    });

    if (!existingFarm) {
      return res.status(404).json({ message: "Farm not found" });
    }

    // Only owner can delete farm
    if (existingFarm.ownerId !== currentUserId) {
      return res
        .status(403)
        .json({ message: "Only farm owner can delete farm" });
    }

    // Check if farm has any data
    const hasData =
      existingFarm._count.batches > 0 ||
      existingFarm._count.expenses > 0 ||
      existingFarm._count.sales > 0;

    if (hasData) {
      return res.status(400).json({
        message:
          "Cannot delete farm with existing batches, expenses, or sales. Please remove all data first.",
      });
    }

    // Delete farm
    await prisma.farm.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Farm deleted successfully",
    });
  } catch (error) {
    console.error("Delete farm error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ADD MANAGER TO FARM ====================
export const addManagerToFarm = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { managerId } = req.body;
    const currentUserId = req.userId;

    // Check if farm exists
    const farm = await prisma.farm.findUnique({
      where: { id },
    });

    if (!farm) {
      return res.status(404).json({ message: "Farm not found" });
    }

    // Only owner can add managers
    if (farm.ownerId !== currentUserId) {
      return res
        .status(403)
        .json({ message: "Only farm owner can add managers" });
    }

    // Check if manager exists and is MANAGER role
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
    });

    if (!manager) {
      return res.status(404).json({ message: "Manager not found" });
    }

    if (manager.role !== UserRole.MANAGER) {
      return res.status(400).json({ message: "User is not a manager" });
    }

    // Add manager to farm
    const updatedFarm = await prisma.farm.update({
      where: { id },
      data: {
        managers: {
          connect: { id: managerId },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        managers: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: updatedFarm,
      message: "Manager added successfully",
    });
  } catch (error) {
    console.error("Add manager to farm error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== REMOVE MANAGER FROM FARM ====================
export const removeManagerFromFarm = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id, managerId } = req.params;
    const currentUserId = req.userId;

    // Check if farm exists
    const farm = await prisma.farm.findUnique({
      where: { id },
    });

    if (!farm) {
      return res.status(404).json({ message: "Farm not found" });
    }

    // Only owner can remove managers
    if (farm.ownerId !== currentUserId) {
      return res
        .status(403)
        .json({ message: "Only farm owner can remove managers" });
    }

    // Remove manager from farm
    const updatedFarm = await prisma.farm.update({
      where: { id },
      data: {
        managers: {
          disconnect: { id: managerId },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        managers: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: updatedFarm,
      message: "Manager removed successfully",
    });
  } catch (error) {
    console.error("Remove manager from farm error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET FARM ANALYTICS ====================
export const getFarmAnalytics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Check if farm exists and user has access
    const farm = await prisma.farm.findUnique({
      where: { id },
      include: {
        managers: true,
      },
    });

    if (!farm) {
      return res.status(404).json({ message: "Farm not found" });
    }

    // Check access permissions
    const hasAccess =
      farm.ownerId === currentUserId ||
      (farm.managers || []).some((manager: any) => manager.id === currentUserId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get analytics data
    const [
      totalBatches,
      activeBatches,
      completedBatches,
      totalExpenses,
      totalSales,
      currentMonthExpenses,
      currentMonthSales,
    ] = await Promise.all([
      prisma.batch.count({ where: { farmId: id } }),
      prisma.batch.count({ where: { farmId: id, status: "ACTIVE" } }),
      prisma.batch.count({ where: { farmId: id, status: "COMPLETED" } }),
      prisma.expense.aggregate({
        where: { farmId: id },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: { farmId: id },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          farmId: id,
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: {
          farmId: id,
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalExpensesAmount = Number(totalExpenses._sum.amount || 0);
    const totalSalesAmount = Number(totalSales._sum.amount || 0);
    const currentMonthExpensesAmount = Number(
      currentMonthExpenses._sum.amount || 0
    );
    const currentMonthSalesAmount = Number(currentMonthSales._sum.amount || 0);

    const profit = totalSalesAmount - totalExpensesAmount;
    const profitMargin =
      totalSalesAmount > 0 ? (profit / totalSalesAmount) * 100 : 0;

    return res.json({
      success: true,
      data: {
        farmId: id,
        totalBatches,
        activeBatches,
        completedBatches,
        totalExpenses: totalExpensesAmount,
        totalSales: totalSalesAmount,
        profit,
        profitMargin,
        currentMonthExpenses: currentMonthExpensesAmount,
        currentMonthSales: currentMonthSalesAmount,
        capacity: farm.capacity,
        utilization:
          totalBatches > 0 ? (activeBatches / farm.capacity) * 100 : 0,
      },
    });
  } catch (error) {
    console.error("Get farm analytics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
