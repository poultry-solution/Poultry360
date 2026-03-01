import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, TransactionType, CategoryType } from "@prisma/client";
import {
  CreateExpenseSchema,
  UpdateExpenseSchema,
  ExpenseSchema,
} from "@myapp/shared-types";
import { InventoryService } from "../services/inventoryService";

// ==================== GET ALL EXPENSES ====================
export const getAllExpenses = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      farmId,
      batchId,
      categoryId,
      startDate,
      endDate,
      categoryType,
    } = req.query;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      category: {
        userId: currentUserId,
      },
    };

    // Role-based filtering
    if (currentUserRole === UserRole.MANAGER) {
      // Managers can only see expenses from farms they manage or own
      const userFarms = await prisma.farm.findMany({
        where: {
          OR: [
            { ownerId: currentUserId },
            { managers: { some: { id: currentUserId } } },
          ],
        },
        select: { id: true },
      });
      where.farmId = { in: userFarms.map((f) => f.id) };
    }

    if (farmId) {
      where.farmId = farmId as string;
    }

    if (batchId) {
      where.batchId = batchId as string;
    }

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (categoryType) {
      where.category = {
        ...(where.category || {}),
        type: categoryType as CategoryType,
      };
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

    if (search) {
      where.OR = [
        { description: { contains: search as string, mode: "insensitive" } },
        {
          category: {
            name: { contains: search as string, mode: "insensitive" },
          },
        },
      ];
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: Number(limit),
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
          batch: {
            select: {
              id: true,
              batchNumber: true,
              status: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          inventoryUsages: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
          _count: {
            select: {
              inventoryUsages: true,
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.expense.count({ where }),
    ]);

    return res.json({
      success: true,
      data: expenses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all expenses error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET EXPENSE BY ID ====================
export const getExpenseById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const expense = await prisma.expense.findUnique({
      where: { id },
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
            managers: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
        inventoryUsages: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                unit: true,
                currentStock: true,
              },
            },
          },
        },
        entityTransactions: {
          include: {
            dealer: {
              select: {
                id: true,
                name: true,
              },
            },
            hatchery: {
              select: {
                id: true,
                name: true,
              },
            },
            medicineSupplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        expense.farm?.owner.id === currentUserId ||
        expense.farm?.managers.some((manager) => manager.id === currentUserId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    return res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error("Get expense by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET BATCH EXPENSES ====================
export const getBatchExpenses = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { batchId } = req.params;
    const { page = 1, limit = 10, categoryType } = req.query;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const skip = (Number(page) - 1) * Number(limit);

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

    // Build where clause
    const where: any = {
      batchId,
    };

    if (categoryType) {
      where.category = {
        type: categoryType as CategoryType,
      };
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          inventoryUsages: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.expense.count({ where }),
    ]);

    return res.json({
      success: true,
      data: expenses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get batch expenses error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE EXPENSE ====================
export const createExpense = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Validate request body
    const { success, data, error } = CreateExpenseSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    const {
      date,
      amount,
      description,
      quantity,
      unitPrice,
      farmId,
      batchId,
      categoryId,
      inventoryItems, // NEW: Array of inventory items to deduct
    } = data as any; // Type assertion for now

    // Check if farm exists and user has access
    if (farmId) {
      const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        include: {
          owner: true,
          managers: true,
        },
      });

      if (!farm) {
        return res.status(404).json({ message: "Farm not found" });
      }

      // Check access permissions
      if (currentUserRole === UserRole.MANAGER) {
        const hasAccess =
          farm.ownerId === currentUserId ||
          farm.managers.some((manager) => manager.id === currentUserId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
    }

    // Check if batch exists and belongs to the farm
    if (batchId) {
      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
        include: { farm: true },
      });

      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }

      if (farmId && batch.farmId !== farmId) {
        return res.status(400).json({
          message: "Batch does not belong to the specified farm",
        });
      }
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    console.log("----------------------------");
    console.log(category);

    // Track total feed quantity captured via inventory items to avoid double-creating feed consumption
    let totalFeedQuantityFromInventory = 0;

    // Pre-fetch inventory items and their latest transactions to reduce queries in transaction
    let inventoryItemsData = [];
    if (inventoryItems && inventoryItems.length > 0) {
      const itemIds = inventoryItems.map((item: any) => item.itemId);

      // Fetch all inventory items in one query
      const items = await prisma.inventoryItem.findMany({
        where: { id: { in: itemIds } },
        include: { category: true },
      });

      // Fetch all latest transactions in one query
      const latestTransactions = await prisma.inventoryTransaction.findMany({
        where: {
          itemId: { in: itemIds },
          type: "PURCHASE",
        },
        orderBy: { date: "desc" },
        distinct: ["itemId"],
      });

      // Create a map for quick lookup
      const transactionMap = new Map();
      latestTransactions.forEach((tx) => {
        transactionMap.set(tx.itemId, tx);
      });

      // Prepare inventory items data
      inventoryItemsData = inventoryItems.map((item: any) => {
        const inventoryItem = items.find((i) => i.id === item.itemId);
        if (!inventoryItem) {
          throw new Error(`Inventory item not found: ${item.itemId}`);
        }

        // Check if enough stock available
        if (Number(inventoryItem.currentStock) < item.quantity) {
          throw new Error(
            `Insufficient stock. Available: ${inventoryItem.currentStock}, Required: ${item.quantity}`
          );
        }

        const latestTransaction = transactionMap.get(item.itemId);
        const unitPrice = latestTransaction
          ? Number(latestTransaction.unitPrice)
          : 0;
        const totalAmount = unitPrice * item.quantity;

        return {
          ...item,
          inventoryItem,
          unitPrice,
          totalAmount,
        };
      });
    }

    // Execute the main transaction with increased timeout
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Create the expense
        const expense = await tx.expense.create({
          data: {
            date: new Date(date),
            amount: Number(amount),
            description: description || null,
            quantity: quantity ? Number(quantity) : null,
            unitPrice: unitPrice ? Number(unitPrice) : null,
            farmId: farmId || null,
            batchId: batchId || null,
            categoryId,
          },
        });

        // 2. Process inventory usage if inventory items are provided
        const inventoryUsages = [];
        if (inventoryItemsData.length > 0) {
          // Create all inventory usages in parallel
          const usagePromises = inventoryItemsData.map(
            async (itemData: any) => {
              const { inventoryItem, unitPrice, totalAmount } = itemData;

              // Record usage (link to existing expense)
              const usage = await tx.inventoryUsage.create({
                data: {
                  date: new Date(date),
                  quantity: itemData.quantity,
                  unitPrice,
                  totalAmount,
                  notes: `${description || "Expense"} - ${itemData.notes || ""}`,
                  itemId: itemData.itemId,
                  farmId: farmId || "",
                  batchId: batchId || null,
                  expenseId: expense.id,
                },
              });

              // If this expense is feed consumption and batch is provided, add a FeedConsumption record
              if (
                category.type === CategoryType.EXPENSE &&
                category.name.toLowerCase() === "feed" &&
                batchId
              ) {
                console.log("Adding feed consumption from inventory item");
                await tx.feedConsumption.create({
                  data: {
                    date: new Date(date),
                    quantity: itemData.quantity,
                    feedType: inventoryItem.name,
                    batchId: batchId,
                  },
                });
                totalFeedQuantityFromInventory += Number(
                  itemData.quantity || 0
                );
              }

              // Update stock
              await tx.inventoryItem.update({
                where: { id: itemData.itemId },
                data: {
                  currentStock: {
                    decrement: itemData.quantity,
                  },
                },
              });

              // Create inventory transaction (stock reduction)
              await tx.inventoryTransaction.create({
                data: {
                  type: TransactionType.USAGE, // Using USAGE for internal consumption
                  quantity: itemData.quantity,
                  unitPrice,
                  totalAmount,
                  date: new Date(date),
                  description: `Usage recorded for ${farmId || "general"}${batchId ? ` - Batch ${batchId}` : ""}`,
                  itemId: itemData.itemId,
                },
              });

              return usage;
            }
          );

          const usages = await Promise.all(usagePromises);
          inventoryUsages.push(...usages);
        }

        // If category is Feed and we did not register any feed consumption via inventory items,
        // but the expense itself has a quantity and batchId is present, create a single FeedConsumption.
        if (
          category.type === CategoryType.EXPENSE &&
          category.name.toLowerCase() === "feed" &&
          batchId &&
          totalFeedQuantityFromInventory === 0 &&
          (quantity || 0) > 0
        ) {
          console.log("Adding feed consumption from expense quantity");
          await tx.feedConsumption.create({
            data: {
              date: new Date(date),
              quantity: Number(quantity),
              feedType: "Feed",
              batchId: batchId,
            },
          });
        }

        return { expense, inventoryUsages };
      },
      {
        timeout: 30000, // Increase timeout to 30 seconds
      }
    );

    // 3. Fetch the complete expense with relationships (outside transaction)
    const completeExpense = await prisma.expense.findUnique({
      where: { id: result.expense.id },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        inventoryUsages: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: completeExpense,
      message: "Expense created successfully",
    });
  } catch (error) {
    console.error("Create expense error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE EXPENSE ====================
export const updateExpense = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Validate request body
    const { success, data, error } = UpdateExpenseSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
      include: {
        farm: {
          include: {
            owner: true,
            managers: true,
          },
        },
        inventoryUsages: true,
      },
    });

    if (!existingExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        existingExpense.farm?.ownerId === currentUserId ||
        existingExpense.farm?.managers.some(
          (manager) => manager.id === currentUserId
        );
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Update expense
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        amount: data.amount ? Number(data.amount) : undefined,
        quantity: data.quantity ? Number(data.quantity) : undefined,
        unitPrice: data.unitPrice ? Number(data.unitPrice) : undefined,
      },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        inventoryUsages: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    return res.json({
      success: true,
      data: updatedExpense,
      message: "Expense updated successfully",
    });
  } catch (error) {
    console.error("Update expense error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE EXPENSE ====================
export const deleteExpense = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Check if expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
      include: {
        farm: {
          include: {
            owner: true,
            managers: true,
          },
        },
        inventoryUsages: true,
        _count: {
          select: {
            inventoryUsages: true,
          },
        },
      },
    });

    if (!existingExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        existingExpense.farm?.ownerId === currentUserId ||
        existingExpense.farm?.managers.some(
          (manager) => manager.id === currentUserId
        );
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Restore inventory stock from usage records
      for (const usage of existingExpense.inventoryUsages) {
        await tx.inventoryItem.update({
          where: { id: usage.itemId },
          data: {
            currentStock: {
              increment: Number(usage.quantity),
            },
          },
        });

        // Delete the usage record
        await tx.inventoryUsage.delete({
          where: { id: usage.id },
        });
      }

      // 2. Delete the expense
      await tx.expense.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: "Expense deleted successfully",
      });
    });
  } catch (error) {
    console.error("Delete expense error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET EXPENSE STATISTICS ====================
export const getExpenseStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { farmId, batchId, startDate, endDate } = req.query;
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
      where.farmId = { in: userFarms.map((f) => f.id) };
    }

    if (farmId) {
      where.farmId = farmId as string;
    }

    if (batchId) {
      where.batchId = batchId as string;
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

    const [
      totalExpenses,
      totalAmount,
      expensesByCategory,
      currentMonthExpenses,
      expensesByFarm,
    ] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
      }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        where,
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.expense.aggregate({
        where: {
          ...where,
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.expense.groupBy({
        by: ["farmId"],
        where,
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    // Get category names
    const categoryIds = expensesByCategory.map((e) => e.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, type: true },
    });

    const expensesByCategoryWithNames = expensesByCategory.map((expense) => {
      const category = categories.find((c) => c.id === expense.categoryId);
      return {
        categoryId: expense.categoryId,
        categoryName: category?.name || "Unknown",
        categoryType: category?.type || "UNKNOWN",
        totalAmount: Number(expense._sum.amount || 0),
        count: expense._count.id,
      };
    });

    // Get farm names
    const farmIds = expensesByFarm
      .map((e) => e.farmId)
      .filter((id): id is string => Boolean(id));
    const farms = await prisma.farm.findMany({
      where: { id: { in: farmIds } },
      select: { id: true, name: true },
    });

    const expensesByFarmWithNames = expensesByFarm.map((expense) => {
      const farm = farms.find((f) => f.id === expense.farmId);
      return {
        farmId: expense.farmId,
        farmName: farm?.name || "General",
        totalAmount: Number(expense._sum.amount || 0),
        count: expense._count.id,
      };
    });

    return res.json({
      success: true,
      data: {
        totalExpenses,
        totalAmount: Number(totalAmount._sum.amount || 0),
        currentMonthExpenses: Number(currentMonthExpenses._sum.amount || 0),
        currentMonthCount: currentMonthExpenses._count.id,
        expensesByCategory: expensesByCategoryWithNames,
        expensesByFarm: expensesByFarmWithNames,
      },
    });
  } catch (error) {
    console.error("Get expense statistics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET EXPENSE CATEGORIES ====================
export const getExpenseCategories = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { type } = req.query;
    const currentUserId = req.userId;

    const where: any = {
      userId: currentUserId,
    };

    if (type) {
      where.type = type as CategoryType;
    }

    let categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: {
            expenses: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // If no categories exist, create default expense categories
    if (categories.length === 0 && (!type || type === "EXPENSE")) {
      const defaultCategories = [
        {
          name: "Feed",
          type: CategoryType.EXPENSE,
          description: "Feed and nutrition expenses",
          userId: currentUserId as string,
        },
        {
          name: "Medicine",
          type: CategoryType.EXPENSE,
          description: "Medicine and vaccination expenses",
          userId: currentUserId as string,
        },
        {
          name: "Hatchery",
          type: CategoryType.EXPENSE,
          description: "Hatchery and chick expenses",
          userId: currentUserId as string,
        },
        {
          name: "Equipment",
          type: CategoryType.EXPENSE,
          description: "Equipment and maintenance expenses",
          userId: currentUserId as string,
        },
        {
          name: "Other",
          type: CategoryType.EXPENSE,
          description: "Other miscellaneous expenses",
          userId: currentUserId as string,
        },
      ];

      // Create default categories
      await prisma.category.createMany({
        data: defaultCategories,
        skipDuplicates: true,
      });

      // Fetch the created categories
      categories = await prisma.category.findMany({
        where,
        include: {
          _count: {
            select: {
              expenses: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    }

    return res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get expense categories error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE EXPENSE CATEGORY ====================
export const createExpenseCategory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Check if category already exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: currentUserId,
        name: name,
        type: CategoryType.EXPENSE,
      },
    });

    if (existingCategory) {
      return res.status(400).json({
        message: "Category with this name already exists",
      });
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name,
        type: CategoryType.EXPENSE,
        description: description || null,
        userId: currentUserId as string,
      },
    });

    return res.status(201).json({
      success: true,
      data: category,
      message: "Category created successfully",
    });
  } catch (error) {
    console.error("Create expense category error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
