"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalesStatistics = exports.createCustomer = exports.getDealerCustomers = exports.searchCustomers = exports.searchCompanies = exports.addSalePayment = exports.getDealerSaleById = exports.getDealerSales = exports.createDealerSale = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const dealerService_1 = require("../services/dealerService");
const dealerSaleRequestService_1 = require("../services/dealerSaleRequestService");
const dealerFarmerAccountService_1 = require("../services/dealerFarmerAccountService");
// ==================== CREATE DEALER SALE ====================
const createDealerSale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { customerId, items, paidAmount, paymentMethod, notes, date, discount, } = req.body;
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
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Check if customer is a connected farmer
        const customer = yield prisma_1.default.customer.findUnique({
            where: { id: customerId },
            select: { id: true, farmerId: true, name: true },
        });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        // If customer has farmerId (connected farmer), create sale request instead
        if (customer.farmerId) {
            const request = yield dealerSaleRequestService_1.DealerSaleRequestService.createSaleRequest({
                dealerId: dealer.id,
                customerId,
                farmerId: customer.farmerId,
                items,
                paidAmount: Number(paidAmount),
                paymentMethod,
                notes,
                date: date ? new Date(date) : new Date(),
                discount: discount && discount.value > 0
                    ? { type: discount.type, value: Number(discount.value) }
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
        const sale = yield dealerService_1.DealerService.createDealerSale({
            dealerId: dealer.id,
            customerId,
            items,
            paidAmount: Number(paidAmount),
            paymentMethod,
            notes,
            date: date ? new Date(date) : new Date(),
            discount: discount && discount.value > 0
                ? { type: discount.type, value: Number(discount.value) }
                : undefined,
        });
        return res.status(201).json({
            success: true,
            data: sale,
            message: "Sale created successfully",
            isRequest: false,
        });
    }
    catch (error) {
        console.error("Create dealer sale error:", error);
        return res.status(400).json({ message: error.message || "Internal server error" });
    }
});
exports.createDealerSale = createDealerSale;
// ==================== GET DEALER SALES ====================
const getDealerSales = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { page = 1, limit = 10, search, startDate, endDate, isPaid, customerId, } = req.query;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {
            dealerId: dealer.id,
        };
        if (search) {
            where.OR = [
                { invoiceNumber: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
            ];
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        if (isPaid === "true") {
            where.dueAmount = null;
        }
        else if (isPaid === "false") {
            where.dueAmount = { not: null };
        }
        if (customerId) {
            where.customerId = customerId;
        }
        const [sales, total] = yield Promise.all([
            prisma_1.default.dealerSale.findMany({
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
            prisma_1.default.dealerSale.count({ where }),
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
    }
    catch (error) {
        console.error("Get dealer sales error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerSales = getDealerSales;
// ==================== GET DEALER SALE BY ID ====================
const getDealerSaleById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const sale = yield prisma_1.default.dealerSale.findFirst({
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
    }
    catch (error) {
        console.error("Get dealer sale by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerSaleById = getDealerSaleById;
// ==================== ADD SALE PAYMENT ====================
const addSalePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Check if sale belongs to dealer
        const sale = yield prisma_1.default.dealerSale.findFirst({
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
                message: "Payments for connected farmers are managed at account level. Use the farmer's account page to record payments.",
            });
        }
        // Add payment using service
        const updatedSale = yield dealerService_1.DealerService.addSalePayment({
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
    }
    catch (error) {
        console.error("Add sale payment error:", error);
        return res.status(400).json({ message: error.message || "Internal server error" });
    }
});
exports.addSalePayment = addSalePayment;
// ==================== SEARCH COMPANIES ====================
const searchCompanies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search } = req.query;
        if (!search || search.length < 2) {
            return res.status(200).json({
                success: true,
                data: [],
            });
        }
        // Search companies by name
        const companies = yield prisma_1.default.company.findMany({
            where: {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
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
    }
    catch (error) {
        console.error("Search companies error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.searchCompanies = searchCompanies;
// ==================== SEARCH CUSTOMERS ====================
const searchCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({
                message: "Search query is required",
            });
        }
        // Search customers only (includes both manual and connected customers)
        const customers = yield prisma_1.default.customer.findMany({
            where: {
                userId,
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search, mode: "insensitive" } },
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
    }
    catch (error) {
        console.error("Search customers error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.searchCustomers = searchCustomers;
// ==================== GET DEALER CUSTOMERS ====================
const getDealerCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { search, page = 1, limit = 50 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            userId: userId,
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { address: { contains: search, mode: "insensitive" } },
            ];
        }
        const [customers, total] = yield Promise.all([
            prisma_1.default.customer.findMany({
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
                    createdAt: true,
                },
            }),
            prisma_1.default.customer.count({ where }),
        ]);
        // For connected customers (farmerId set), use dealer-farmer account balance so "due" matches account page
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (dealer) {
            const farmerIds = customers.map((c) => c.farmerId).filter(Boolean);
            if (farmerIds.length > 0) {
                const accounts = yield dealerFarmerAccountService_1.DealerFarmerAccountService.getDealerAccounts(dealer.id);
                const balanceByFarmerId = new Map(accounts.map((a) => [a.farmerId, a.balance]));
                for (const c of customers) {
                    if (c.farmerId != null && balanceByFarmerId.has(c.farmerId)) {
                        c.balance = balanceByFarmerId.get(c.farmerId);
                    }
                }
            }
        }
        return res.status(200).json({
            success: true,
            data: customers,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get dealer customers error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerCustomers = getDealerCustomers;
// ==================== CREATE CUSTOMER ON-THE-FLY ====================
const createCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const existingCustomer = yield prisma_1.default.customer.findUnique({
            where: {
                userId_name: {
                    userId: userId,
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
        const customer = yield prisma_1.default.customer.create({
            data: {
                name,
                phone,
                address,
                category,
                userId: userId,
            },
        });
        return res.status(201).json({
            success: true,
            data: customer,
            message: "Customer created successfully",
        });
    }
    catch (error) {
        console.error("Create customer error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createCustomer = createCustomer;
// ==================== GET SALES STATISTICS ====================
const getSalesStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { startDate, endDate } = req.query;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const where = {
            dealerId: dealer.id,
        };
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        // Get totals
        const sales = yield prisma_1.default.dealerSale.findMany({
            where,
        });
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
        const totalPaid = sales.reduce((sum, sale) => sum + Number(sale.paidAmount), 0);
        const totalDue = sales.reduce((sum, sale) => sum + Number(sale.dueAmount || 0), 0);
        const creditSales = sales.filter((sale) => sale.isCredit).length;
        // Get top customers
        const topCustomers = yield prisma_1.default.dealerSale.groupBy({
            by: ["customerId"],
            where: Object.assign(Object.assign({}, where), { customerId: { not: null } }),
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
        const topCustomersWithDetails = yield Promise.all(topCustomers.map((tc) => __awaiter(void 0, void 0, void 0, function* () {
            const customer = yield prisma_1.default.customer.findUnique({
                where: { id: tc.customerId },
            });
            return {
                customer,
                totalAmount: tc._sum.totalAmount,
                totalSales: tc._count,
            };
        })));
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
    }
    catch (error) {
        console.error("Get sales statistics error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getSalesStatistics = getSalesStatistics;
