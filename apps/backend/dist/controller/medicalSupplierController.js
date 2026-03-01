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
exports.getMedicalSupplierTransactions = exports.deleteMedicalSupplierTransaction = exports.getMedicalSupplierStatistics = exports.addMedicalSupplierTransaction = exports.deleteMedicalSupplier = exports.updateMedicalSupplier = exports.createMedicalSupplier = exports.getMedicalSupplierById = exports.getAllMedicalSuppliers = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const shared_types_1 = require("@myapp/shared-types");
const inventoryService_1 = require("../services/inventoryService");
// ==================== GET ALL MEDICAL SUPPLIERS ====================
const getAllMedicalSuppliers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {
            userId: currentUserId,
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { contact: { contains: search, mode: "insensitive" } },
                { address: { contains: search, mode: "insensitive" } },
            ];
        }
        const [suppliers, total] = yield Promise.all([
            prisma_1.default.medicineSupplier.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
            }),
            prisma_1.default.medicineSupplier.count({ where }),
        ]);
        // Calculate balance for each supplier
        const suppliersWithBalance = yield Promise.all(suppliers.map((supplier) => __awaiter(void 0, void 0, void 0, function* () {
            // Get transactions directly from entityTransaction table
            const transactions = yield prisma_1.default.entityTransaction.findMany({
                where: {
                    medicineSupplierId: supplier.id,
                },
                orderBy: { date: "desc" },
            });
            // Calculate balance: PURCHASE/ADJUSTMENT (positive) - PAYMENT/RECEIPT (negative)
            const balance = transactions.reduce((sum, transaction) => {
                if (transaction.type === "PURCHASE" ||
                    transaction.type === "ADJUSTMENT") {
                    return sum + Number(transaction.amount);
                }
                else if (transaction.type === "PAYMENT" ||
                    transaction.type === "RECEIPT") {
                    return sum - Number(transaction.amount);
                }
                return sum;
            }, 0);
            // Get recent transactions for this month
            const currentMonth = new Date();
            currentMonth.setDate(1);
            currentMonth.setHours(0, 0, 0, 0);
            const thisMonthTransactions = transactions.filter((t) => new Date(t.date) >= currentMonth);
            const thisMonthAmount = thisMonthTransactions
                .filter((t) => t.type === "PURCHASE")
                .reduce((sum, t) => sum + Number(t.amount), 0);
            return Object.assign(Object.assign({}, supplier), { balance: Math.max(0, balance), // Only show positive balance (amount due)
                thisMonthAmount, totalTransactions: transactions.length, recentTransactions: transactions.slice(0, 5) });
        })));
        return res.json({
            success: true,
            data: suppliersWithBalance,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get all medical suppliers error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllMedicalSuppliers = getAllMedicalSuppliers;
// ==================== GET MEDICAL SUPPLIER BY ID ====================
const getMedicalSupplierById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const supplier = yield prisma_1.default.medicineSupplier.findFirst({
            where: {
                id,
                userId: currentUserId,
            },
        });
        if (!supplier) {
            return res.status(404).json({ message: "Medical supplier not found" });
        }
        // Get transactions directly from entityTransaction table
        const transactions = yield prisma_1.default.entityTransaction.findMany({
            where: {
                medicineSupplierId: id,
            },
            orderBy: { date: "desc" },
        });
        const balance = transactions.reduce((sum, transaction) => {
            if (transaction.type === "PURCHASE" ||
                transaction.type === "ADJUSTMENT") {
                return sum + Number(transaction.amount);
            }
            else if (transaction.type === "PAYMENT" ||
                transaction.type === "RECEIPT") {
                return sum - Number(transaction.amount);
            }
            return sum;
        }, 0);
        // Get this month's transactions
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        const thisMonthTransactions = transactions.filter((t) => new Date(t.date) >= currentMonth);
        const thisMonthAmount = thisMonthTransactions
            .filter((t) => t.type === "PURCHASE")
            .reduce((sum, t) => sum + Number(t.amount), 0);
        // Group transactions by item for the table view
        const transactionGroups = transactions.reduce((groups, transaction) => {
            if (transaction.type === "PURCHASE") {
                const key = `${transaction.itemName || "Unknown Item"}_${transaction.id}`;
                if (!groups[key]) {
                    groups[key] = {
                        id: transaction.id,
                        itemName: transaction.itemName || "Unknown Item",
                        rate: Number(transaction.amount) / Number(transaction.quantity || 1),
                        quantity: 0,
                        totalAmount: 0,
                        amountPaid: 0,
                        amountDue: 0,
                        date: transaction.date,
                        dueDate: new Date(transaction.date.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from purchase
                        payments: [],
                    };
                }
                groups[key].quantity += transaction.quantity || 0;
                groups[key].totalAmount += Number(transaction.amount);
                groups[key].amountDue += Number(transaction.amount);
            }
            return groups;
        }, {});
        // 🔗 Apply payments to purchases using direct relationship only (no FIFO fallback)
        const purchaseGroups = Object.values(transactionGroups);
        const payments = transactions.filter((t) => t.type === "PAYMENT");
        for (const payment of payments) {
            const paymentAmount = Number(payment.amount);
            if (!payment.paymentToPurchaseId)
                continue;
            const targetGroup = purchaseGroups.find((group) => group.id === payment.paymentToPurchaseId);
            if (!targetGroup)
                continue;
            const currentDue = targetGroup.totalAmount - targetGroup.amountPaid;
            if (currentDue <= 0)
                continue;
            const paymentToApply = Math.min(paymentAmount, currentDue);
            targetGroup.amountPaid += paymentToApply;
            targetGroup.amountDue = Math.max(0, targetGroup.totalAmount - targetGroup.amountPaid);
            targetGroup.payments.push({
                amount: paymentToApply,
                date: payment.date,
                reference: payment.reference,
            });
        }
        const transactionTable = Object.values(transactionGroups);
        return res.json({
            success: true,
            data: Object.assign(Object.assign({}, supplier), { balance: Math.max(0, balance), thisMonthAmount, totalTransactions: transactions.length, transactionTable, summary: {
                    totalPurchases: transactions.filter((t) => t.type === "PURCHASE")
                        .length,
                    totalPayments: transactions.filter((t) => t.type === "PAYMENT")
                        .length,
                    outstandingAmount: Math.max(0, balance),
                    thisMonthPurchases: thisMonthTransactions.filter((t) => t.type === "PURCHASE").length,
                } }),
        });
    }
    catch (error) {
        console.error("Get medical supplier by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getMedicalSupplierById = getMedicalSupplierById;
// ==================== CREATE MEDICAL SUPPLIER ====================
const createMedicalSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        // Validate request body
        const { success, data, error } = shared_types_1.CreateMedicineSupplierSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        // Check if supplier with same name already exists for this user
        const existingSupplier = yield prisma_1.default.medicineSupplier.findFirst({
            where: {
                userId: currentUserId,
                name: data.name,
            },
        });
        if (existingSupplier) {
            return res
                .status(400)
                .json({ message: "Medical supplier with this name already exists" });
        }
        // Create supplier
        const supplier = yield prisma_1.default.medicineSupplier.create({
            data: {
                name: data.name,
                contact: data.contact,
                address: data.address,
                userId: currentUserId,
            },
        });
        return res.status(201).json({
            success: true,
            data: supplier,
            message: "Medical supplier created successfully",
        });
    }
    catch (error) {
        console.error("Create medical supplier error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createMedicalSupplier = createMedicalSupplier;
// ==================== UPDATE MEDICAL SUPPLIER ====================
const updateMedicalSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        // Validate request body
        const { success, data, error } = shared_types_1.UpdateMedicineSupplierSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        // Check if supplier exists and belongs to user
        const existingSupplier = yield prisma_1.default.medicineSupplier.findFirst({
            where: {
                id,
                userId: currentUserId,
            },
        });
        if (!existingSupplier) {
            return res.status(404).json({ message: "Medical supplier not found" });
        }
        // Check for name uniqueness if name is being updated
        if (data.name && data.name !== existingSupplier.name) {
            const nameExists = yield prisma_1.default.medicineSupplier.findFirst({
                where: {
                    userId: currentUserId,
                    name: data.name,
                    id: { not: id },
                },
            });
            if (nameExists) {
                return res
                    .status(400)
                    .json({ message: "Medical supplier with this name already exists" });
            }
        }
        // Update supplier
        const updatedSupplier = yield prisma_1.default.medicineSupplier.update({
            where: { id },
            data,
        });
        return res.json({
            success: true,
            data: updatedSupplier,
            message: "Medical supplier updated successfully",
        });
    }
    catch (error) {
        console.error("Update medical supplier error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateMedicalSupplier = updateMedicalSupplier;
// ==================== DELETE MEDICAL SUPPLIER ====================
const deleteMedicalSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        // Check if supplier exists and belongs to user
        const existingSupplier = yield prisma_1.default.medicineSupplier.findFirst({
            where: {
                id,
                userId: currentUserId,
            },
        });
        if (!existingSupplier) {
            return res.status(404).json({ message: "Medical supplier not found" });
        }
        // Check if supplier has transactions by directly querying entityTransaction table
        const transactionCount = yield prisma_1.default.entityTransaction.count({
            where: {
                medicineSupplierId: id,
            },
        });
        console.log("Existing supplier:", existingSupplier);
        console.log("Transaction count for supplier:", transactionCount);
        // Let's also check what transactions actually exist
        const actualTransactions = yield prisma_1.default.entityTransaction.findMany({
            where: {
                medicineSupplierId: id,
            },
            select: {
                id: true,
                type: true,
                amount: true,
                itemName: true,
                date: true,
            }
        });
        console.log("Actual transactions found:", actualTransactions);
        // Check if supplier has transactions
        if (transactionCount > 0) {
            return res.status(400).json({
                message: "Cannot delete medical supplier with existing transactions. Please remove all transactions first.",
            });
        }
        // Delete supplier
        yield prisma_1.default.medicineSupplier.delete({
            where: { id },
        });
        return res.json({
            success: true,
            message: "Medical supplier deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete medical supplier error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteMedicalSupplier = deleteMedicalSupplier;
// ==================== ADD MEDICAL SUPPLIER TRANSACTION ====================
const addMedicalSupplierTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        if (!currentUserId) {
            return res.status(400).json({
                message: "No User found in COntrooler",
            });
        }
        const { type, amount, quantity, itemName, date, description, reference, unitPrice, 
        // 🔗 NEW: support single-request initial payment and follow-up links
        paymentAmount, paymentDescription, paymentToPurchaseId, } = req.body;
        // Validate required fields
        if (!type || amount === undefined || amount === null || !date) {
            return res
                .status(400)
                .json({ message: "Type, amount, and date are required" });
        }
        // Validate transaction type
        if (!Object.values(client_1.TransactionType).includes(type)) {
            return res.status(400).json({ message: "Invalid transaction type" });
        }
        // Check if supplier exists and belongs to user
        const supplier = yield prisma_1.default.medicineSupplier.findFirst({
            where: {
                id,
                userId: currentUserId,
            },
        });
        if (!supplier) {
            return res.status(404).json({ message: "Medical supplier not found" });
        }
        // Normalize numbers and basic validations
        const numericAmount = Number(amount);
        const numericQuantity = quantity !== undefined && quantity !== null ? Number(quantity) : null;
        const numericPaymentAmount = paymentAmount !== undefined && paymentAmount !== null ? Number(paymentAmount) : null;
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ message: "Amount must be a positive number" });
        }
        let transactions = [];
        console.log("type", type);
        console.log("itemName", itemName);
        console.log("quantity", quantity);
        console.log("currentUserId", currentUserId);
        console.log(type, itemName, quantity, currentUserId);
        if (type === client_1.TransactionType.PURCHASE && itemName && numericQuantity !== null) {
            if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) {
                return res.status(400).json({ message: "Quantity must be a positive integer" });
            }
            if (numericPaymentAmount !== null && (!Number.isFinite(numericPaymentAmount) || numericPaymentAmount <= 0)) {
                return res.status(400).json({ message: "Initial payment must be a positive number" });
            }
            // 🔗 NEW: Use inventory service for purchases
            const result = yield inventoryService_1.InventoryService.processSupplierPurchase({
                medicineSupplierId: id,
                itemName,
                quantity: Number(numericQuantity),
                unitPrice: Number(unitPrice || numericAmount / Number(numericQuantity)),
                totalAmount: Number(numericAmount),
                date: new Date(date),
                description,
                reference,
                userId: currentUserId,
            });
            const purchaseTransaction = result.entityTransaction;
            transactions.push(purchaseTransaction);
            if (numericPaymentAmount && numericPaymentAmount > 0) {
                if (numericPaymentAmount > numericAmount) {
                    return res.status(400).json({ message: "Initial payment cannot exceed purchase amount" });
                }
                const paymentTxn = yield prisma_1.default.entityTransaction.create({
                    data: {
                        type: client_1.TransactionType.PAYMENT,
                        amount: Number(numericPaymentAmount),
                        quantity: null,
                        itemName: null,
                        date: new Date(date),
                        description: paymentDescription || `Initial payment for ${itemName}`,
                        reference: null,
                        medicineSupplierId: id,
                        entityType: "MEDICINE_SUPPLIER",
                        entityId: id,
                        paymentToPurchaseId: result.purchaseTransactionId,
                    },
                });
                transactions.push(paymentTxn);
            }
        }
        else {
            // PAYMENT validation and overpayment prevention
            if (type === client_1.TransactionType.PAYMENT) {
                if (!paymentToPurchaseId) {
                    return res.status(400).json({ message: "paymentToPurchaseId is required for PAYMENT transactions" });
                }
                const purchaseTxn = yield prisma_1.default.entityTransaction.findFirst({
                    where: { id: paymentToPurchaseId, medicineSupplierId: id, type: client_1.TransactionType.PURCHASE },
                    select: { id: true, amount: true },
                });
                if (!purchaseTxn) {
                    return res.status(400).json({ message: "Invalid paymentToPurchaseId: target purchase not found" });
                }
                const alreadyPaidAgg = yield prisma_1.default.entityTransaction.aggregate({
                    _sum: { amount: true },
                    where: { type: client_1.TransactionType.PAYMENT, paymentToPurchaseId, medicineSupplierId: id },
                });
                const alreadyPaid = Number(alreadyPaidAgg._sum.amount || 0);
                const purchaseTotal = Number(purchaseTxn.amount);
                const remainingDue = Math.max(0, purchaseTotal - alreadyPaid);
                if (numericAmount > remainingDue) {
                    return res.status(400).json({ message: `Payment exceeds remaining due. Remaining: ${remainingDue}` });
                }
            }
            const transaction = yield prisma_1.default.entityTransaction.create({
                data: {
                    type,
                    amount: Number(numericAmount),
                    quantity: numericQuantity ? Number(numericQuantity) : null,
                    itemName: itemName || null,
                    date: new Date(date),
                    description: description || null,
                    reference: reference || null,
                    medicineSupplierId: id,
                    entityType: "MEDICINE_SUPPLIER",
                    entityId: id,
                    paymentToPurchaseId: type === client_1.TransactionType.PAYMENT ? paymentToPurchaseId || null : null,
                },
            });
            transactions.push(transaction);
        }
        return res.status(201).json({
            success: true,
            data: transactions.length === 1 ? transactions[0] : transactions,
            message: transactions.length === 1 ? "Transaction added successfully" : `${transactions.length} transactions added successfully`,
        });
    }
    catch (error) {
        console.error("Add medical supplier transaction error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.addMedicalSupplierTransaction = addMedicalSupplierTransaction;
// ==================== GET MEDICAL SUPPLIER STATISTICS ====================
const getMedicalSupplierStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        // Get all suppliers for the user
        const suppliers = yield prisma_1.default.medicineSupplier.findMany({
            where: { userId: currentUserId },
        });
        // Calculate statistics
        let totalSuppliers = suppliers.length;
        let activeSuppliers = 0;
        let outstandingAmount = 0;
        let thisMonthAmount = 0;
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        for (const supplier of suppliers) {
            // Get transactions directly from entityTransaction table
            const transactions = yield prisma_1.default.entityTransaction.findMany({
                where: {
                    medicineSupplierId: supplier.id,
                },
            });
            const balance = transactions.reduce((sum, transaction) => {
                if (transaction.type === "PURCHASE" ||
                    transaction.type === "ADJUSTMENT") {
                    return sum + Number(transaction.amount);
                }
                else if (transaction.type === "PAYMENT" ||
                    transaction.type === "RECEIPT") {
                    return sum - Number(transaction.amount);
                }
                return sum;
            }, 0);
            if (balance > 0) {
                activeSuppliers++;
                outstandingAmount += balance;
            }
            // This month's purchases
            const thisMonthPurchases = transactions
                .filter((t) => t.type === "PURCHASE" && new Date(t.date) >= currentMonth)
                .reduce((sum, t) => sum + Number(t.amount), 0);
            thisMonthAmount += thisMonthPurchases;
        }
        return res.json({
            success: true,
            data: {
                totalSuppliers,
                activeSuppliers,
                outstandingAmount,
                thisMonthAmount,
            },
        });
    }
    catch (error) {
        console.error("Get medical supplier statistics error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getMedicalSupplierStatistics = getMedicalSupplierStatistics;
// ==================== DELETE MEDICAL SUPPLIER TRANSACTION ====================
const deleteMedicalSupplierTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, transactionId } = req.params;
        const { password } = req.body;
        const currentUserId = req.userId;
        // Verify password is provided
        if (!password) {
            return res.status(400).json({
                success: false,
                message: "Password confirmation is required for deletion"
            });
        }
        // Verify user's password
        const user = yield prisma_1.default.user.findUnique({
            where: { id: currentUserId },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const bcrypt = require('bcrypt');
        const isValidPassword = yield bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid password. Deletion cancelled."
            });
        }
        // Verify supplier belongs to user
        const supplier = yield prisma_1.default.medicineSupplier.findFirst({
            where: { id, userId: currentUserId },
        });
        if (!supplier) {
            return res.status(404).json({ message: "Medical supplier not found" });
        }
        // Verify transaction exists and belongs to supplier
        const txn = yield prisma_1.default.entityTransaction.findFirst({
            where: { id: transactionId, medicineSupplierId: id },
            select: {
                id: true,
                type: true,
                amount: true,
                quantity: true,
                date: true,
                description: true,
                inventoryItemId: true,
                expenseId: true,
            },
        });
        if (!txn) {
            return res.status(404).json({ message: "Transaction not found" });
        }
        console.log("🔍 Deleting transaction:", txn);
        console.log("🔍 Transaction type:", txn.type);
        // If this is a PURCHASE, ensure stock was not consumed and reverse inventory safely
        if (txn.type === 'PURCHASE') {
            if (!txn.inventoryItemId || !txn.quantity) {
                return res.status(400).json({ message: 'Purchase transaction missing inventory linkage; cannot safely delete.' });
            }
            const item = yield prisma_1.default.inventoryItem.findUnique({ where: { id: txn.inventoryItemId } });
            if (!item) {
                return res.status(404).json({ message: 'Linked inventory item not found' });
            }
            const currentStock = Number(item.currentStock || 0);
            const qty = Number(txn.quantity || 0);
            if (currentStock < qty) {
                return res.status(400).json({
                    message: `Cannot delete: ${qty} units from purchase have been partially consumed. Available stock: ${currentStock}. Remove usages first.`,
                });
            }
            yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
                // 🔗 Find and delete related PAYMENT transactions using direct relationship
                const relatedPaymentTxns = yield tx.entityTransaction.findMany({
                    where: {
                        medicineSupplierId: id,
                        type: 'PAYMENT',
                        paymentToPurchaseId: transactionId,
                    }
                });
                console.log("🔍 Found related payment transactions:", relatedPaymentTxns);
                // Delete related payment transactions
                for (const paymentTxn of relatedPaymentTxns) {
                    console.log("🗑️ Deleting related payment transaction:", paymentTxn.id);
                    yield tx.entityTransaction.delete({ where: { id: paymentTxn.id } });
                }
                // 2) Reduce inventory stock by the purchased quantity (reverse stock-in)
                yield tx.inventoryItem.update({
                    where: { id: txn.inventoryItemId },
                    data: { currentStock: { decrement: qty } },
                });
                // 3) Remove a matching inventoryTransaction (PURCHASE) if present
                const invTxn = yield tx.inventoryTransaction.findFirst({
                    where: {
                        itemId: txn.inventoryItemId,
                        type: 'PURCHASE',
                        quantity: qty,
                    },
                    orderBy: { date: 'desc' },
                });
                if (invTxn) {
                    yield tx.inventoryTransaction.delete({ where: { id: invTxn.id } });
                }
                // 4) Remove the linked expense if it exists
                if (txn.expenseId) {
                    yield tx.expense.delete({ where: { id: txn.expenseId } });
                }
                // 5) Finally, delete the entity transaction
                console.log("🔍 About to delete entity transaction:", transactionId);
                const deletedEntityTxn = yield tx.entityTransaction.delete({ where: { id: transactionId } });
                console.log("✅ Deleted entity transaction:", deletedEntityTxn);
                // 6) Optional cleanup: remove empty inventory item if fully orphaned
                const refreshedItem = yield tx.inventoryItem.findUnique({
                    where: { id: txn.inventoryItemId },
                    select: { id: true, currentStock: true },
                });
                if (refreshedItem && Number(refreshedItem.currentStock || 0) === 0) {
                    const [remainingInvTxns, remainingUsages] = yield Promise.all([
                        tx.inventoryTransaction.count({ where: { itemId: refreshedItem.id } }),
                        tx.inventoryUsage.count({ where: { itemId: refreshedItem.id } }),
                    ]);
                    if (remainingInvTxns === 0 && remainingUsages === 0) {
                        yield tx.inventoryItem.delete({ where: { id: refreshedItem.id } });
                    }
                }
            }));
        }
        else {
            // Non-purchase: no inventory side effects, but still wrap in transaction for consistency
            console.log("🔍 Deleting non-purchase transaction:", transactionId);
            yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
                const deletedTxn = yield tx.entityTransaction.delete({ where: { id: transactionId } });
                console.log("✅ Successfully deleted transaction:", deletedTxn);
            }));
        }
        // Verify transaction was actually deleted
        const verifyDeleted = yield prisma_1.default.entityTransaction.findFirst({
            where: { id: transactionId },
        });
        if (verifyDeleted) {
            console.error("❌ Transaction still exists after deletion attempt:", verifyDeleted);
            return res.status(500).json({ message: "Transaction deletion failed" });
        }
        else {
            console.log("✅ Transaction successfully deleted and verified");
        }
        // Also check if there are any remaining transactions for this supplier
        const remainingTransactions = yield prisma_1.default.entityTransaction.findMany({
            where: { medicineSupplierId: id },
        });
        console.log("🔍 Remaining transactions for supplier after deletion:", remainingTransactions);
        return res.json({ success: true, message: "Transaction deleted successfully" });
    }
    catch (error) {
        console.error("Delete medical supplier transaction error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteMedicalSupplierTransaction = deleteMedicalSupplierTransaction;
// ==================== GET MEDICAL SUPPLIER TRANSACTIONS ====================
const getMedicalSupplierTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, type, startDate, endDate } = req.query;
        const currentUserId = req.userId;
        const skip = (Number(page) - 1) * Number(limit);
        // Check if supplier exists and belongs to user
        const supplier = yield prisma_1.default.medicineSupplier.findFirst({
            where: {
                id,
                userId: currentUserId,
            },
        });
        if (!supplier) {
            return res.status(404).json({ message: "Medical supplier not found" });
        }
        // Build where clause
        const where = {
            medicineSupplierId: id, // ✅ Use proper foreign key
        };
        if (type) {
            where.type = type;
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
        const [transactions, total] = yield Promise.all([
            prisma_1.default.entityTransaction.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { date: "desc" },
            }),
            prisma_1.default.entityTransaction.count({ where }),
        ]);
        return res.json({
            success: true,
            data: transactions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get medical supplier transactions error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getMedicalSupplierTransactions = getMedicalSupplierTransactions;
