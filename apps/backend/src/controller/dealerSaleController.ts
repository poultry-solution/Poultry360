import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { DealerService } from "../services/dealerService";

// ==================== CREATE DEALER SALE ====================
export const createDealerSale = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;

    const {
      customerId,
      farmerId,
      items,
      paidAmount,
      paymentMethod,
      notes,
      date,
    } = req.body;

    // Validation
    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "At least one item is required",
      });
    }

    if (!customerId && !farmerId) {
      return res.status(400).json({
        message: "Either customerId or farmerId is required",
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

    // Create sale using service
    const sale = await DealerService.createDealerSale({
      dealerId: dealer.id,
      customerId,
      farmerId,
      items,
      paidAmount: Number(paidAmount),
      paymentMethod,
      notes,
      date: date ? new Date(date) : new Date(),
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
      startDate,
      endDate,
      isPaid,
      customerId,
      farmerId,
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
    };

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string, mode: "insensitive" } },
        { notes: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    if (isPaid === "true") {
      where.dueAmount = null;
    } else if (isPaid === "false") {
      where.dueAmount = { not: null };
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (farmerId) {
      where.farmerId = farmerId;
    }

    const [sales, total] = await Promise.all([
      prisma.dealerSale.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: "desc" },
        include: {
          customer: true,
          farmer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
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
      },
      include: {
        customer: true,
        farmer: {
          select: {
            id: true,
            name: true,
            phone: true,
            companyName: true,
          },
        },
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

    // Check if sale belongs to dealer
    const sale = await prisma.dealerSale.findFirst({
      where: {
        id,
        dealerId: dealer.id,
      },
    });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // Add payment using service
    const updatedSale = await DealerService.addSalePayment({
      saleId: id,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      description,
      paymentMethod,
    });

    return res.status(200).json({
      success: true,
      data: updatedSale,
      message: "Payment added successfully",
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

// ==================== SEARCH CUSTOMERS/FARMERS ====================
export const searchCustomers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { search, type = "all" } = req.query;

    if (!search) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const results: any = {
      customers: [],
      farmers: [],
    };

    // Search customers
    if (type === "all" || type === "customer") {
      const customers = await prisma.customer.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: search as string, mode: "insensitive" } },
            { phone: { contains: search as string, mode: "insensitive" } },
          ],
        },
        take: 10,
      });
      results.customers = customers;
    }

    // Search farmers (registered users)
    if (type === "all" || type === "farmer") {
      const farmers = await prisma.user.findMany({
        where: {
          role: "OWNER",
          OR: [
            { name: { contains: search as string, mode: "insensitive" } },
            { phone: { contains: search as string, mode: "insensitive" } },
            { companyName: { contains: search as string, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          companyName: true,
          CompanyFarmLocation: true,
        },
        take: 10,
      });
      results.farmers = farmers;
    }

    return res.status(200).json({
      success: true,
      data: results,
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
    const { search, page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      userId: userId as string,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string, mode: "insensitive" } },
        { address: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.count({ where }),
    ]);

    // Calculate balance for each customer
    const customersWithBalance = await Promise.all(
      customers.map(async (customer) => {
        // Get total sales amount for this customer
        const sales = await prisma.dealerSale.findMany({
          where: { customerId: customer.id },
          select: {
            totalAmount: true,
            paidAmount: true,
          },
        });

        const totalSales = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
        const totalPaid = sales.reduce((sum, sale) => sum + Number(sale.paidAmount), 0);
        const balance = totalSales - totalPaid;

        return {
          ...customer,
          balance,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: customersWithBalance,
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

// ==================== CREATE CUSTOMER ON-THE-FLY ====================
export const createCustomer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { name, phone, address, category } = req.body;

    // Validation
    if (!name || !phone) {
      return res.status(400).json({
        message: "Name and phone are required",
      });
    }

    // Check if customer already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: {
        userId_name: {
          userId: userId as string,
          name,
        },
      },
    });

    if (existingCustomer) {
      return res.status(400).json({
        message: "Customer with this name already exists",
      });
    }

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        address,
        category,
        userId: userId as string,
      },
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
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    // Get totals
    const sales = await prisma.dealerSale.findMany({
      where,
    });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const totalPaid = sales.reduce((sum, sale) => sum + Number(sale.paidAmount), 0);
    const totalDue = sales.reduce((sum, sale) => sum + Number(sale.dueAmount || 0), 0);
    const creditSales = sales.filter((sale) => sale.isCredit).length;

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
        totalPaid,
        totalDue,
        creditSales,
        topCustomers: topCustomersWithDetails,
      },
    });
  } catch (error: any) {
    console.error("Get sales statistics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

