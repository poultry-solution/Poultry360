import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { parseDealerSaleDateRange } from "../utils/dealerSaleDateRange";
import { DealerService } from "../services/dealerService";
import { DealerSaleRequestService } from "../services/dealerSaleRequestService";
import { DealerFarmerAccountService } from "../services/dealerFarmerAccountService";
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

    // Check if customer is a connected farmer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, farmerId: true, name: true },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // If customer has farmerId (connected farmer), create sale request instead
    if (customer.farmerId) {
      const request = await DealerSaleRequestService.createSaleRequest({
        dealerId: dealer.id,
        customerId,
        farmerId: customer.farmerId,
        items,
        paidAmount: Number(paidAmount),
        paymentMethod,
        notes,
        date: date ? new Date(date) : new Date(),
        discount:
          discount && discount.value > 0
            ? { type: discount.type as "PERCENT" | "FLAT", value: Number(discount.value) }
            : undefined,
      });

      return res.status(201).json({
        success: true,
        data: request,
        message: `Sale request created successfully and sent to ${customer.name}. Waiting for farmer approval.`,
        isRequest: true,
      });
    }

    // Otherwise, create direct sale (manual customer)
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
    });

    return res.status(201).json({
      success: true,
      data: sale,
      message: "Sale created successfully",
      isRequest: false,
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
      startDate,
      endDate,
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

    const rangeResult = parseDealerSaleDateRange(startDate, endDate);
    if (!rangeResult.ok) {
      return res.status(400).json({ message: rangeResult.message });
    }
    if (rangeResult.range) {
      where.date = {
        gte: rangeResult.range.gte,
        lte: rangeResult.range.lte,
      };
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

    // Check if sale belongs to dealer
    const sale = await prisma.dealerSale.findFirst({
      where: {
        id,
        dealerId: dealer.id,
      },
      select: { id: true, accountId: true },
    });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // Payments for connected farmers are managed at account level
    if (sale.accountId) {
      return res.status(400).json({
        message:
          "Payments for connected farmers are managed at account level. Use the farmer's account page to record payments.",
      });
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

    // Search customers only (includes both manual and connected customers)
    const customers = await prisma.customer.findMany({
      where: {
        userId,
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
        source: true, // Include source to distinguish manual vs connected
        farmerId: true, // Include farmerId for connected customers
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
    const { search, page = 1, limit = 50, archived } = req.query;

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

    // Dealer customers soft-archive (non-connected only for archived tab)
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
      // Only show archived non-connected customers
      where.farmerId = null;
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
          source: true,
          farmerId: true,
          archivedAt: true,
          createdAt: true,
        },
      }),
      prisma.customer.count({ where }),
    ]);

    // For connected customers (farmerId set), use dealer-farmer account balance so "due" matches account page
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId as string },
      select: { id: true },
    });
    if (dealer) {
      const farmerIds = customers.map((c) => c.farmerId).filter(Boolean) as string[];
      if (farmerIds.length > 0) {
        const accounts = await DealerFarmerAccountService.getDealerAccounts(dealer.id);
        const balanceByFarmerId = new Map(accounts.map((a) => [a.farmerId, a.balance]));
        for (const c of customers) {
          if (c.farmerId != null && balanceByFarmerId.has(c.farmerId)) {
            (c as any).balance = balanceByFarmerId.get(c.farmerId);
          }
        }
      }
    }

    // Compute "usage" flags to decide Delete vs Archive for non-connected customers.
    const dealerId = dealer?.id;
    const customerIds = customers.map((c) => c.id);

    let dealerSalesByCustomerId = new Map<string, number>();
    let saleRequestsByCustomerId = new Map<string, number>();
    let paymentReceivedByCustomerId = new Map<string, number>();
    let salePaymentRequestsByCustomerId = new Map<string, number>();

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

      const saleRequestsGrouped = await prisma.dealerSaleRequest.groupBy({
        by: ["customerId"],
        where: {
          dealerId,
          customerId: { in: customerIds },
        },
        _count: { _all: true },
      });

      saleRequestsGrouped.forEach((r: any) => {
        if (r.customerId) saleRequestsByCustomerId.set(r.customerId, r._count._all);
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

      // Pending/approved bill-wise payments requests (if any)
      const paymentRequestsGrouped = await prisma.dealerSalePaymentRequest.groupBy({
        by: ["customerId"],
        where: {
          dealerId,
          customerId: { in: customerIds },
        },
        _count: { _all: true },
      });

      paymentRequestsGrouped.forEach((r: any) => {
        if (r.customerId) salePaymentRequestsByCustomerId.set(r.customerId, r._count._all);
      });
    }

    const enrichedCustomers = customers.map((c: any) => {
      const hasDealerSales = (dealerSalesByCustomerId.get(c.id) || 0) > 0;
      const hasDealerSaleRequests = (saleRequestsByCustomerId.get(c.id) || 0) > 0;

      const ledgerPayments = paymentReceivedByCustomerId.get(c.id) || 0;
      const billWisePaymentRequests = salePaymentRequestsByCustomerId.get(c.id) || 0;

      // For now: ledger payments + bill-wise payment requests
      const hasPayments = ledgerPayments + billWisePaymentRequests > 0;

      return {
        ...c,
        hasDealerSales,
        hasDealerSaleRequests,
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
      where: { id, userId },
      select: { id: true, balance: true, farmerId: true, source: true },
    });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    // Only non-connected customers can be archived (connected handled later)
    if (customer.farmerId != null || customer.source === "CONNECTED") {
      return res.status(400).json({ message: "Cannot archive connected customers" });
    }

    // Usage flags
    const hasDealerSales = await prisma.dealerSale.count({
      where: { dealerId: dealer.id, customerId: id },
    });
    const hasDealerSaleRequests = await prisma.dealerSaleRequest.count({
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

    const salePaymentRequests = await prisma.dealerSalePaymentRequest.count({
      where: { dealerId: dealer.id, customerId: id },
    });

    const hasPayments = ledgerPayments + salePaymentRequests > 0;

    const deletable =
      Number(customer.balance) === 0 &&
      hasDealerSales === 0 &&
      hasDealerSaleRequests === 0 &&
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
      where: { id, userId },
      select: { id: true, farmerId: true, source: true, archivedAt: true },
    });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    // Only non-connected customers can be unarchived for now
    if (customer.farmerId != null || customer.source === "CONNECTED") {
      return res.status(400).json({ message: "Cannot unarchive connected customers" });
    }

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
      where: { id, userId },
      select: { id: true, balance: true, farmerId: true, source: true },
    });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    if (customer.farmerId != null || customer.source === "CONNECTED") {
      return res.status(400).json({ message: "Cannot delete connected customers" });
    }

    const hasDealerSales = await prisma.dealerSale.count({
      where: { dealerId: dealer.id, customerId: id },
    });
    const hasDealerSaleRequests = await prisma.dealerSaleRequest.count({
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

    const salePaymentRequests = await prisma.dealerSalePaymentRequest.count({
      where: { dealerId: dealer.id, customerId: id },
    });

    const hasPayments = ledgerPayments + salePaymentRequests > 0;

    const deletable =
      Number(customer.balance) === 0 &&
      hasDealerSales === 0 &&
      hasDealerSaleRequests === 0 &&
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

    const ob = openingBalance === undefined || openingBalance === null ? 0 : Number(openingBalance);
    if (Number.isNaN(ob)) {
      return res.status(400).json({ message: "Opening balance must be a valid number" });
    }

    // Create customer (and opening balance transaction if provided)
    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          name,
          phone,
          address,
          category,
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

    // Verify sale belongs to dealer and is for manual customer
    const sale = await prisma.dealerSale.findFirst({
      where: { id, dealerId: dealer.id },
      include: { customer: { select: { farmerId: true } } },
    });
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }
    if (sale.customer?.farmerId) {
      return res.status(400).json({
        message: "Cannot delete connected farmer sales",
      });
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

