import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { TransactionType, UserRole } from "@prisma/client";

// ==================== GET ALL ACCOUNT TRANSACTIONS ====================
export const getAllAccountTransactions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      page = 1,
      limit = 100,
      entityType,
      transactionType,
      startDate,
      endDate,
      search,
    } = req.query;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause for EntityTransaction
    const entityTransactionWhere: any = {
      OR: [
        { dealer: { userId: currentUserId } },
        { hatchery: { userId: currentUserId } },
        { medicineSupplier: { userId: currentUserId } },
        { customer: { userId: currentUserId } },
      ],
    };

    // Filter by entity type
    if (entityType) {
      const entityTypeStr = entityType as string;
      if (entityTypeStr === "DEALER") {
        entityTransactionWhere.dealerId = { not: null };
        entityTransactionWhere.dealer = { userId: currentUserId };
      } else if (entityTypeStr === "HATCHERY") {
        entityTransactionWhere.hatcheryId = { not: null };
        entityTransactionWhere.hatchery = { userId: currentUserId };
      } else if (entityTypeStr === "CUSTOMER") {
        entityTransactionWhere.customerId = { not: null };
        entityTransactionWhere.customer = { userId: currentUserId };
      } else if (entityTypeStr === "MEDICINE_SUPPLIER") {
        entityTransactionWhere.medicineSupplierId = { not: null };
        entityTransactionWhere.medicineSupplier = { userId: currentUserId };
      }
    }

    // Filter by transaction type
    if (transactionType) {
      entityTransactionWhere.type = transactionType as TransactionType;
    }

    // Date range filter
    if (startDate || endDate) {
      entityTransactionWhere.date = {};
      if (startDate) {
        entityTransactionWhere.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        entityTransactionWhere.date.lte = new Date(endDate as string);
      }
    }

    // Search filter
    if (search) {
      entityTransactionWhere.OR = [
        { description: { contains: search as string, mode: "insensitive" } },
        { itemName: { contains: search as string, mode: "insensitive" } },
        { reference: { contains: search as string, mode: "insensitive" } },
        { dealer: { name: { contains: search as string, mode: "insensitive" } } },
        { hatchery: { name: { contains: search as string, mode: "insensitive" } } },
        { customer: { name: { contains: search as string, mode: "insensitive" } } },
        { medicineSupplier: { name: { contains: search as string, mode: "insensitive" } } },
      ];
    }

    // Build where clause for Sales
    const salesWhere: any = {};

    // Role-based filtering for sales
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
      salesWhere.farmId = { in: userFarms.map((farm) => farm.id) };
    } else {
      // For OWNER, get all farms they own
      const userFarms = await prisma.farm.findMany({
        where: { ownerId: currentUserId },
        select: { id: true },
      });
      salesWhere.farmId = { in: userFarms.map((farm) => farm.id) };
    }

    // Filter sales by entity type (only if CUSTOMER is selected)
    if (entityType === "CUSTOMER") {
      salesWhere.customerId = { not: null };
    } else if (entityType && entityType !== "CUSTOMER") {
      // If filtering by non-customer entity, exclude sales
      salesWhere.id = { in: [] }; // Empty result
    }

    // Date range filter for sales
    if (startDate || endDate) {
      salesWhere.date = {};
      if (startDate) {
        salesWhere.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        salesWhere.date.lte = new Date(endDate as string);
      }
    }

    // Search filter for sales
    if (search) {
      salesWhere.OR = [
        { description: { contains: search as string, mode: "insensitive" } },
        { customer: { name: { contains: search as string, mode: "insensitive" } } },
      ];
    }

    // Fetch ALL EntityTransactions (for proper running balance calculation)
    const [entityTransactions, entityTransactionsTotal] = await Promise.all([
      prisma.entityTransaction.findMany({
        where: entityTransactionWhere,
        include: {
          dealer: {
            select: {
              id: true,
              name: true,
              contact: true,
            },
          },
          hatchery: {
            select: {
              id: true,
              name: true,
              contact: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          medicineSupplier: {
            select: {
              id: true,
              name: true,
              contact: true,
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.entityTransaction.count({ where: entityTransactionWhere }),
    ]);

    // Fetch ALL Sales (for proper running balance calculation)
    const shouldFetchSales = !entityType || entityType === "CUSTOMER" || entityType === "";
    const [sales, salesTotal] = shouldFetchSales
      ? await Promise.all([
          prisma.sale.findMany({
            where: salesWhere,
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
          }),
          prisma.sale.count({ where: salesWhere }),
        ])
      : [[], 0];

    // Transform EntityTransactions to unified format
    const transformedEntityTransactions = entityTransactions.map((tx) => {
      let entityType = "";
      let entityName = "";
      let entityId = "";

      if (tx.dealer) {
        entityType = "DEALER";
        entityName = tx.dealer.name;
        entityId = tx.dealer.id;
      } else if (tx.hatchery) {
        entityType = "HATCHERY";
        entityName = tx.hatchery.name;
        entityId = tx.hatchery.id;
      } else if (tx.customer) {
        entityType = "CUSTOMER";
        entityName = tx.customer.name;
        entityId = tx.customer.id;
      } else if (tx.medicineSupplier) {
        entityType = "MEDICINE_SUPPLIER";
        entityName = tx.medicineSupplier.name;
        entityId = tx.medicineSupplier.id;
      }

      return {
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        quantity: tx.quantity,
        freeQuantity: tx.freeQuantity,
        itemName: tx.itemName,
        date: tx.date,
        description: tx.description,
        reference: tx.reference,
        entityType,
        entityName,
        entityId,
        paymentToPurchaseId: tx.paymentToPurchaseId,
        source: "EntityTransaction",
      };
    });

    // Transform Sales to unified format
    const transformedSales = sales.map((sale) => ({
      id: sale.id,
      type: "SALE" as TransactionType,
      amount: Number(sale.amount),
      quantity: Number(sale.quantity),
      freeQuantity: null,
      itemName: sale.itemType,
      date: sale.date,
      description: sale.description,
      reference: null,
      entityType: "CUSTOMER",
      entityName: sale.customer?.name || "Cash Sale",
      entityId: sale.customer?.id || null,
      paymentToPurchaseId: null,
      source: "Sale",
      isCredit: sale.isCredit,
      paidAmount: Number(sale.paidAmount),
    }));

    // Combine and sort all transactions by date
    const allTransactions = [
      ...transformedEntityTransactions,
      ...transformedSales,
    ].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Descending order
    });

    // Calculate running balance
    // Start from the oldest transaction and work forward
    const sortedByDateAsc = [...allTransactions].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB; // Ascending order for balance calculation
    });

    let runningBalance = 0;
    const transactionsWithBalance = sortedByDateAsc.map((tx) => {
      // Determine if this is a debit or credit
      const isDebit = tx.type === "PURCHASE" || tx.type === "PAYMENT";
      const isCredit = tx.type === "RECEIPT" || tx.type === "SALE";

      if (isDebit) {
        runningBalance -= tx.amount;
      } else if (isCredit) {
        runningBalance += tx.amount;
      }

      return {
        ...tx,
        debit: isDebit ? tx.amount : 0,
        credit: isCredit ? tx.amount : 0,
        runningBalance,
      };
    });

    // Sort back to descending for display and apply pagination
    const sortedDescending = transactionsWithBalance.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Descending order
    });

    const finalTransactions = sortedDescending.slice(skip, skip + Number(limit));

    const totalCount = entityTransactionsTotal + salesTotal;

    return res.json({
      success: true,
      data: finalTransactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all account transactions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

