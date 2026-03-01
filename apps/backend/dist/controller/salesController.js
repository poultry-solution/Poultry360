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
exports.getCustomerById = exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.createSalesCategory = exports.getCustomersForSales = exports.getSalesCategories = exports.getSaleStatistics = exports.addSalePayment = exports.deleteSale = exports.updateSale = exports.createSale = exports.getBatchSales = exports.getSaleById = exports.getAllSales = exports.getAllSalePayments = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const shared_types_1 = require("@myapp/shared-types");
// ==================== GET ALL SALE PAYMENTS ====================
const getAllSalePayments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search, farmId, customerId, startDate, endDate, } = req.query;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {};
        // Role-based filtering
        if (currentUserRole === client_1.UserRole.MANAGER) {
            // Managers can only see payments for sales from farms they manage
            const userFarms = yield prisma_1.default.farm.findMany({
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
        }
        else {
            // Owners see payments for their sales (implicitly via sale.farm.ownerId or sale.userId if applicable)
            // Assuming Sale model links to Farm/User, we constrain by Sale's farm owner or direct association
            // For simplicity in this app's context where sales are linked to farms owned by the user:
            where.sale = {
                farm: { ownerId: currentUserId },
            };
        }
        if (farmId) {
            where.sale = Object.assign(Object.assign({}, where.sale), { farmId: farmId });
        }
        if (customerId) {
            where.sale = Object.assign(Object.assign({}, where.sale), { customerId: customerId });
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = new Date(startDate);
            }
            if (endDate) {
                where.date.lte = new Date(endDate);
            }
        }
        if (search) {
            where.OR = [
                { description: { contains: search, mode: "insensitive" } },
                {
                    sale: {
                        customer: {
                            name: { contains: search, mode: "insensitive" },
                        },
                    },
                },
            ];
        }
        const [payments, total] = yield Promise.all([
            prisma_1.default.salePayment.findMany({
                where,
                skip,
                take: Number(limit),
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
            }),
            prisma_1.default.salePayment.count({ where }),
        ]);
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
    }
    catch (error) {
        console.error("Get all sale payments error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllSalePayments = getAllSalePayments;
// ==================== GET ALL SALES ====================
const category_1 = require("../utils/category");
const getAllSales = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search, farmId, batchId, customerId, isCredit, startDate, endDate, } = req.query;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {};
        // Role-based filtering
        if (currentUserRole === client_1.UserRole.MANAGER) {
            // Managers can only see sales from farms they manage
            const userFarms = yield prisma_1.default.farm.findMany({
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
            where.farmId = farmId;
        }
        if (batchId) {
            where.batchId = batchId;
        }
        if (customerId) {
            where.customerId = customerId;
        }
        if (isCredit !== undefined) {
            where.isCredit = isCredit === "true";
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = new Date(startDate);
            }
            if (endDate) {
                where.date.lte = new Date(endDate);
            }
        }
        if (search) {
            where.OR = [
                { description: { contains: search, mode: "insensitive" } },
                {
                    customer: {
                        name: { contains: search, mode: "insensitive" },
                    },
                },
                { farm: { name: { contains: search, mode: "insensitive" } } },
            ];
        }
        const [sales, total] = yield Promise.all([
            prisma_1.default.sale.findMany({
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
            prisma_1.default.sale.count({ where }),
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
    }
    catch (error) {
        console.error("Get all sales error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllSales = getAllSales;
// ==================== GET SALE BY ID ====================
const getSaleById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const sale = yield prisma_1.default.sale.findUnique({
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
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = ((_a = sale.farm) === null || _a === void 0 ? void 0 : _a.owner.id) === currentUserId ||
                (sale.farmId &&
                    (yield prisma_1.default.farm.findFirst({
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
    }
    catch (error) {
        console.error("Get sale by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getSaleById = getSaleById;
// ==================== GET SALES BY BATCH ====================
const getBatchSales = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { batchId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Check if batch exists and user has access
        const batch = yield prisma_1.default.batch.findUnique({
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
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = batch.farm.ownerId === currentUserId ||
                batch.farm.managers.some((manager) => manager.id === currentUserId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        const sales = yield prisma_1.default.sale.findMany({
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
    }
    catch (error) {
        console.error("Get batch sales error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getBatchSales = getBatchSales;
// ==================== CREATE SALE ====================
const createSale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Validate request body
        const { success, data, error } = shared_types_1.CreateSaleSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        const { date, amount, quantity, weight, unitPrice, description, isCredit = false, paidAmount = 0, farmId, batchId, customerId, itemType, eggCategory, } = data;
        // Ensure required categoryId is present (Prisma requires non-null string)
        const categoryId = yield (0, category_1.getSalesCategoryIdForItemType)(currentUserId, itemType);
        if (!categoryId) {
            return res.status(400).json({ message: "categoryId is required" });
        }
        // Validate farm access if provided
        if (farmId) {
            const farm = yield prisma_1.default.farm.findUnique({
                where: { id: farmId },
                include: {
                    owner: true,
                    managers: true,
                },
            });
            if (!farm) {
                return res.status(404).json({ message: "Farm not found" });
            }
            if (currentUserRole === client_1.UserRole.MANAGER) {
                const hasAccess = farm.ownerId === currentUserId ||
                    farm.managers.some((manager) => manager.id === currentUserId);
                if (!hasAccess) {
                    return res.status(403).json({ message: "Access denied to farm" });
                }
            }
        }
        // Validate batch access if provided
        let batch = null;
        if (batchId) {
            batch = yield prisma_1.default.batch.findUnique({
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
            if (currentUserRole === client_1.UserRole.MANAGER) {
                const hasAccess = batch.farm.ownerId === currentUserId ||
                    batch.farm.managers.some((manager) => manager.id === currentUserId);
                if (!hasAccess) {
                    return res.status(403).json({ message: "Access denied to batch" });
                }
            }
            // Validate egg category and inventory for EGGS sales
            if (itemType === client_1.SalesItemType.EGGS) {
                if (!eggCategory || !["LARGE", "MEDIUM", "SMALL"].includes(eggCategory)) {
                    return res.status(400).json({
                        message: "eggCategory (LARGE, MEDIUM, or SMALL) is required for egg sales",
                    });
                }
            }
            // Validate birds count for Chicken_Meat sales
            if (itemType === client_1.SalesItemType.Chicken_Meat) {
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
        const category = yield prisma_1.default.category.findFirst({
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
            customer = yield prisma_1.default.customer.findFirst({
                where: {
                    id: customerId,
                    userId: currentUserId,
                },
            });
            if (!customer) {
                return res.status(404).json({ message: "Customer not found" });
            }
        }
        else if (data.customerData) {
            // If customerData is provided, create or find existing customer
            const { name, phone, category, address } = data.customerData;
            if (!name || !phone) {
                return res.status(400).json({
                    message: "Customer name and phone are required when creating new customer",
                });
            }
            // Check if customer already exists
            customer = yield prisma_1.default.customer.findFirst({
                where: {
                    userId: currentUserId,
                    OR: [{ name: name }, { phone: phone }],
                },
            });
            if (customer) {
                // Use existing customer
                finalCustomerId = customer.id;
            }
            else {
                // Create new customer
                customer = yield prisma_1.default.customer.create({
                    data: {
                        name,
                        phone,
                        category: category || null,
                        address: address || null,
                        balance: 0, // Will be updated when sale is created
                        userId: currentUserId,
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
        if (itemType === client_1.SalesItemType.Chicken_Meat) {
            if (numericWeight === null || isNaN(numericWeight) || numericWeight <= 0) {
                return res.status(400).json({ message: "Weight is required and must be > 0 for Chicken_Meat sales" });
            }
        }
        else {
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
        // For EGGS sales: validate egg inventory (farmer = current user)
        if (itemType === client_1.SalesItemType.EGGS && eggCategory) {
            const inv = yield prisma_1.default.eggInventory.findUnique({
                where: {
                    userId_eggCategory: { userId: currentUserId, eggCategory: eggCategory },
                },
            });
            const available = (_a = inv === null || inv === void 0 ? void 0 : inv.quantity) !== null && _a !== void 0 ? _a : 0;
            if (available < numericQuantity) {
                return res.status(400).json({
                    message: `Insufficient egg inventory. Available (${eggCategory}): ${available}, requested: ${numericQuantity}`,
                });
            }
        }
        // Calculate due amount for credit sales
        const dueAmount = isCredit ? numericAmount - numericPaidAmount : 0;
        return yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Create the sale
            const sale = yield tx.sale.create({
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
                    eggCategory: itemType === client_1.SalesItemType.EGGS && eggCategory ? eggCategory : null,
                    farmId: farmId || null,
                    batchId: batchId || null,
                    categoryId: categoryId,
                    customerId: finalCustomerId || null,
                },
            });
            // 1b. Decrement egg inventory for EGGS sales
            if (itemType === client_1.SalesItemType.EGGS && eggCategory) {
                const inv = yield tx.eggInventory.findUnique({
                    where: {
                        userId_eggCategory: { userId: currentUserId, eggCategory: eggCategory },
                    },
                });
                if (inv) {
                    yield tx.eggInventory.update({
                        where: { id: inv.id },
                        data: { quantity: { decrement: numericQuantity } },
                    });
                }
            }
            // 2. Update customer balance if it's a credit sale
            if (isCredit && finalCustomerId && dueAmount > 0) {
                yield tx.customer.update({
                    where: { id: finalCustomerId },
                    data: {
                        balance: {
                            increment: dueAmount,
                        },
                    },
                });
                // Create customer transaction record
                yield tx.customerTransaction.create({
                    data: {
                        type: client_1.TransactionType.SALE,
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
                yield tx.salePayment.create({
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
            if (itemType === client_1.SalesItemType.Chicken_Meat && batchId && numericBirdsCount > 0) {
                console.log("numericBirdsCount:", numericBirdsCount);
                yield tx.mortality.create({
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
                    yield tx.birdWeight.create({
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
                    yield tx.batch.update({
                        where: { id: batchId },
                        data: {
                            currentWeight: avgWeight,
                        },
                    });
                    console.log("Weight record created and batch currentWeight updated");
                }
            }
            // 5. Fetch the complete sale with relationships
            const completeSale = yield tx.sale.findUnique({
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
        }));
    }
    catch (error) {
        console.error("Create sale error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createSale = createSale;
// ==================== UPDATE SALE ====================
const updateSale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Validate request body
        const { success, data, error } = shared_types_1.UpdateSaleSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        // Check if sale exists and user has access
        const existingSale = yield prisma_1.default.sale.findUnique({
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
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = ((_a = existingSale.farm) === null || _a === void 0 ? void 0 : _a.ownerId) === currentUserId ||
                ((_b = existingSale.farm) === null || _b === void 0 ? void 0 : _b.managers.some((manager) => manager.id === currentUserId));
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Validate category if being updated
        if (data.categoryId) {
            const category = yield prisma_1.default.category.findFirst({
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
            const customer = yield prisma_1.default.customer.findFirst({
                where: {
                    id: data.customerId,
                    userId: currentUserId,
                },
            });
            if (!customer) {
                return res.status(404).json({ message: "Customer not found" });
            }
        }
        return yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Calculate new due amount if amount or paidAmount is being updated
            let newDueAmount = Number(existingSale.dueAmount || 0);
            if (data.amount !== undefined || data.paidAmount !== undefined) {
                const newAmount = data.amount !== undefined
                    ? Number(data.amount)
                    : Number(existingSale.amount);
                const newPaidAmount = data.paidAmount !== undefined
                    ? Number(data.paidAmount)
                    : Number(existingSale.paidAmount);
                newDueAmount = newAmount - newPaidAmount;
            }
            // Update the sale
            const updatedSale = yield tx.sale.update({
                where: { id },
                data: Object.assign(Object.assign({}, data), { date: data.date ? new Date(data.date) : undefined, amount: data.amount ? Number(data.amount) : undefined, quantity: data.quantity ? Number(data.quantity) : undefined, weight: data.weight ? Number(data.weight) : undefined, unitPrice: data.unitPrice ? Number(data.unitPrice) : undefined, paidAmount: data.paidAmount ? Number(data.paidAmount) : undefined, dueAmount: newDueAmount > 0 ? newDueAmount : null }),
            });
            // Update customer balance if it's a credit sale and amount changed
            if (existingSale.isCredit &&
                existingSale.customerId &&
                (data.amount !== undefined || data.paidAmount !== undefined)) {
                const oldDueAmount = Number(existingSale.dueAmount || 0);
                const balanceChange = (newDueAmount || 0) - oldDueAmount;
                if (balanceChange !== 0) {
                    yield tx.customer.update({
                        where: { id: existingSale.customerId },
                        data: {
                            balance: {
                                increment: balanceChange,
                            },
                        },
                    });
                    // Create customer transaction record for the balance change
                    yield tx.customerTransaction.create({
                        data: {
                            type: client_1.TransactionType.ADJUSTMENT,
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
            const completeSale = yield tx.sale.findUnique({
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
        }));
    }
    catch (error) {
        console.error("Update sale error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateSale = updateSale;
// ==================== DELETE SALE ====================
const deleteSale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Check if sale exists and user has access
        const existingSale = yield prisma_1.default.sale.findUnique({
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
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = ((_a = existingSale.farm) === null || _a === void 0 ? void 0 : _a.ownerId) === currentUserId ||
                ((_b = existingSale.farm) === null || _b === void 0 ? void 0 : _b.managers.some((manager) => manager.id === currentUserId));
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        return yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // If it's a credit sale, reverse the customer balance
            if (existingSale.isCredit &&
                existingSale.customerId &&
                existingSale.dueAmount) {
                yield tx.customer.update({
                    where: { id: existingSale.customerId },
                    data: {
                        balance: {
                            decrement: Number(existingSale.dueAmount),
                        },
                    },
                });
                // Create customer transaction record for the reversal
                yield tx.customerTransaction.create({
                    data: {
                        type: client_1.TransactionType.ADJUSTMENT,
                        amount: Number(existingSale.dueAmount),
                        date: new Date(),
                        description: `Sale deletion: Reversed due amount`,
                        reference: existingSale.id,
                        customerId: existingSale.customerId,
                    },
                });
            }
            // Delete the sale (payments will be deleted automatically due to cascade)
            yield tx.sale.delete({
                where: { id },
            });
            // also delete the mortality created
            yield tx.mortality.deleteMany({
                where: {
                    saleId: existingSale.id,
                },
            });
            console.log("mortality deleted");
            return res.json({
                success: true,
                message: "Sale deleted successfully",
            });
        }));
    }
    catch (error) {
        console.error("Delete sale error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteSale = deleteSale;
// ==================== ADD SALE PAYMENT ====================
const addSalePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
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
        const sale = yield prisma_1.default.sale.findUnique({
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
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = ((_a = sale.farm) === null || _a === void 0 ? void 0 : _a.ownerId) === currentUserId ||
                ((_b = sale.farm) === null || _b === void 0 ? void 0 : _b.managers.some((manager) => manager.id === currentUserId));
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Calculate current due amount
        const totalPaid = sale.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const currentDue = Number(sale.amount) - totalPaid;
        if (Number(amount) > currentDue) {
            return res.status(400).json({
                message: `Payment amount (${amount}) cannot exceed due amount (${currentDue})`,
            });
        }
        return yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create payment record
            const payment = yield tx.salePayment.create({
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
            yield tx.sale.update({
                where: { id },
                data: {
                    paidAmount: newPaidAmount,
                    dueAmount: newDueAmount > 0 ? newDueAmount : null,
                },
            });
            // Update customer balance if it's a credit sale
            if (sale.isCredit && sale.customerId) {
                yield tx.customer.update({
                    where: { id: sale.customerId },
                    data: {
                        balance: {
                            decrement: Number(amount),
                        },
                    },
                });
                // Create customer transaction record
                yield tx.customerTransaction.create({
                    data: {
                        type: client_1.TransactionType.RECEIPT,
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
            const updatedSale = yield tx.sale.findUnique({
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
        }));
    }
    catch (error) {
        console.error("Add sale payment error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.addSalePayment = addSalePayment;
// ==================== GET SALE STATISTICS ====================
const getSaleStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { farmId, batchId, startDate, endDate } = req.query;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Build where clause
        const where = {};
        // Role-based filtering
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const userFarms = yield prisma_1.default.farm.findMany({
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
            where.farmId = farmId;
        }
        if (batchId) {
            where.batchId = batchId;
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = new Date(startDate);
            }
            if (endDate) {
                where.date.lte = new Date(endDate);
            }
        }
        const [totalSales, totalAmount, creditSales, creditAmount, paidAmount, dueAmount, currentMonthSales, currentMonthAmount,] = yield Promise.all([
            prisma_1.default.sale.count({ where }),
            prisma_1.default.sale.aggregate({
                where,
                _sum: { amount: true },
            }),
            prisma_1.default.sale.count({ where: Object.assign(Object.assign({}, where), { isCredit: true }) }),
            prisma_1.default.sale.aggregate({
                where: Object.assign(Object.assign({}, where), { isCredit: true }),
                _sum: { amount: true },
            }),
            prisma_1.default.sale.aggregate({
                where: Object.assign(Object.assign({}, where), { isCredit: true }),
                _sum: { paidAmount: true },
            }),
            prisma_1.default.sale.aggregate({
                where: Object.assign(Object.assign({}, where), { isCredit: true }),
                _sum: { dueAmount: true },
            }),
            prisma_1.default.sale.count({
                where: Object.assign(Object.assign({}, where), { date: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    } }),
            }),
            prisma_1.default.sale.aggregate({
                where: Object.assign(Object.assign({}, where), { date: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    } }),
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
                cashAmount: Number(totalAmount._sum.amount || 0) -
                    Number(creditAmount._sum.amount || 0),
            },
        });
    }
    catch (error) {
        console.error("Get sale statistics error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getSaleStatistics = getSaleStatistics;
// ==================== GET SALES CATEGORIES ====================
const getSalesCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        let categories = yield prisma_1.default.category.findMany({
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
            yield prisma_1.default.category.createMany({
                data: defaultCategories.map((cat) => ({
                    name: cat.name,
                    type: "SALES",
                    description: cat.description,
                    userId: currentUserId,
                })),
            });
            // Fetch the created categories
            categories = yield prisma_1.default.category.findMany({
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
    }
    catch (error) {
        console.error("Get sales categories error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getSalesCategories = getSalesCategories;
// ==================== GET CUSTOMERS FOR SALES ====================
const getCustomersForSales = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const { search } = req.query;
        const where = {
            userId: currentUserId,
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
            ];
        }
        const customers = yield prisma_1.default.customer.findMany({
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
    }
    catch (error) {
        console.error("Get customers for sales error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCustomersForSales = getCustomersForSales;
// ==================== CREATE SALES CATEGORY ====================
const createSalesCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Category name is required" });
        }
        // Check if category already exists
        const existingCategory = yield prisma_1.default.category.findFirst({
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
        const category = yield prisma_1.default.category.create({
            data: {
                name,
                type: "SALES",
                description: description || null,
                userId: currentUserId,
            },
        });
        return res.status(201).json({
            success: true,
            data: category,
            message: "Category created successfully",
        });
    }
    catch (error) {
        console.error("Create sales category error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createSalesCategory = createSalesCategory;
// ==================== CUSTOMER MANAGEMENT ====================
// Create customer
const createCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const { name, phone, category, address } = req.body;
        if (!name || !phone) {
            return res.status(400).json({
                message: "Customer name and phone are required"
            });
        }
        // Check if customer already exists
        const existingCustomer = yield prisma_1.default.customer.findFirst({
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
        // Create customer
        const customer = yield prisma_1.default.customer.create({
            data: {
                name,
                phone,
                category: category || null,
                address: address || null,
                balance: 0,
                userId: currentUserId,
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
// Update customer
const updateCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const { name, phone, category, address } = req.body;
        // Check if customer exists and belongs to user
        const existingCustomer = yield prisma_1.default.customer.findFirst({
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
            const conflictCustomer = yield prisma_1.default.customer.findFirst({
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
        const updatedCustomer = yield prisma_1.default.customer.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign({}, (name && { name })), (phone && { phone })), (category !== undefined && { category })), (address !== undefined && { address })),
        });
        return res.json({
            success: true,
            data: updatedCustomer,
            message: "Customer updated successfully",
        });
    }
    catch (error) {
        console.error("Update customer error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateCustomer = updateCustomer;
// Delete customer
const deleteCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        // Check if customer exists and belongs to user
        const existingCustomer = yield prisma_1.default.customer.findFirst({
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
        yield prisma_1.default.customer.delete({
            where: { id },
        });
        return res.json({
            success: true,
            message: "Customer deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete customer error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteCustomer = deleteCustomer;
// Get customer by ID
const getCustomerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const customer = yield prisma_1.default.customer.findFirst({
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
                    take: 10,
                },
            },
        });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        return res.json({
            success: true,
            data: customer,
        });
    }
    catch (error) {
        console.error("Get customer by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCustomerById = getCustomerById;
