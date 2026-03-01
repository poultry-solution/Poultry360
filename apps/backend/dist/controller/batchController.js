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
exports.getBatchAnalytics = exports.getBatchClosureSummary = exports.updateBatchStatus = exports.closeBatch = exports.deleteBatch = exports.updateBatch = exports.createBatch = exports.getFarmBatches = exports.getBatchById = exports.getAllBatches = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const shared_types_1 = require("@myapp/shared-types");
// ==================== GET ALL BATCHES ====================
const getAllBatches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, farmId, status, search } = req.query;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {};
        // Role-based filtering
        if (currentUserRole === client_1.UserRole.MANAGER ||
            currentUserRole === client_1.UserRole.OWNER) {
            // Managers can only see batches from farms they manage or own
            where.farm = {
                OR: [
                    { ownerId: currentUserId },
                    { managers: { some: { id: currentUserId } } },
                ],
            };
        }
        if (farmId) {
            where.farmId = farmId;
        }
        if (status) {
            where.status = status;
        }
        if (search) {
            where.batchNumber = { contains: search, mode: "insensitive" };
        }
        const [batches, total] = yield Promise.all([
            prisma_1.default.batch.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    farm: {
                        select: {
                            id: true,
                            name: true,
                            capacity: true,
                            owner: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            expenses: true,
                            sales: true,
                            mortalities: true,
                            vaccinations: true,
                            feedConsumptions: true,
                            birdWeights: true,
                        },
                    },
                },
                orderBy: { startDate: "desc" },
            }),
            prisma_1.default.batch.count({ where }),
        ]);
        // Calculate current chicks for each batch
        const batchesWithCurrentChicks = yield Promise.all(batches.map((batch) => __awaiter(void 0, void 0, void 0, function* () {
            const totalMortality = yield prisma_1.default.mortality.aggregate({
                where: { batchId: batch.id },
                _sum: { count: true },
            });
            const currentChicks = batch.initialChicks - Number(totalMortality._sum.count || 0);
            return Object.assign(Object.assign({}, batch), { currentChicks: Math.max(0, currentChicks) });
        })));
        return res.json({
            success: true,
            data: batchesWithCurrentChicks,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get all batches error:", error);
        const message = (error === null || error === void 0 ? void 0 : error.message) || "Internal server error";
        return res.status(500).json({ message });
    }
});
exports.getAllBatches = getAllBatches;
// ==================== GET BATCH BY ID ====================
const getBatchById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const batch = yield prisma_1.default.batch.findUnique({
            where: { id },
            include: {
                farm: {
                    select: {
                        id: true,
                        name: true,
                        capacity: true,
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
                expenses: {
                    select: {
                        id: true,
                        date: true,
                        amount: true,
                        description: true,
                        quantity: true,
                        unitPrice: true,
                        category: {
                            select: {
                                id: true,
                                name: true,
                                type: true,
                            },
                        },
                    },
                    orderBy: { date: "desc" },
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
                },
                mortalities: {
                    select: {
                        id: true,
                        date: true,
                        count: true,
                        reason: true,
                        createdAt: true,
                    },
                    orderBy: { date: "desc" },
                },
                vaccinations: {
                    select: {
                        id: true,
                        vaccineName: true,
                        scheduledDate: true,
                        completedDate: true,
                        status: true,
                        notes: true,
                        createdAt: true,
                    },
                    orderBy: { scheduledDate: "asc" },
                },
                feedConsumptions: {
                    select: {
                        id: true,
                        date: true,
                        quantity: true,
                        feedType: true,
                        createdAt: true,
                    },
                    orderBy: { date: "desc" },
                },
                birdWeights: {
                    select: {
                        id: true,
                        date: true,
                        avgWeight: true,
                        sampleCount: true,
                        createdAt: true,
                    },
                    orderBy: { date: "desc" },
                },
                _count: {
                    select: {
                        expenses: true,
                        sales: true,
                        mortalities: true,
                        vaccinations: true,
                        feedConsumptions: true,
                        birdWeights: true,
                    },
                },
            },
        });
        if (!batch) {
            return res.status(404).json({ message: "Batch not found" });
        }
        // Check access permissions
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = batch.farm.owner.id === currentUserId ||
                batch.farm.managers.some((manager) => manager.id === currentUserId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Calculate current chicks
        const totalMortality = yield prisma_1.default.mortality.aggregate({
            where: { batchId: batch.id },
            _sum: { count: true },
        });
        const currentChicks = batch.initialChicks - Number(totalMortality._sum.count || 0);
        return res.json({
            success: true,
            data: Object.assign(Object.assign({}, batch), { currentChicks: Math.max(0, currentChicks) }),
        });
    }
    catch (error) {
        console.error("Get batch by ID error:", error);
        const message = (error === null || error === void 0 ? void 0 : error.message) || "Internal server error";
        return res.status(500).json({ message });
    }
});
exports.getBatchById = getBatchById;
// ==================== GET FARM BATCHES ====================
const getFarmBatches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { farmId } = req.params;
        const { status, page = 1, limit = 10 } = req.query;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const skip = (Number(page) - 1) * Number(limit);
        // Check if user has access to this farm
        const farm = yield prisma_1.default.farm.findUnique({
            where: { id: farmId },
            include: { managers: true },
        });
        if (!farm) {
            return res.status(404).json({ message: "Farm not found" });
        }
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = farm.ownerId === currentUserId ||
                farm.managers.some((manager) => manager.id === currentUserId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        const where = { farmId };
        if (status) {
            where.status = status;
        }
        const [batches, total] = yield Promise.all([
            prisma_1.default.batch.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    _count: {
                        select: {
                            expenses: true,
                            sales: true,
                            mortalities: true,
                            vaccinations: true,
                            feedConsumptions: true,
                            birdWeights: true,
                        },
                    },
                },
                orderBy: { startDate: "desc" },
            }),
            prisma_1.default.batch.count({ where }),
        ]);
        // Calculate current chicks for each batch
        const batchesWithCurrentChicks = yield Promise.all(batches.map((batch) => __awaiter(void 0, void 0, void 0, function* () {
            const totalMortality = yield prisma_1.default.mortality.aggregate({
                where: { batchId: batch.id },
                _sum: { count: true },
            });
            const currentChicks = batch.initialChicks - Number(totalMortality._sum.count || 0);
            return Object.assign(Object.assign({}, batch), { currentChicks: Math.max(0, currentChicks) });
        })));
        return res.json({
            success: true,
            data: batchesWithCurrentChicks,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get farm batches error:", error);
        const message = (error === null || error === void 0 ? void 0 : error.message) || "Internal server error";
        return res.status(500).json({ message });
    }
});
exports.getFarmBatches = getFarmBatches;
// ==================== CREATE BATCH ====================
const createBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Validate request body
        const { success, data, error } = shared_types_1.CreateBatchSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        // Check if farm exists and user has access
        const farm = yield prisma_1.default.farm.findUnique({
            where: { id: data.farmId },
            include: { managers: true },
        });
        if (!farm) {
            return res.status(404).json({ message: "Farm not found" });
        }
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = farm.ownerId === currentUserId ||
                farm.managers.some((manager) => manager.id === currentUserId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Check if batch number already exists for this farm
        const existingBatch = yield prisma_1.default.batch.findUnique({
            where: {
                farmId_batchNumber: {
                    farmId: data.farmId,
                    batchNumber: data.batchNumber,
                },
            },
        });
        if (existingBatch) {
            return res.status(400).json({
                message: "Batch number already exists for this farm",
            });
        }
        // Create batch and deduct chicks from inventory in a transaction (supports multiple allocations)
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const { chicksInventory } = data;
            if (!Array.isArray(chicksInventory) || chicksInventory.length === 0) {
                throw new Error("chicksInventory array with at least one allocation is required");
            }
            // Validate each allocation, ensure sufficient stock per item, and compute pricing
            const allocations = yield Promise.all(chicksInventory.map((alloc) => __awaiter(void 0, void 0, void 0, function* () {
                const item = yield tx.inventoryItem.findUnique({
                    where: { id: alloc.itemId },
                });
                if (!item) {
                    throw new Error(`Chicks inventory item not found: ${alloc.itemId}`);
                }
                const available = Number(item.currentStock);
                const requested = Number(alloc.quantity);
                if (available < requested) {
                    throw new Error(`Insufficient chicks stock for item ${alloc.itemId}. Available: ${available}, Required: ${requested}`);
                }
                const latestPurchase = yield tx.inventoryTransaction.findFirst({
                    where: { itemId: alloc.itemId, type: "PURCHASE" },
                    orderBy: { date: "desc" },
                });
                const unitPrice = latestPurchase
                    ? Number(latestPurchase.unitPrice)
                    : 0;
                const totalAmount = unitPrice * requested;
                return {
                    itemId: alloc.itemId,
                    requested,
                    unitPrice,
                    totalAmount,
                    notes: alloc.notes,
                    item,
                };
            })));
            const totalChicks = allocations.reduce((sum, a) => sum + a.requested, 0);
            // 1) Create batch using total requested chicks
            const batch = yield tx.batch.create({
                data: {
                    batchNumber: data.batchNumber,
                    startDate: new Date(data.startDate),
                    endDate: data.endDate ? new Date(data.endDate) : null,
                    status: data.status || client_1.BatchStatus.ACTIVE,
                    batchType: data.batchType || "BROILER",
                    initialChicks: totalChicks,
                    currentWeight: null, // Will be set when first weight is recorded
                    farmId: data.farmId,
                },
                include: {
                    farm: {
                        select: {
                            id: true,
                            name: true,
                            owner: {
                                select: { id: true, name: true },
                            },
                        },
                    },
                },
            });
            // 2) For each allocation: record usage, decrement stock, and create transaction
            const usages = [];
            for (const alloc of allocations) {
                const usage = yield tx.inventoryUsage.create({
                    data: {
                        date: new Date(),
                        quantity: alloc.requested,
                        unitPrice: alloc.unitPrice,
                        totalAmount: alloc.totalAmount,
                        notes: alloc.notes || `Allocated to batch ${batch.batchNumber}`,
                        itemId: alloc.itemId,
                        farmId: data.farmId,
                        batchId: batch.id,
                    },
                });
                const expense = yield tx.expense.create({
                    data: {
                        date: new Date(),
                        amount: alloc.totalAmount,
                        description: `Purchase of ${alloc.item.name} for batch creation ${batch.batchNumber}`,
                        quantity: alloc.requested,
                        unitPrice: alloc.unitPrice,
                        farmId: data.farmId, // No specific farm - this is general inventory
                        batchId: batch.id, // No specific batch - this is general inventory
                        categoryId: alloc.item.categoryId,
                    },
                });
                yield tx.inventoryItem.update({
                    where: { id: alloc.itemId },
                    data: { currentStock: { decrement: alloc.requested } },
                });
                yield tx.inventoryTransaction.create({
                    data: {
                        type: "USAGE",
                        quantity: alloc.requested,
                        unitPrice: alloc.unitPrice,
                        totalAmount: alloc.totalAmount,
                        date: new Date(),
                        description: `Chicks allocated to batch ${batch.batchNumber}`,
                        itemId: alloc.itemId,
                    },
                });
                usages.push(usage);
            }
            return { batch, usages };
        }));
        return res.status(201).json({
            success: true,
            data: Object.assign(Object.assign({}, result.batch), { inventoryUsages: result.usages }),
            message: "Batch created successfully",
        });
    }
    catch (error) {
        console.error("Create batch error:", error);
        const message = (error === null || error === void 0 ? void 0 : error.message) || "Internal server error";
        return res.status(500).json({ message });
    }
});
exports.createBatch = createBatch;
// ==================== UPDATE BATCH ====================
const updateBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Validate request body
        const { success, data, error } = shared_types_1.UpdateBatchSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        // Check if batch exists
        const existingBatch = yield prisma_1.default.batch.findUnique({
            where: { id },
            include: {
                farm: {
                    include: { managers: true },
                },
            },
        });
        if (!existingBatch) {
            return res.status(404).json({ message: "Batch not found" });
        }
        // Check access permissions
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = existingBatch.farm.ownerId === currentUserId ||
                existingBatch.farm.managers.some((manager) => manager.id === currentUserId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Check if batch number already exists for this farm (if being updated)
        if (data.batchNumber && data.batchNumber !== existingBatch.batchNumber) {
            const existingBatchNumber = yield prisma_1.default.batch.findUnique({
                where: {
                    farmId_batchNumber: {
                        farmId: existingBatch.farmId,
                        batchNumber: data.batchNumber,
                    },
                },
            });
            if (existingBatchNumber) {
                return res.status(400).json({
                    message: "Batch number already exists for this farm",
                });
            }
        }
        // Update batch
        const updateData = Object.assign({}, data);
        if (data.startDate) {
            updateData.startDate = new Date(data.startDate);
        }
        if (data.endDate !== undefined) {
            updateData.endDate = data.endDate ? new Date(data.endDate) : null;
        }
        const updatedBatch = yield prisma_1.default.batch.update({
            where: { id },
            data: updateData,
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
            },
        });
        return res.json({
            success: true,
            data: updatedBatch,
            message: "Batch updated successfully",
        });
    }
    catch (error) {
        console.error("Update batch error:", error);
        const message = (error === null || error === void 0 ? void 0 : error.message) || "Internal server error";
        return res.status(500).json({ message });
    }
});
exports.updateBatch = updateBatch;
// ==================== DELETE BATCH ====================
const deleteBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Check if batch exists
        const existingBatch = yield prisma_1.default.batch.findUnique({
            where: { id },
            include: {
                farm: {
                    include: { managers: true },
                },
                _count: {
                    select: {
                        expenses: true,
                        sales: true,
                        mortalities: true,
                        vaccinations: true,
                        feedConsumptions: true,
                        birdWeights: true,
                    },
                },
            },
        });
        if (!existingBatch) {
            return res.status(404).json({ message: "Batch not found" });
        }
        // Check access permissions
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = existingBatch.farm.ownerId === currentUserId ||
                existingBatch.farm.managers.some((manager) => manager.id === currentUserId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Identify initial, system-generated records to allow safe rollback
        const initialUsageNotes = `Allocated to batch ${existingBatch.batchNumber}`;
        const initialUsageDescContains = `batch ${existingBatch.batchNumber}`;
        const initialExpenseDescContains = `batch creation ${existingBatch.batchNumber}`;
        // Fetch all expenses linked to batch
        const expenses = yield prisma_1.default.expense.findMany({
            where: { batchId: id },
            select: { id: true, description: true },
        });
        const initialExpenseIds = expenses
            .filter((e) => (e.description || "").includes(initialExpenseDescContains))
            .map((e) => e.id);
        const nonInitialExpenseExists = expenses.length > initialExpenseIds.length;
        // Count usages for batch and fetch initial usages
        const [usageCount, initialUsages] = yield Promise.all([
            prisma_1.default.inventoryUsage.count({ where: { batchId: id } }),
            prisma_1.default.inventoryUsage.findMany({
                where: {
                    batchId: id,
                    OR: [
                        { notes: { contains: initialUsageNotes } },
                        // Fallback: usages created without the exact note, but still tied to batch
                        { notes: { equals: null } },
                    ],
                },
                select: { id: true, itemId: true, quantity: true },
            }),
        ]);
        const onlyInitialUsagesPresent = initialUsages.length === usageCount;
        // Block deletion if there is any non-initial data present
        if (existingBatch._count.sales > 0 ||
            existingBatch._count.mortalities > 0 ||
            existingBatch._count.vaccinations > 0 ||
            existingBatch._count.feedConsumptions > 0 ||
            existingBatch._count.birdWeights > 0 ||
            nonInitialExpenseExists ||
            (!onlyInitialUsagesPresent && usageCount > 0)) {
            return res.status(400).json({
                message: "Cannot delete batch: non-initial records exist. Remove related data first.",
            });
        }
        // Rollback initial allocations and delete batch atomically
        yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1) Restore inventory for initial usages
            for (const usage of initialUsages) {
                yield tx.inventoryItem.update({
                    where: { id: usage.itemId },
                    data: { currentStock: { increment: Number(usage.quantity || 0) } },
                });
            }
            if (initialUsages.length > 0) {
                yield tx.inventoryUsage.deleteMany({
                    where: { id: { in: initialUsages.map((u) => u.id) } },
                });
            }
            // 2) Remove related inventory transactions created for initial allocation
            yield tx.inventoryTransaction.deleteMany({
                where: {
                    type: "USAGE",
                    description: { contains: initialUsageDescContains },
                },
            });
            // 3) Remove initial expenses created during batch creation
            if (initialExpenseIds.length > 0) {
                yield tx.expense.deleteMany({
                    where: { id: { in: initialExpenseIds } },
                });
            }
            // 4) Finally, delete the batch
            yield tx.batch.delete({ where: { id } });
        }));
        return res.json({ success: true, message: "Batch deleted successfully" });
    }
    catch (error) {
        console.error("Delete batch error:", error);
        const message = (error === null || error === void 0 ? void 0 : error.message) || "Internal server error";
        return res.status(500).json({ message });
    }
});
exports.deleteBatch = deleteBatch;
// ==================== CLOSE BATCH ====================
const closeBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Validate request body
        const { success, data, error } = shared_types_1.CloseBatchSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        const { endDate, finalNotes } = data;
        // Check if batch exists and get current data
        const existingBatch = yield prisma_1.default.batch.findUnique({
            where: { id },
            include: {
                farm: {
                    include: { managers: true },
                },
            },
        });
        if (!existingBatch) {
            return res.status(404).json({ message: "Batch not found" });
        }
        // Check access permissions
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = existingBatch.farm.ownerId === currentUserId ||
                existingBatch.farm.managers.some((manager) => manager.id === currentUserId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Validate that batch is currently active
        if (existingBatch.status === client_1.BatchStatus.COMPLETED) {
            return res.status(400).json({ message: "Batch is already closed" });
        }
        // Validate end date
        const batchEndDate = endDate ? new Date(endDate) : new Date();
        if (batchEndDate < existingBatch.startDate) {
            return res.status(400).json({
                message: "End date cannot be before start date",
            });
        }
        // Calculate current statistics for the batch
        const [totalNonSaleMortality, totalSaleMortality, totalSales, totalExpenses, totalSalesQuantity, totalSalesWeight,] = yield Promise.all([
            // Non-sale mortality (natural deaths, diseases, etc.)
            prisma_1.default.mortality.aggregate({
                where: {
                    batchId: id,
                    reason: {
                        not: {
                            equals: "SLAUGHTERED_FOR_SALE",
                        },
                    },
                },
                _sum: { count: true },
            }),
            // Sale mortality (birds sold/slaughtered)
            prisma_1.default.mortality.aggregate({
                where: {
                    batchId: id,
                    reason: "SLAUGHTERED_FOR_SALE",
                },
                _sum: { count: true },
            }),
            prisma_1.default.sale.aggregate({
                where: { batchId: id },
                _sum: { amount: true, quantity: true, weight: true },
            }),
            prisma_1.default.expense.aggregate({
                where: { batchId: id },
                _sum: { amount: true },
            }),
            prisma_1.default.sale.count({
                where: { batchId: id },
            }),
            prisma_1.default.sale.aggregate({
                where: { batchId: id },
                _sum: { weight: true },
            }),
        ]);
        const totalDeadChicks = Number(totalNonSaleMortality._sum.count || 0);
        const totalSoldChicks = Number(totalSaleMortality._sum.count || 0);
        const remainingChicks = Math.max(0, existingBatch.initialChicks - totalDeadChicks - totalSoldChicks);
        // Perform batch closure in a transaction
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // If there are remaining chicks, record them as mortality (batch closure)
            if (remainingChicks > 0) {
                yield tx.mortality.create({
                    data: {
                        date: batchEndDate,
                        count: remainingChicks,
                        reason: "BATCH_CLOSURE",
                        batchId: id,
                    },
                });
            }
            // Update batch status and end date
            const closedBatch = yield tx.batch.update({
                where: { id },
                data: {
                    status: client_1.BatchStatus.COMPLETED,
                    endDate: batchEndDate,
                    notes: finalNotes
                        ? existingBatch.notes
                            ? `${existingBatch.notes}\n\nClosure Notes: ${finalNotes}`
                            : `Closure Notes: ${finalNotes}`
                        : existingBatch.notes,
                },
                include: {
                    farm: {
                        select: {
                            id: true,
                            name: true,
                            owner: {
                                select: { id: true, name: true },
                            },
                        },
                    },
                },
            });
            // Calculate final summary after accounting for remaining chicks
            const finalNaturalMortality = totalDeadChicks + remainingChicks;
            return {
                batch: closedBatch,
                summary: {
                    initialChicks: existingBatch.initialChicks,
                    finalChicks: 0, // All chicks are now accounted for (sold or dead)
                    soldChicks: totalSoldChicks,
                    naturalMortality: totalDeadChicks,
                    remainingAtClosure: remainingChicks,
                    totalMortality: finalNaturalMortality,
                    totalSales: Number(totalSales._sum.amount || 0),
                    totalExpenses: Number(totalExpenses._sum.amount || 0),
                    profit: Number(totalSales._sum.amount || 0) -
                        Number(totalExpenses._sum.amount || 0),
                    totalSalesQuantity: Number(totalSales._sum.quantity || 0),
                    totalSalesWeight: Number(totalSales._sum.weight || 0),
                    daysActive: Math.ceil((batchEndDate.getTime() - existingBatch.startDate.getTime()) /
                        (1000 * 60 * 60 * 24)),
                },
            };
        }));
        return res.json({
            success: true,
            data: result.batch,
            summary: result.summary,
            message: "Batch closed successfully",
        });
    }
    catch (error) {
        console.error("Close batch error:", error);
        const message = (error === null || error === void 0 ? void 0 : error.message) || "Internal server error";
        return res.status(500).json({ message });
    }
});
exports.closeBatch = closeBatch;
// ==================== UPDATE BATCH STATUS ====================
const updateBatchStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Validate status
        if (!Object.values(client_1.BatchStatus).includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        // Check if batch exists
        const existingBatch = yield prisma_1.default.batch.findUnique({
            where: { id },
            include: {
                farm: {
                    include: { managers: true },
                },
            },
        });
        if (!existingBatch) {
            return res.status(404).json({ message: "Batch not found" });
        }
        // Check access permissions
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = existingBatch.farm.ownerId === currentUserId ||
                existingBatch.farm.managers.some((manager) => manager.id === currentUserId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // If trying to close batch via status update, recommend using closeBatch endpoint
        if (status === client_1.BatchStatus.COMPLETED &&
            existingBatch.status === client_1.BatchStatus.ACTIVE) {
            return res.status(400).json({
                message: "To close a batch, please use the /close endpoint for proper batch closure process",
            });
        }
        // Update batch status
        const updatedBatch = yield prisma_1.default.batch.update({
            where: { id },
            data: { status },
            select: {
                id: true,
                batchNumber: true,
                status: true,
                startDate: true,
                endDate: true,
                updatedAt: true,
            },
        });
        return res.json({
            success: true,
            data: updatedBatch,
            message: "Batch status updated successfully",
        });
    }
    catch (error) {
        console.error("Update batch status error:", error);
        const message = (error === null || error === void 0 ? void 0 : error.message) || "Internal server error";
        return res.status(500).json({ message });
    }
});
exports.updateBatchStatus = updateBatchStatus;
// ==================== GET BATCH CLOSURE SUMMARY ====================
const getBatchClosureSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Check if batch exists and user has access
        const batch = yield prisma_1.default.batch.findUnique({
            where: { id },
            include: {
                farm: {
                    include: { managers: true },
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
        // Only provide closure summary for completed batches
        if (batch.status !== client_1.BatchStatus.COMPLETED) {
            return res.status(400).json({
                message: "Batch closure summary is only available for completed batches"
            });
        }
        // Get comprehensive closure data
        const [totalNonSaleMortality, totalSaleMortality, closureMortality, totalSales, totalExpenses, expensesByCategory,] = yield Promise.all([
            // Natural deaths (excluding sales and closure)
            prisma_1.default.mortality.aggregate({
                where: {
                    batchId: id,
                    reason: {
                        notIn: ["SLAUGHTERED_FOR_SALE", "BATCH_CLOSURE"],
                    },
                },
                _sum: { count: true },
            }),
            // Birds sold
            prisma_1.default.mortality.aggregate({
                where: {
                    batchId: id,
                    reason: "SLAUGHTERED_FOR_SALE",
                },
                _sum: { count: true },
            }),
            // Birds remaining at closure
            prisma_1.default.mortality.aggregate({
                where: {
                    batchId: id,
                    reason: "BATCH_CLOSURE",
                },
                _sum: { count: true },
            }),
            // Sales data
            prisma_1.default.sale.aggregate({
                where: { batchId: id },
                _sum: { amount: true, quantity: true, weight: true },
                _count: true,
            }),
            // Expenses data
            prisma_1.default.expense.aggregate({
                where: { batchId: id },
                _sum: { amount: true },
                _count: true,
            }),
            // Expenses by category
            prisma_1.default.expense.groupBy({
                by: ["categoryId"],
                where: { batchId: id },
                _sum: { amount: true },
                _count: { categoryId: true },
            }),
        ]);
        // Calculate final statistics
        const naturalDeaths = Number(totalNonSaleMortality._sum.count || 0);
        const birdsSold = Number(totalSaleMortality._sum.count || 0);
        const remainingAtClosure = Number(closureMortality._sum.count || 0);
        const totalMortality = naturalDeaths + remainingAtClosure;
        const revenue = Number(totalSales._sum.amount || 0);
        const expenses = Number(totalExpenses._sum.amount || 0);
        const profit = revenue - expenses;
        const daysActive = batch.endDate && batch.startDate
            ? Math.ceil((batch.endDate.getTime() - batch.startDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
        // Calculate efficiency metrics
        const mortalityRate = batch.initialChicks > 0
            ? (naturalDeaths / batch.initialChicks) * 100
            : 0;
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
        const roi = expenses > 0 ? (profit / expenses) * 100 : 0;
        const revenuePerBird = batch.initialChicks > 0 ? revenue / batch.initialChicks : 0;
        const costPerBird = batch.initialChicks > 0 ? expenses / batch.initialChicks : 0;
        const profitPerBird = batch.initialChicks > 0 ? profit / batch.initialChicks : 0;
        return res.json({
            success: true,
            data: {
                batchId: id,
                batchNumber: batch.batchNumber,
                status: batch.status,
                // Timeline
                startDate: batch.startDate,
                endDate: batch.endDate,
                daysActive,
                // Bird tracking
                initialChicks: batch.initialChicks,
                birdsSold,
                naturalDeaths,
                remainingAtClosure,
                totalMortality,
                mortalityRate,
                // Financial summary
                totalRevenue: revenue,
                totalExpenses: expenses,
                netProfit: profit,
                profitMargin,
                roi,
                // Per-bird metrics
                revenuePerBird,
                costPerBird,
                profitPerBird,
                // Sales details
                totalSalesCount: totalSales._count,
                totalSalesQuantity: Number(totalSales._sum.quantity || 0),
                totalSalesWeight: Number(totalSales._sum.weight || 0),
                // Expense breakdown
                totalExpenseCount: totalExpenses._count,
                expensesByCategory: yield Promise.all(expensesByCategory.map((cat) => __awaiter(void 0, void 0, void 0, function* () {
                    const category = yield prisma_1.default.category.findUnique({
                        where: { id: cat.categoryId },
                        select: { name: true, type: true },
                    });
                    return {
                        categoryId: cat.categoryId,
                        categoryName: (category === null || category === void 0 ? void 0 : category.name) || "Unknown",
                        amount: Number(cat._sum.amount || 0),
                        count: cat._count.categoryId,
                    };
                }))),
                // Closure notes
                closureNotes: batch.notes,
            },
        });
    }
    catch (error) {
        console.error("Get batch closure summary error:", error);
        const message = (error === null || error === void 0 ? void 0 : error.message) || "Internal server error";
        return res.status(500).json({ message });
    }
});
exports.getBatchClosureSummary = getBatchClosureSummary;
// ==================== GET BATCH ANALYTICS ====================
const getBatchAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Check if batch exists and user has access
        const batch = yield prisma_1.default.batch.findUnique({
            where: { id },
            include: {
                farm: {
                    include: { managers: true },
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
        const mortaility = yield prisma_1.default.mortality.findMany({
            where: {
                batchId: id,
            },
        });
        console.log(mortaility);
        // Get analytics data
        const [saleMortality, normalMortality, totalExpenses, totalSales, totalFeedConsumption, latestWeight,] = yield Promise.all([
            prisma_1.default.mortality.aggregate({
                where: {
                    batchId: id,
                    reason: {
                        equals: "SLAUGHTERED_FOR_SALE",
                    },
                },
                _sum: { count: true },
            }),
            prisma_1.default.mortality.aggregate({
                where: {
                    batchId: id,
                    reason: {
                        not: {
                            equals: "SLAUGHTERED_FOR_SALE",
                        },
                    },
                },
                _sum: { count: true },
            }),
            prisma_1.default.expense.aggregate({
                where: { batchId: id },
                _sum: { amount: true },
            }),
            prisma_1.default.sale.aggregate({
                where: { batchId: id },
                _sum: { amount: true, quantity: true, weight: true },
            }),
            prisma_1.default.feedConsumption.aggregate({
                where: { batchId: id },
                _sum: { quantity: true },
            }),
            prisma_1.default.birdWeight.findFirst({
                where: { batchId: id },
                orderBy: { date: "desc" },
                select: {
                    avgWeight: true,
                    sampleCount: true,
                    date: true,
                },
            }),
        ]);
        console.log(saleMortality);
        console.log(normalMortality);
        console.log(totalExpenses);
        console.log(totalSales);
        console.log(totalFeedConsumption);
        console.log(latestWeight);
        const currentChicks = batch.initialChicks -
            (Number(saleMortality._sum.count || 0) +
                Number(normalMortality._sum.count || 0));
        // donot include sale mortality here
        const mortalityRate = batch.initialChicks > 0
            ? (Number(normalMortality._sum.count || 0) / batch.initialChicks) * 100
            : 0;
        const totalExpensesAmount = Number(totalExpenses._sum.amount || 0);
        const totalSalesAmount = Number(totalSales._sum.amount || 0);
        const profit = totalSalesAmount - totalExpensesAmount;
        const profitMargin = totalSalesAmount > 0 ? (profit / totalSalesAmount) * 100 : 0;
        const totalFeedConsumptionAmount = Number(totalFeedConsumption._sum.quantity || 0);
        // Calculate FCR (Feed Conversion Ratio)
        // FCR = Total feed consumed / Total weight gained
        // Weight gained = (Current total weight) - (Initial total weight)
        // Initial total weight = Initial chicks * Initial average weight (assume 0.05kg per chick)
        const initialWeightPerChick = 0.05; // 50g average weight of day-old chick
        const initialTotalWeight = batch.initialChicks * initialWeightPerChick;
        const currentTotalWeight = latestWeight && currentChicks > 0
            ? Number(latestWeight.avgWeight) * currentChicks
            : 0;
        const totalWeightGained = Math.max(0, currentTotalWeight - initialTotalWeight);
        // FCR can only be calculated if we have both feed consumption and weight gain
        const fcr = (totalWeightGained > 0 && totalFeedConsumptionAmount > 0)
            ? totalFeedConsumptionAmount / totalWeightGained
            : null;
        // Calculate days active and batch age
        const daysActive = Math.ceil((new Date().getTime() - batch.startDate.getTime()) / (1000 * 60 * 60 * 24));
        // Calculate batch age
        const batchAge = Math.floor((Date.now() - new Date(batch.startDate).getTime()) / (1000 * 60 * 60 * 24));
        // also include total sales quantity
        const totalSalesQuantity = Number(totalSales._sum.quantity || 0);
        return res.json({
            success: true,
            data: {
                batchId: id,
                batchNumber: batch.batchNumber,
                currentChicks: Math.max(0, currentChicks),
                initialChicks: batch.initialChicks,
                totalMortality: Number(normalMortality._sum.count || 0),
                mortalityRate,
                totalExpenses: totalExpensesAmount,
                totalSales: totalSalesAmount,
                totalSalesQuantity,
                profit,
                profitMargin,
                totalFeedConsumption: totalFeedConsumptionAmount,
                currentAvgWeight: latestWeight ? Number(latestWeight.avgWeight) : null,
                // FCR (Feed Conversion Ratio) data
                fcr,
                fcrData: {
                    totalFeedConsumed: totalFeedConsumptionAmount,
                    initialTotalWeight,
                    currentTotalWeight,
                    totalWeightGained,
                    initialWeightPerChick,
                    status: fcr ? 'calculated' :
                        totalWeightGained <= 0 ? 'no_weight_data' :
                            totalFeedConsumptionAmount <= 0 ? 'no_feed_data' : 'insufficient_data',
                    message: fcr ? 'FCR calculated successfully' :
                        totalWeightGained <= 0 ? 'Weight data required - record bird weights to calculate FCR' :
                            totalFeedConsumptionAmount <= 0 ? 'Feed consumption data required - record feed usage to calculate FCR' :
                                'Insufficient data to calculate FCR',
                },
                daysActive,
                batchAge,
                status: batch.status,
                startDate: batch.startDate,
                endDate: batch.endDate,
            },
        });
    }
    catch (error) {
        console.error("Get batch analytics error:", error);
        const message = (error === null || error === void 0 ? void 0 : error.message) || "Internal server error";
        return res.status(500).json({ message });
    }
});
exports.getBatchAnalytics = getBatchAnalytics;
