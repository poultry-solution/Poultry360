import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, TransactionType, SalesItemType } from "@prisma/client";
import {
  CreateSaleSchema,
  UpdateSaleSchema,
  SaleSchema,
} from "@myapp/shared-types";

// ==================== GET ALL SALES ====================
import { getSalesCategoryIdForItemType } from "../utils/category";
export const getAllSales = async (
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
      customerId,
      isCredit,
      startDate,
      endDate,
    } = req.query;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};

    // Role-based filtering
    if (currentUserRole === UserRole.MANAGER) {
      // Managers can only see sales from farms they manage
      const userFarms = await prisma.farm.findMany({
        where: {
          OR: [
            { ownerId: currentUserId },
            { managers: { some: { id: currentUserId } } },
          ],
        },
        select: { id: true },
      });
      where.farmId = { in: userFarms.map((farm) => farm.id) };
    }

    if (farmId) {
      where.farmId = farmId as string;
    }

    if (batchId) {
      where.batchId = batchId as string;
    }

    if (customerId) {
      where.customerId = customerId as string;
    }

    if (isCredit !== undefined) {
      where.isCredit = isCredit === "true";
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
          customer: {
            name: { contains: search as string, mode: "insensitive" },
          },
        },
        { farm: { name: { contains: search as string, mode: "insensitive" } } },
      ];
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              category: true,
              balance: true,
            },
          },
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
          payments: {
            orderBy: { date: "desc" },
          },
          _count: {
            select: {
              payments: true,
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.sale.count({ where }),
    ]);

    return res.json({
      success: true,
      data: sales,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all sales error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET SALE BY ID ====================
export const getSaleById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            category: true,
            address: true,
            balance: true,
          },
        },
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
            startDate: true,
            endDate: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        payments: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        sale.farm?.owner.id === currentUserId ||
        (sale.farmId &&
          (await prisma.farm.findFirst({
            where: {
              id: sale.farmId,
              managers: { some: { id: currentUserId } },
            },
          })));

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    return res.json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error("Get sale by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET SALES BY BATCH ====================
export const getBatchSales = async (
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

    const sales = await prisma.sale.findMany({
      where: { batchId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            category: true,
            balance: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        payments: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: { date: "desc" },
    });

    return res.json({
      success: true,
      data: sales,
    });
  } catch (error) {
    console.error("Get batch sales error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE SALE ====================
export const createSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const currentUserId = req.userId as string;
    const currentUserRole = req.role;

    // Validate request body
    const { success, data, error } = CreateSaleSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    const {
      date,
      amount,
      quantity,
      weight,
      unitPrice,
      description,
      isCredit = false,
      paidAmount = 0,
      farmId,
      batchId,
      customerId,
      itemType,
    } = data;
    // Ensure required categoryId is present (Prisma requires non-null string)
    const categoryId = await getSalesCategoryIdForItemType(currentUserId, itemType as SalesItemType);

    if (!categoryId) {
      return res.status(400).json({ message: "categoryId is required" });
    }
    
  
    // Validate farm access if provided
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

      if (currentUserRole === UserRole.MANAGER) {
        const hasAccess =
          farm.ownerId === currentUserId ||
          farm.managers.some((manager) => manager.id === currentUserId);

        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied to farm" });
        }
      }
    }

    // Validate batch access if provided
    if (batchId) {
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

      if (currentUserRole === UserRole.MANAGER) {
        const hasAccess =
          batch.farm.ownerId === currentUserId ||
          batch.farm.managers.some((manager) => manager.id === currentUserId);

        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied to batch" });
        }
      }
    }

    // Validate category
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: currentUserId,
        type: "SALES",
      },
    });

    if (!category) {
      return res.status(404).json({ message: "Sales category not found" });
    }

    // Handle customer creation/validation
    let customer = null;
    let finalCustomerId = customerId;

    if (customerId) {
      // If customerId is provided, find existing customer
      customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          userId: currentUserId,
        },
      });

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
    } else if (data.customerData) {
      // If customerData is provided, create or find existing customer
      const { name, phone, category, address } = data.customerData;

      if (!name || !phone) {
        return res.status(400).json({
          message:
            "Customer name and phone are required when creating new customer",
        });
      }

      // Check if customer already exists
      customer = await prisma.customer.findFirst({
        where: {
          userId: currentUserId,
          OR: [{ name: name }, { phone: phone }],
        },
      });

      if (customer) {
        // Use existing customer
        finalCustomerId = customer.id;
      } else {
        // Create new customer
        customer = await prisma.customer.create({
          data: {
            name,
            phone,
            category: category || null,
            address: address || null,
            balance: 0, // Will be updated when sale is created
            userId: currentUserId as string,
          },
        });
        finalCustomerId = customer.id;
      }
    }

    // Validate and convert numeric values
    const numericAmount = Number(amount);
    const numericPaidAmount = Number(paidAmount);
    const numericQuantity = Number(quantity);
    const numericWeight = weight !== undefined && weight !== null ? Number(weight) : null;
    const numericUnitPrice = Number(unitPrice);
    const numericBirdsCount = numericQuantity;

    // Validate numeric values
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    if (isNaN(numericQuantity) || numericQuantity <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }
    if (itemType === SalesItemType.Chicken_Meat) {
      if (numericWeight === null || isNaN(numericWeight) || numericWeight <= 0) {
        return res.status(400).json({ message: "Weight is required and must be > 0 for Chicken_Meat sales" });
      }
    } else {
      if (numericWeight !== null && (isNaN(numericWeight) || numericWeight < 0)) {
        return res.status(400).json({ message: "Invalid weight" });
      }
    }
    if (isNaN(numericUnitPrice) || numericUnitPrice <= 0) {
      return res.status(400).json({ message: "Invalid unit price" });
    }
    if (isNaN(numericPaidAmount) || numericPaidAmount < 0) {
      return res.status(400).json({ message: "Invalid paid amount" });
    }

    // Calculate due amount for credit sales
    const dueAmount = isCredit ? numericAmount - numericPaidAmount : 0;

    return await prisma.$transaction(async (tx) => {
      // 1. Create the sale
      const sale = await tx.sale.create({
        data: {
          date: new Date(date),
          amount: numericAmount,
          quantity: numericQuantity,
          weight: numericWeight !== null ? numericWeight : null,
          unitPrice: numericUnitPrice,
          description: description || null,
          isCredit,
          paidAmount: numericPaidAmount,
          dueAmount: dueAmount > 0 ? dueAmount : null,
          itemType,
          farmId: farmId || null,
          batchId: batchId || null,
          categoryId: categoryId,
          customerId: finalCustomerId || null,
        },
      });

      // 2. Update customer balance if it's a credit sale
      if (isCredit && finalCustomerId && dueAmount > 0) {
        await tx.customer.update({
          where: { id: finalCustomerId },
          data: {
            balance: {
              increment: dueAmount,
            },
          },
        });

        // Create customer transaction record
        await tx.customerTransaction.create({
          data: {
            type: TransactionType.SALE,
            amount: dueAmount,
            date: new Date(date),
            description: `Credit sale: ${description || "Sale"}`,
            reference: sale.id,
            customerId: finalCustomerId,
          },
        });
      }

      // 3. Create initial payment record if paidAmount > 0
      if (Number(paidAmount) > 0) {
        await tx.salePayment.create({
          data: {
            amount: Number(paidAmount),
            date: new Date(date),
            description: "Initial payment",
            saleId: sale.id,
          },
        });
      }

      // 4. If linked to a batch and birdsCount provided, record as mortality to reduce current birds
      // Note: Both quantity (number of birds) and weight are now stored for comprehensive calculations:
      // - quantity: Used for mortality tracking, determining when batch is complete
      // - weight: Used for yield calculations (weight per bird), profit per kg calculations
      // - Together: Enable FCR calculations, expense allocation per bird/kg, profit analysis
      if (itemType === SalesItemType.Chicken_Meat && batchId && numericBirdsCount > 0) {
        console.log("numericBirdsCount:", numericBirdsCount);
        await tx.mortality.create({
          data: {
            date: new Date(date),
            count: numericBirdsCount,
            reason: "SLAUGHTERED_FOR_SALE",
            batchId: batchId,
            saleId: sale.id,
          },
        });
        console.log("mortality created");
      }

      // 5. Fetch the complete sale with relationships
      const completeSale = await tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              category: true,
              balance: true,
            },
          },
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
          payments: {
            orderBy: { date: "desc" },
          },
        },
      });

      return res.status(201).json({
        success: true,
        data: completeSale,
        message: "Sale created successfully",
      });
    });
  } catch (error) {
    console.error("Create sale error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE SALE ====================
export const updateSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Validate request body
    const { success, data, error } = UpdateSaleSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if sale exists and user has access
    const existingSale = await prisma.sale.findUnique({
      where: { id },
      include: {
        farm: {
          include: {
            owner: true,
            managers: true,
          },
        },
        customer: true,
      },
    });

    if (!existingSale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        existingSale.farm?.ownerId === currentUserId ||
        existingSale.farm?.managers.some(
          (manager) => manager.id === currentUserId
        );

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Validate category if being updated
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          userId: currentUserId,
          type: "SALES",
        },
      });

      if (!category) {
        return res.status(404).json({ message: "Sales category not found" });
      }
    }

    // Validate customer if being updated
    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: data.customerId,
          userId: currentUserId,
        },
      });

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
    }

    return await prisma.$transaction(async (tx) => {
      // Calculate new due amount if amount or paidAmount is being updated
      let newDueAmount: number | null = Number(existingSale.dueAmount || 0);
      if (data.amount !== undefined || data.paidAmount !== undefined) {
        const newAmount =
          data.amount !== undefined
            ? Number(data.amount)
            : Number(existingSale.amount);
        const newPaidAmount =
          data.paidAmount !== undefined
            ? Number(data.paidAmount)
            : Number(existingSale.paidAmount);
        newDueAmount = newAmount - newPaidAmount;
      }

      // Update the sale
      const updatedSale = await tx.sale.update({
        where: { id },
        data: {
          ...data,
          date: data.date ? new Date(data.date) : undefined,
          amount: data.amount ? Number(data.amount) : undefined,
          quantity: data.quantity ? Number(data.quantity) : undefined,
          weight: data.weight ? Number(data.weight) : undefined,
          unitPrice: data.unitPrice ? Number(data.unitPrice) : undefined,
          paidAmount: data.paidAmount ? Number(data.paidAmount) : undefined,
          dueAmount: newDueAmount > 0 ? newDueAmount : null,
        },
      });

      // Update customer balance if it's a credit sale and amount changed
      if (
        existingSale.isCredit &&
        existingSale.customerId &&
        (data.amount !== undefined || data.paidAmount !== undefined)
      ) {
        const oldDueAmount = Number(existingSale.dueAmount || 0);
        const balanceChange = (newDueAmount || 0) - oldDueAmount;

        if (balanceChange !== 0) {
          await tx.customer.update({
            where: { id: existingSale.customerId },
            data: {
              balance: {
                increment: balanceChange,
              },
            },
          });

          // Create customer transaction record for the balance change
          await tx.customerTransaction.create({
            data: {
              type: TransactionType.ADJUSTMENT,
              amount: Math.abs(balanceChange),
              date: new Date(),
              description: `Sale update: ${balanceChange > 0 ? "Increased" : "Decreased"} due amount`,
              reference: id,
              customerId: existingSale.customerId,
            },
          });
        }
      }

      // Fetch the complete updated sale
      const completeSale = await tx.sale.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              category: true,
              balance: true,
            },
          },
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
          payments: {
            orderBy: { date: "desc" },
          },
        },
      });

      return res.json({
        success: true,
        data: completeSale,
        message: "Sale updated successfully",
      });
    });
  } catch (error) {
    console.error("Update sale error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE SALE ====================
export const deleteSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Check if sale exists and user has access
    const existingSale = await prisma.sale.findUnique({
      where: { id },
      include: {
        farm: {
          include: {
            owner: true,
            managers: true,
          },
        },
        customer: true,
        payments: true,
      },
    });

    if (!existingSale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        existingSale.farm?.ownerId === currentUserId ||
        existingSale.farm?.managers.some(
          (manager) => manager.id === currentUserId
        );

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    return await prisma.$transaction(async (tx) => {
      // If it's a credit sale, reverse the customer balance
      if (
        existingSale.isCredit &&
        existingSale.customerId &&
        existingSale.dueAmount
      ) {
        await tx.customer.update({
          where: { id: existingSale.customerId },
          data: {
            balance: {
              decrement: Number(existingSale.dueAmount),
            },
          },
        });

        // Create customer transaction record for the reversal
        await tx.customerTransaction.create({
          data: {
            type: TransactionType.ADJUSTMENT,
            amount: Number(existingSale.dueAmount),
            date: new Date(),
            description: `Sale deletion: Reversed due amount`,
            reference: existingSale.id,
            customerId: existingSale.customerId,
          },
        });
      }

      // Delete the sale (payments will be deleted automatically due to cascade)
      await tx.sale.delete({
        where: { id },
      });

      // also delete the mortality created
      await tx.mortality.deleteMany({
        where: {
          saleId: existingSale.id,
        },
      });

      console.log("mortality deleted");

      return res.json({
        success: true,
        message: "Sale deleted successfully",
      });
    });
  } catch (error) {
    console.error("Delete sale error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ADD SALE PAYMENT ====================
export const addSalePayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { amount, date, description } = req.body;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ message: "Valid payment amount is required" });
    }

    // Check if sale exists and user has access
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        farm: {
          include: {
            owner: true,
            managers: true,
          },
        },
        customer: true,
        payments: true,
      },
    });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // Check access permissions
    if (currentUserRole === UserRole.MANAGER) {
      const hasAccess =
        sale.farm?.ownerId === currentUserId ||
        sale.farm?.managers.some((manager) => manager.id === currentUserId);

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Calculate current due amount
    const totalPaid = sale.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );
    const currentDue = Number(sale.amount) - totalPaid;

    if (Number(amount) > currentDue) {
      return res.status(400).json({
        message: `Payment amount (${amount}) cannot exceed due amount (${currentDue})`,
      });
    }

    return await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.salePayment.create({
        data: {
          amount: Number(amount),
          date: date ? new Date(date) : new Date(),
          description: description || "Payment received",
          saleId: id,
        },
      });

      // Update sale paid amount
      const newPaidAmount = totalPaid + Number(amount);
      const newDueAmount = Number(sale.amount) - newPaidAmount;

      await tx.sale.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount > 0 ? newDueAmount : null,
        },
      });

      // Update customer balance if it's a credit sale
      if (sale.isCredit && sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            balance: {
              decrement: Number(amount),
            },
          },
        });

        // Create customer transaction record
        await tx.customerTransaction.create({
          data: {
            type: TransactionType.RECEIPT,
            amount: Number(amount),
            date: date ? new Date(date) : new Date(),
            description: description || "Payment received",
            reference: payment.id,
            customerId: sale.customerId,
          },
        });
      }

      // Fetch updated sale with payments
      const updatedSale = await tx.sale.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              category: true,
              balance: true,
            },
          },
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
          payments: {
            orderBy: { date: "desc" },
          },
        },
      });

      return res.status(201).json({
        success: true,
        data: updatedSale,
        message: "Payment added successfully",
      });
    });
  } catch (error) {
    console.error("Add sale payment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET SALE STATISTICS ====================
export const getSaleStatistics = async (
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
      where.farmId = { in: userFarms.map((farm) => farm.id) };
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
      totalSales,
      totalAmount,
      creditSales,
      creditAmount,
      paidAmount,
      dueAmount,
      currentMonthSales,
      currentMonthAmount,
    ] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.aggregate({
        where,
        _sum: { amount: true },
      }),
      prisma.sale.count({ where: { ...where, isCredit: true } }),
      prisma.sale.aggregate({
        where: { ...where, isCredit: true },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: { ...where, isCredit: true },
        _sum: { paidAmount: true },
      }),
      prisma.sale.aggregate({
        where: { ...where, isCredit: true },
        _sum: { dueAmount: true },
      }),
      prisma.sale.count({
        where: {
          ...where,
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.sale.aggregate({
        where: {
          ...where,
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        totalSales,
        totalAmount: Number(totalAmount._sum.amount || 0),
        creditSales,
        creditAmount: Number(creditAmount._sum.amount || 0),
        paidAmount: Number(paidAmount._sum.paidAmount || 0),
        dueAmount: Number(dueAmount._sum.dueAmount || 0),
        currentMonthSales,
        currentMonthAmount: Number(currentMonthAmount._sum.amount || 0),
        cashSales: totalSales - creditSales,
        cashAmount:
          Number(totalAmount._sum.amount || 0) -
          Number(creditAmount._sum.amount || 0),
      },
    });
  } catch (error) {
    console.error("Get sale statistics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET SALES CATEGORIES ====================
export const getSalesCategories = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    let categories = await prisma.category.findMany({
      where: {
        userId: currentUserId,
        type: "SALES",
      },
      orderBy: { name: "asc" },
    });

    // If no categories exist, create default ones
    if (categories.length === 0) {
      const defaultCategories = [
        { name: "Chicken Sales", description: "Sales of live chickens" },
        { name: "Egg Sales", description: "Sales of eggs" },
        { name: "Feed Sales", description: "Sales of feed to other farmers" },
        { name: "Equipment Sales", description: "Sales of equipment" },
        { name: "Other Sales", description: "Other sales" },
      ];

      await prisma.category.createMany({
        data: defaultCategories.map((cat) => ({
          name: cat.name,
          type: "SALES" as const,
          description: cat.description,
          userId: currentUserId as string,
        })),
      });

      // Fetch the created categories
      categories = await prisma.category.findMany({
        where: {
          userId: currentUserId,
          type: "SALES",
        },
        orderBy: { name: "asc" },
      });
    }

    return res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get sales categories error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET CUSTOMERS FOR SALES ====================
export const getCustomersForSales = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const { search } = req.query;

    const where: any = {
      userId: currentUserId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        category: true,
        address: true,
        balance: true,
      },
      orderBy: { name: "asc" },
      take: 50, // Limit results for performance
    });

    return res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Get customers for sales error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE SALES CATEGORY ====================
export const createSalesCategory = async (
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
        type: "SALES",
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
        type: "SALES",
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
    console.error("Create sales category error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
