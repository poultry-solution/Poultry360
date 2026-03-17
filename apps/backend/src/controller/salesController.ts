import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, TransactionType, SalesItemType } from "@prisma/client";
import {
  CreateSaleSchema,
  UpdateSaleSchema,
  SaleSchema,
} from "@myapp/shared-types";

// ==================== GET ALL SALE PAYMENTS ====================
export const getAllSalePayments = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      farmId,
      customerId,
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
      // Managers can only see payments for sales from farms they manage
      const userFarms = await prisma.farm.findMany({
        where: {
          OR: [
            { ownerId: currentUserId },
            { managers: { some: { id: currentUserId } } },
          ],
        },
        select: { id: true },
      });
      where.sale = {
        farmId: { in: userFarms.map((farm) => farm.id) },
      };
    } else {
      // Owners see payments for their sales (implicitly via sale.farm.ownerId or sale.userId if applicable)
      // Assuming Sale model links to Farm/User, we constrain by Sale's farm owner or direct association
      // For simplicity in this app's context where sales are linked to farms owned by the user:
      where.sale = {
        farm: { ownerId: currentUserId },
      };
    }

    if (farmId) {
      where.sale = { ...where.sale, farmId: farmId as string };
    }

    if (customerId) {
      where.sale = { ...where.sale, customerId: customerId as string };
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
          sale: {
            customer: {
              name: { contains: search as string, mode: "insensitive" },
            },
          },
        },
      ];
    }

    // Sale-level payments (legacy) + customer-level receipts (new total-balance mode)
    const salePaymentsPromise = prisma.salePayment.findMany({
      where,
      include: {
        sale: {
          select: {
            id: true,
            date: true,
            amount: true,
            itemType: true,
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
      orderBy: { date: "desc" },
    });
    const salePaymentsCountPromise = prisma.salePayment.count({ where });

    // Customer-level receipts: CustomerTransaction(RECEIPT) for customers owned by this user
    // Note: we apply the same date/search/customer filters at transaction level where possible.
    const txnWhere: any = {
      type: TransactionType.RECEIPT,
      customer: {
        userId: currentUserId,
      },
    };
    if (customerId) {
      txnWhere.customerId = customerId as string;
    }
    if (startDate || endDate) {
      txnWhere.date = {};
      if (startDate) txnWhere.date.gte = new Date(startDate as string);
      if (endDate) txnWhere.date.lte = new Date(endDate as string);
    }
    if (search) {
      txnWhere.OR = [
        { description: { contains: search as string, mode: "insensitive" } },
        { reference: { contains: search as string, mode: "insensitive" } },
        { customer: { name: { contains: search as string, mode: "insensitive" } } },
      ];
    }

    const customerReceiptsPromise = prisma.customerTransaction.findMany({
      where: txnWhere,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });
    const customerReceiptsCountPromise = prisma.customerTransaction.count({
      where: txnWhere,
    });

    const [salePayments, salePaymentsTotal, customerReceipts, customerReceiptsTotal] =
      await Promise.all([
        salePaymentsPromise,
        salePaymentsCountPromise,
        customerReceiptsPromise,
        customerReceiptsCountPromise,
      ]);

    // Normalize into one list and paginate in-memory (simple, safe for farmer-scale data)
    const normalized = [
      ...salePayments.map((p) => ({
        id: p.id,
        date: p.date,
        amount: Number(p.amount),
        description: p.description,
        receiptUrl: p.receiptUrl,
        source: "SALE_PAYMENT" as const,
        sale: p.sale,
      })),
      ...customerReceipts.map((t) => ({
        id: t.id,
        date: t.date,
        amount: Number(t.amount),
        description: t.description,
        receiptUrl: t.imageUrl,
        source: "CUSTOMER_RECEIPT" as const,
        sale: { customer: t.customer },
        reference: t.reference,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = salePaymentsTotal + customerReceiptsTotal;
    const start = skip;
    const end = skip + Number(limit);
    const payments = normalized.slice(start, end);

    return res.json({
      success: true,
      data: payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all sale payments error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

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
          eggType: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          eggLines: {
            include: {
              eggType: { select: { id: true, name: true, code: true } },
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
        eggType: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        eggLines: {
          include: {
            eggType: { select: { id: true, name: true, code: true } },
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
        eggType: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        eggLines: {
          include: {
            eggType: { select: { id: true, name: true, code: true } },
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
      eggTypeId,
      eggLineItems,
    } = data;

    const useEggLines = itemType === SalesItemType.EGGS && eggLineItems != null && eggLineItems.length > 0;
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

    // Egg sales require a batch (egg stock is per batch only)
    if (itemType === SalesItemType.EGGS && !batchId) {
      return res.status(400).json({
        message: "A batch is required for egg sales. Please select a batch.",
      });
    }

    // Validate batch access if provided
    let batch = null;
    if (batchId) {
      batch = await prisma.batch.findUnique({
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

      // Validate egg type(s) for EGGS sales
      if (itemType === SalesItemType.EGGS && !useEggLines && eggTypeId) {
        const eggType = await prisma.eggType.findFirst({
          where: { id: eggTypeId, userId: currentUserId },
        });
        if (!eggType) {
          return res.status(400).json({
            message: "Invalid egg type or access denied",
          });
        }
      }

      // Validate birds count for Chicken_Meat sales
      if (itemType === SalesItemType.Chicken_Meat) {
        // Calculate current birds in batch
        const totalMortality = batch.mortalities.reduce((sum, m) => sum + m.count, 0);
        const currentBirds = batch.initialChicks - totalMortality;

        const requestedBirds = Number(quantity || 0);

        if (requestedBirds > currentBirds) {
          return res.status(400).json({
            message: `Cannot sell ${requestedBirds} birds. Only ${currentBirds} birds available in batch (Initial: ${batch.initialChicks}, Mortality: ${totalMortality})`
          });
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

    // Compute or validate numeric values
    let numericAmount: number;
    let numericQuantity: number;
    let numericUnitPrice: number;

    if (useEggLines) {
      // Validate each line and compute totals (use batch egg inventory when batchId provided)
      let totalAmount = 0;
      let totalQty = 0;
      for (const line of eggLineItems!) {
        const eggType = await prisma.eggType.findFirst({
          where: { id: line.eggTypeId, userId: currentUserId },
        });
        if (!eggType) {
          return res.status(400).json({ message: `Invalid egg type: ${line.eggTypeId}` });
        }
        const available =
          (await prisma.batchEggInventory.findUnique({
            where: { batchId_eggTypeId: { batchId: batchId!, eggTypeId: line.eggTypeId } },
          }))?.quantity ?? 0;
        if (available < line.quantity) {
          return res.status(400).json({
            message: `Insufficient egg inventory. ${eggType.name}: available ${available}, requested ${line.quantity}`,
          });
        }
        totalAmount += line.quantity * line.unitPrice;
        totalQty += line.quantity;
      }
      numericAmount = totalAmount;
      numericQuantity = totalQty;
      numericUnitPrice = 0; // not used for multi-line
    } else {
      numericAmount = Number(amount);
      numericQuantity = Number(quantity);
      numericUnitPrice = Number(unitPrice);
    }

    const numericPaidAmount = Number(paidAmount);
    const numericWeight = weight !== undefined && weight !== null ? Number(weight) : null;
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
    if (!useEggLines && (isNaN(numericUnitPrice) || numericUnitPrice <= 0)) {
      return res.status(400).json({ message: "Invalid unit price" });
    }
    if (isNaN(numericPaidAmount) || numericPaidAmount < 0) {
      return res.status(400).json({ message: "Invalid paid amount" });
    }

    // For EGGS sales (single type): validate egg type and inventory
    if (itemType === SalesItemType.EGGS && !useEggLines) {
      if (!eggTypeId) {
        return res.status(400).json({ message: "eggTypeId or eggLineItems is required for egg sales" });
      }
      const eggType = await prisma.eggType.findFirst({
        where: { id: eggTypeId, userId: currentUserId },
      });
      if (!eggType) {
        return res.status(400).json({ message: "Invalid egg type" });
      }
      const available =
        (await prisma.batchEggInventory.findUnique({
          where: { batchId_eggTypeId: { batchId: batchId!, eggTypeId } },
        }))?.quantity ?? 0;
      if (available < numericQuantity) {
        return res.status(400).json({
          message: `Insufficient egg inventory. Available (${eggType.name}): ${available}, requested: ${numericQuantity}`,
        });
      }
    }

    // Calculate due amount for credit sales
    const dueAmount = isCredit ? numericAmount - numericPaidAmount : 0;

    return await prisma.$transaction(async (tx) => {
      // For multi-line egg sales, use first line's unitPrice for Sale.unitPrice (required field)
      const saleUnitPrice = useEggLines && eggLineItems!.length > 0
        ? eggLineItems![0].unitPrice
        : numericUnitPrice;

      // 1. Create the sale
      const sale = await tx.sale.create({
        data: {
          date: new Date(date),
          amount: numericAmount,
          quantity: numericQuantity,
          weight: numericWeight !== null ? numericWeight : null,
          unitPrice: saleUnitPrice,
          description: description || null,
          isCredit,
          paidAmount: numericPaidAmount,
          dueAmount: dueAmount > 0 ? dueAmount : null,
          itemType,
          eggTypeId: useEggLines ? null : (itemType === SalesItemType.EGGS && eggTypeId ? eggTypeId : null),
          farmId: farmId || null,
          batchId: batchId || null,
          categoryId: categoryId,
          customerId: finalCustomerId || null,
        },
      });

      // 1b. Egg sales: decrement batch egg inventory only (batch required for eggs)
      if (useEggLines && eggLineItems) {
        for (const line of eggLineItems) {
          await tx.saleEggLine.create({
            data: {
              saleId: sale.id,
              eggTypeId: line.eggTypeId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            },
          });
          const inv = await tx.batchEggInventory.findUnique({
            where: { batchId_eggTypeId: { batchId: batchId!, eggTypeId: line.eggTypeId } },
          });
          if (inv) {
            await tx.batchEggInventory.update({
              where: { id: inv.id },
              data: { quantity: { decrement: line.quantity } },
            });
          }
        }
      } else if (itemType === SalesItemType.EGGS && eggTypeId) {
        const inv = await tx.batchEggInventory.findUnique({
          where: { batchId_eggTypeId: { batchId: batchId!, eggTypeId } },
        });
        if (inv) {
          await tx.batchEggInventory.update({
            where: { id: inv.id },
            data: { quantity: { decrement: numericQuantity } },
          });
        }
      }

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

        // 4b. If weight is provided, create a BirdWeight record from this sale
        if (weight && numericBirdsCount > 0) {
          const avgWeight = Number(weight) / numericBirdsCount;
          console.log("Creating weight record from sale:", avgWeight, "kg per bird");

          await tx.birdWeight.create({
            data: {
              batchId: batchId,
              date: new Date(date),
              avgWeight: avgWeight,
              sampleCount: numericBirdsCount,
              source: "SALE",
              notes: `Auto-computed from sale #${sale.id}`,
            },
          });

          // Update batch's currentWeight
          await tx.batch.update({
            where: { id: batchId },
            data: {
              currentWeight: avgWeight,
            },
          });
          console.log("Weight record created and batch currentWeight updated");
        }
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
        eggLines: true,
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

      // Restore egg inventory for EGGS sales (eggs are per batch only)
      const saleBatchId = existingSale.batchId;
      if (existingSale.itemType === SalesItemType.EGGS && saleBatchId) {
        if (existingSale.eggLines && existingSale.eggLines.length > 0) {
          for (const line of existingSale.eggLines) {
            const inv = await tx.batchEggInventory.findUnique({
              where: { batchId_eggTypeId: { batchId: saleBatchId, eggTypeId: line.eggTypeId } },
            });
            if (inv) {
              await tx.batchEggInventory.update({
                where: { id: inv.id },
                data: { quantity: { increment: line.quantity } },
              });
            }
          }
        } else if (existingSale.eggTypeId) {
          const inv = await tx.batchEggInventory.findUnique({
            where: { batchId_eggTypeId: { batchId: saleBatchId, eggTypeId: existingSale.eggTypeId } },
          });
          if (inv) {
            await tx.batchEggInventory.update({
              where: { id: inv.id },
              data: { quantity: { increment: Number(existingSale.quantity) } },
            });
          }
        }
      }

      // Delete the sale (payments and eggLines will be deleted automatically due to cascade)
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
    const { amount, date, description, receiptUrl } = req.body;
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
          receiptUrl: receiptUrl || null,
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
            imageUrl: receiptUrl || null,
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

// ==================== ADD CUSTOMER PAYMENT (NO SALE REQUIRED) ====================
export const addCustomerPayment = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id: customerId } = req.params;
    const { amount, date, description, reference, receiptUrl } = req.body;
    const currentUserId = req.userId;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Valid payment amount is required" });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: currentUserId },
      select: { id: true },
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const paymentDate = date ? new Date(date) : new Date();

    const txn = await prisma.$transaction(async (tx) => {
      // Update customer balance (payment reduces what they owe; may go negative if overpaid)
      await tx.customer.update({
        where: { id: customerId },
        data: {
          balance: { decrement: numericAmount },
        },
      });

      // Keep a transaction record for ledger/history
      return await tx.customerTransaction.create({
        data: {
          type: TransactionType.RECEIPT,
          amount: numericAmount,
          date: paymentDate,
          description: description || "Payment received",
          reference: reference ? String(reference) : null,
          imageUrl: receiptUrl || null,
          customerId,
        },
      });
    });

    return res.status(201).json({
      success: true,
      data: {
        transaction: {
          id: txn.id,
          type: txn.type,
          amount: Number(txn.amount),
          date: txn.date,
          description: txn.description,
          reference: txn.reference,
          imageUrl: txn.imageUrl,
          customerId: txn.customerId,
        },
      },
      message: "Payment recorded successfully",
    });
  } catch (error) {
    console.error("Add customer payment error:", error);
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
        source: true, // Include source ("MANUAL" | "CONNECTED")
        farmerId: true, // Include farmerId for connected customers
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

// ==================== CUSTOMER MANAGEMENT ====================

// Create customer
export const createCustomer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const { name, phone, category, address, openingBalance, openingBalanceNotes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        message: "Customer name and phone are required"
      });
    }

    let numericOpeningBalance: number | null = null;
    if (openingBalance !== undefined && openingBalance !== null && openingBalance !== "") {
      const n = Number(openingBalance);
      if (!Number.isFinite(n)) {
        return res.status(400).json({ message: "openingBalance must be a valid number" });
      }
      numericOpeningBalance = n;
    }

    // Check if customer already exists
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        userId: currentUserId,
        OR: [
          { name: name },
          { phone: phone }
        ],
      },
    });

    if (existingCustomer) {
      return res.status(400).json({
        message: "Customer with this name or phone already exists",
      });
    }

    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          name,
          phone,
          category: category || null,
          address: address || null,
          balance: numericOpeningBalance ?? 0,
          userId: currentUserId as string,
        },
      });

      if (numericOpeningBalance && numericOpeningBalance !== 0) {
        await tx.customerTransaction.create({
          data: {
            customerId: created.id,
            type: "OPENING_BALANCE",
            amount: numericOpeningBalance,
            date: new Date(),
            description: openingBalanceNotes ? String(openingBalanceNotes) : "Opening balance",
            reference: null,
            imageUrl: null,
          },
        });
      }

      return created;
    });

    return res.status(201).json({
      success: true,
      data: customer,
      message: "Customer created successfully",
    });
  } catch (error) {
    console.error("Create customer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Update customer
export const updateCustomer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const { name, phone, category, address } = req.body;

    // Check if customer exists and belongs to user
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!existingCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Check if name or phone conflicts with other customers
    if (name || phone) {
      const conflictCustomer = await prisma.customer.findFirst({
        where: {
          id: { not: id },
          userId: currentUserId,
          OR: [
            ...(name ? [{ name: name }] : []),
            ...(phone ? [{ phone: phone }] : []),
          ],
        },
      });

      if (conflictCustomer) {
        return res.status(400).json({
          message: "Customer with this name or phone already exists",
        });
      }
    }

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(category !== undefined && { category }),
        ...(address !== undefined && { address }),
      },
    });

    return res.json({
      success: true,
      data: updatedCustomer,
      message: "Customer updated successfully",
    });
  } catch (error) {
    console.error("Update customer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Delete customer
export const deleteCustomer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Check if customer exists and belongs to user
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
      include: {
        sales: true,
      },
    });

    if (!existingCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Check if customer has any sales
    if (existingCustomer.sales.length > 0) {
      return res.status(400).json({
        message: "Cannot delete customer with existing sales. Please delete sales first.",
      });
    }

    // Delete customer
    await prisma.customer.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get customer by ID
export const getCustomerById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
      include: {
        sales: {
          select: {
            id: true,
            amount: true,
            date: true,
            isCredit: true,
            paidAmount: true,
            dueAmount: true,
          },
          orderBy: { date: "desc" },
        },
        transactions: {
          orderBy: { date: "desc" },
          take: 50,
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const latestOpening = await prisma.customerTransaction.findFirst({
      where: { customerId: id, type: TransactionType.OPENING_BALANCE },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { amount: true, date: true, description: true, reference: true },
    });

    const openingBalanceHistory = await prisma.customerTransaction.findMany({
      where: { customerId: id, type: TransactionType.OPENING_BALANCE },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { id: true, amount: true, date: true, description: true, reference: true },
    });

    return res.json({
      success: true,
      data: {
        ...customer,
        openingBalance: latestOpening
          ? {
              amount: Number(latestOpening.amount),
              date: latestOpening.date,
              notes: latestOpening.description ?? null,
              reference: latestOpening.reference ?? null,
            }
          : { amount: 0, date: null, notes: null, reference: null },
        openingBalanceHistory: openingBalanceHistory.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          date: t.date,
          notes: t.description ?? null,
          reference: t.reference ?? null,
        })),
      },
    });
  } catch (error) {
    console.error("Get customer by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== SET/UPDATE CUSTOMER OPENING BALANCE (APPEND HISTORY) ====================
export const setCustomerOpeningBalance = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const { openingBalance, notes, date } = req.body;

    const nextOpening = Number(openingBalance);
    if (openingBalance === undefined || openingBalance === null || Number.isNaN(nextOpening)) {
      return res.status(400).json({ message: "openingBalance (number) is required" });
    }

    const customer = await prisma.customer.findFirst({
      where: { id, userId: currentUserId },
      select: { id: true, balance: true },
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const latest = await prisma.customerTransaction.findFirst({
      where: { customerId: id, type: TransactionType.OPENING_BALANCE },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { amount: true },
    });
    const prevOpening = latest ? Number(latest.amount) : 0;
    const delta = nextOpening - prevOpening;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.customerTransaction.create({
        data: {
          type: TransactionType.OPENING_BALANCE,
          amount: nextOpening,
          date: date ? new Date(date) : new Date(),
          description: notes ? String(notes).trim() || null : "Opening balance",
          customerId: id,
        },
      });
      return tx.customer.update({
        where: { id },
        data: { balance: Number(customer.balance) + delta },
      });
    });

    return res.status(200).json({
      success: true,
      data: { id: updated.id, balance: Number(updated.balance) },
      message: "Opening balance updated",
    });
  } catch (error) {
    console.error("Set customer opening balance error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
