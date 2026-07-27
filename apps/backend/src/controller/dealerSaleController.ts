import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { parseDealerSaleDateRange } from "../utils/dealerSaleDateRange";
import { DealerService } from "../services/dealerService";
import bcrypt from "bcrypt";

// ==================== CREATE DEALER SALE ====================
export const createDealerSale = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;

    const {
      customerId,
      items,
      paidAmount,
      paymentMethod,
      notes,
      date,
      discount,
      invoiceNumber,
    } = req.body;

    // Validation
    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "At least one item is required",
      });
    }

    if (!customerId) {
      return res.status(400).json({
        message: "Customer ID is required",
      });
    }

    if (paidAmount < 0) {
      return res.status(400).json({
        message: "Paid amount cannot be negative",
      });
    }

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Restrict dealer sales to manual customers only.
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId: userId as string,
        farmerId: null,
      },
      select: { id: true },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const sale = await DealerService.createDealerSale({
      dealerId: dealer.id,
      customerId,
      items,
      paidAmount: Number(paidAmount),
      paymentMethod,
      notes,
      date: date ? new Date(date) : new Date(),
      discount:
        discount && discount.value > 0
          ? { type: discount.type, value: Number(discount.value) }
          : undefined,
      invoiceNumber: invoiceNumber?.trim() || undefined,
    });

    return res.status(201).json({
      success: true,
      data: sale,
      message: "Sale created successfully",
    });
  } catch (error: any) {
    console.error("Create dealer sale error:", error);
    return res.status(400).json({ message: error.message || "Internal server error" });
  }
};

// ==================== GET DEALER SALES ====================
export const getDealerSales = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const {
      page = 1,
      limit = 10,
      search,
      isPaid,
      customerId,
    } = req.query;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      dealerId: dealer.id,
      farmerId: null,
      accountId: null,
    };

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string, mode: "insensitive" } },
        { notes: { contains: search as string, mode: "insensitive" } },
      ];
    }

    // For manual customers, dueAmount is frozen at sale creation (initial payment only).
    // This filter reflects whether the sale was fully paid at the time of sale.
    if (isPaid === "true") {
      where.dueAmount = null;
    } else if (isPaid === "false") {
      where.dueAmount = { not: null };
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const [sales, total] = await Promise.all([
      prisma.dealerSale.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: "desc" },
        include: {
          customer: true,
          discount: true,
          items: {
            include: {
              product: true,
            },
          },
          payments: true,
        },
      }),
      prisma.dealerSale.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: sales,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Get dealer sales error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET DEALER SALE BY ID ====================
export const getDealerSaleById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const sale = await prisma.dealerSale.findFirst({
      where: {
        id,
        dealerId: dealer.id,
        farmerId: null,
        accountId: null,
      },
      include: {
        customer: true,
        discount: true,
        items: {
          include: {
            product: true,
          },
        },
        payments: {
          orderBy: { date: "desc" },
        },
        ledgerEntries: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    return res.status(200).json({
      success: true,
      data: sale,
    });
  } catch (error: any) {
    console.error("Get dealer sale by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ADD SALE PAYMENT ====================
export const addSalePayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { amount, date, description, paymentMethod } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: "Valid amount is required",
      });
    }

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Sale-level payments are no longer part of the manual flow.
    const sale = await prisma.dealerSale.findFirst({
      where: {
        id,
        dealerId: dealer.id,
      },
      select: { id: true },
    });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    return res.status(410).json({
      success: false,
      message:
        "Bill-wise sale payments have been removed. Use the normal customer ledger payment flow instead.",
      route: req.originalUrl,
    });
  } catch (error: any) {
    console.error("Add sale payment error:", error);
    return res.status(400).json({ message: error.message || "Internal server error" });
  }
};

// ==================== SEARCH COMPANIES ====================
export const searchCompanies = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { search } = req.query;

    if (!search || (search as string).length < 2) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // Search companies by name
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { name: { contains: search as string, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      take: 20,
      orderBy: { name: "asc" },
    });

    return res.status(200).json({
      success: true,
      data: companies,
    });
  } catch (error: any) {
    console.error("Search companies error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== SEARCH CUSTOMERS ====================
export const searchCustomers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    // Search manual customers only.
    const customers = await prisma.customer.findMany({
      where: {
        userId,
        farmerId: null,
        OR: [
          { name: { contains: search as string, mode: "insensitive" } },
          { phone: { contains: search as string, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        category: true,
        address: true,
        balance: true,
      },
      take: 10,
    });

    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error: any) {
    console.error("Search customers error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET DEALER CUSTOMERS ====================
export const getDealerCustomers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { search, page = 1, limit = 10, archived } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      userId: userId as string,
      farmerId: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string, mode: "insensitive" } },
        { address: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const archivedStr =
      typeof archived === "string"
        ? archived
        : Array.isArray(archived)
          ? archived[0]
          : undefined;
    const archivedBool = archivedStr === "true" || archivedStr === "1";

    // Default behavior: Active tab
    if (archivedBool) {
      where.archivedAt = { not: null };
    } else {
      where.archivedAt = null;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
          category: true,
          balance: true,
          archivedAt: true,
          createdAt: true,
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId as string },
      select: { id: true },
    });
    const dealerId = dealer?.id;
    const customerIds = customers.map((c) => c.id);

    let dealerSalesByCustomerId = new Map<string, number>();
    let paymentReceivedByCustomerId = new Map<string, number>();

    if (dealerId && customerIds.length > 0) {
      const dealerSalesGrouped = await prisma.dealerSale.groupBy({
        by: ["customerId"],
        where: {
          dealerId,
          customerId: { in: customerIds },
        },
        _count: { _all: true },
      });

      dealerSalesGrouped.forEach((r: any) => {
        if (r.customerId) dealerSalesByCustomerId.set(r.customerId, r._count._all);
      });

      const paymentsGrouped = await prisma.dealerLedgerEntry.groupBy({
        by: ["partyId"],
        where: {
          dealerId,
          partyType: "CUSTOMER",
          partyId: { in: customerIds },
          type: "PAYMENT_RECEIVED",
        },
        _count: { _all: true },
      });

      paymentsGrouped.forEach((r: any) => {
        if (r.partyId) paymentReceivedByCustomerId.set(r.partyId, r._count._all);
      });
    }

    const enrichedCustomers = customers.map((c: any) => {
      const hasDealerSales = (dealerSalesByCustomerId.get(c.id) || 0) > 0;
      const hasPayments = (paymentReceivedByCustomerId.get(c.id) || 0) > 0;

      return {
        ...c,
        hasDealerSales,
        hasPayments,
      };
    });

    return res.status(200).json({
      success: true,
      data: enrichedCustomers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Get dealer customers error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ARCHIVE / UNARCHIVE DEALER CUSTOMERS ====================
export const archiveDealerCustomer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    const customer = await prisma.customer.findFirst({
      where: { id, userId, farmerId: null },
      select: { id: true, balance: true },
    });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const hasDealerSales = await prisma.dealerSale.count({
      where: { dealerId: dealer.id, customerId: id },
    });

    const ledgerPayments = await prisma.dealerLedgerEntry.count({
      where: {
        dealerId: dealer.id,
        partyType: "CUSTOMER",
        partyId: id,
        type: "PAYMENT_RECEIVED",
      },
    });

    const hasPayments = ledgerPayments > 0;

    const deletable =
      Number(customer.balance) === 0 &&
      hasDealerSales === 0 &&
      !hasPayments;

    if (deletable) {
      return res.status(400).json({
        message: "Customer is deletable. Archive is not allowed.",
      });
    }

    const updated = await prisma.customer.updateMany({
      where: { id, userId },
      data: {
        archivedAt: new Date(),
        archivedById: userId,
      },
    });

    if (updated.count !== 1) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Archive customer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const unarchiveDealerCustomer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { id, userId, farmerId: null },
      select: { id: true, archivedAt: true },
    });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    if (!customer.archivedAt) {
      return res.status(400).json({ message: "Customer is not archived" });
    }

    const updated = await prisma.customer.updateMany({
      where: { id, userId },
      data: {
        archivedAt: null,
        archivedById: null,
      },
    });

    if (updated.count !== 1) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Unarchive customer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE DEALER CUSTOMER (NON-CONNECTED ONLY) ====================
export const deleteDealerCustomer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    const customer = await prisma.customer.findFirst({
      where: { id, userId, farmerId: null },
      select: { id: true, balance: true },
    });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const hasDealerSales = await prisma.dealerSale.count({
      where: { dealerId: dealer.id, customerId: id },
    });

    const ledgerPayments = await prisma.dealerLedgerEntry.count({
      where: {
        dealerId: dealer.id,
        partyType: "CUSTOMER",
        partyId: id,
        type: "PAYMENT_RECEIVED",
      },
    });

    const hasPayments = ledgerPayments > 0;

    const deletable =
      Number(customer.balance) === 0 &&
      hasDealerSales === 0 &&
      !hasPayments;

    if (!deletable) {
      return res.status(400).json({
        message:
          "Customer has sales/payments/opening balance. Archive instead of delete.",
      });
    }

    const deleted = await prisma.customer.deleteMany({ where: { id, userId } });
    if (deleted.count !== 1) {
      return res.status(404).json({ message: "Customer not found" });
    }
    return res.status(200).json({ success: true, message: "Customer deleted" });
  } catch (error: any) {
    console.error("Delete dealer customer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE CUSTOMER ON-THE-FLY ====================
export const createCustomer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { name, phone, address, category, openingBalance } = req.body;
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedPhone = typeof phone === "string" ? phone.trim() : "";

    // Validation
    if (!normalizedName) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    // Check if customer already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: {
        userId_name: {
          userId: userId as string,
          name: normalizedName,
        },
      },
    });

    if (existingCustomer) {
      return res.status(400).json({
        message: "Customer with this name already exists",
      });
    }

    const ob = openingBalance === undefined || openingBalance === null ? 0 : Number(openingBalance);
    if (Number.isNaN(ob)) {
      return res.status(400).json({ message: "Opening balance must be a valid number" });
    }

    // Create customer (and opening balance transaction if provided)
    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          name: normalizedName,
          phone: normalizedPhone || null,
          address: address ? String(address).trim() : null,
          category: category ? String(category).trim() : null,
          userId: userId as string,
          balance: ob,
        },
      });

      if (ob !== 0) {
        await tx.customerTransaction.create({
          data: {
            type: "OPENING_BALANCE",
            amount: ob,
            date: new Date(),
            description: "Opening balance",
            customerId: created.id,
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
  } catch (error: any) {
    console.error("Create customer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET SALES STATISTICS ====================
export const getSalesStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { startDate, endDate } = req.query;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const where: any = {
      dealerId: dealer.id,
      farmerId: null,
      accountId: null,
    };

    const statsRange = parseDealerSaleDateRange(startDate, endDate);
    if (!statsRange.ok) {
      return res.status(400).json({ message: statsRange.message });
    }
    if (statsRange.range) {
      where.date = {
        gte: statsRange.range.gte,
        lte: statsRange.range.lte,
      };
    }

    // Get totals
    const sales = await prisma.dealerSale.findMany({
      where,
    });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    // paidAmount/dueAmount on DealerSale reflect only the initial payment at sale time
    const totalPaidAtSale = sales.reduce((sum, sale) => sum + Number(sale.paidAmount), 0);
    const creditSales = sales.filter((sale) => Number(sale.paidAmount) < Number(sale.totalAmount)).length;

    // Get top customers
    const topCustomers = await prisma.dealerSale.groupBy({
      by: ["customerId"],
      where: {
        ...where,
        customerId: { not: null },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          totalAmount: "desc",
        },
      },
      take: 5,
    });

    // Get customer details
    const topCustomersWithDetails = await Promise.all(
      topCustomers.map(async (tc) => {
        const customer = await prisma.customer.findUnique({
          where: { id: tc.customerId! },
        });
        return {
          customer,
          totalAmount: tc._sum.totalAmount,
          totalSales: tc._count,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        totalSales,
        totalRevenue,
        totalPaid: totalPaidAtSale,
        totalDue: totalRevenue - totalPaidAtSale,
        creditSales,
        topCustomers: topCustomersWithDetails,
      },
    });
  } catch (error: any) {
    console.error("Get sales statistics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE DEALER SALE (MANUAL CUSTOMER ONLY) ====================
export const deleteDealerSale = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { password } = req.body ?? {};

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Password confirmation is required for deletion",
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid password. Deletion cancelled.",
      });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Verify sale belongs to dealer.
    const sale = await prisma.dealerSale.findFirst({
      where: {
        id,
        dealerId: dealer.id,
        farmerId: null,
        accountId: null,
      },
    });
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    await DealerService.deleteDealerSale({
      saleId: id,
      dealerId: dealer.id,
    });

    return res.status(200).json({
      success: true,
      message: "Sale deleted and inventory reverted successfully",
    });
  } catch (error: any) {
    console.error("Delete dealer sale error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
