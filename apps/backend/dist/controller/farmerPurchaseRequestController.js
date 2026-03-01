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
exports.rejectPurchaseRequest = exports.approvePurchaseRequest = exports.getDealerPurchaseRequestStats = exports.getDealerPurchaseRequestById = exports.getDealerPurchaseRequests = exports.getFarmerPurchaseRequestStats = exports.getFarmerPurchaseRequestById = exports.getFarmerPurchaseRequests = exports.getDealerCatalogProducts = exports.checkoutFarmerCart = exports.clearFarmerCart = exports.removeFarmerCartItem = exports.updateFarmerCartItem = exports.addItemToFarmerCart = exports.getFarmerCart = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const farmerPurchaseRequestService_1 = require("../services/farmerPurchaseRequestService");
// ==================== FARMER CART: GET ====================
const getFarmerCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { dealerId } = req.params;
        // Verify farmer-dealer connection
        const connection = yield prisma_1.default.dealerFarmer.findFirst({
            where: { farmerId: userId, dealerId, archivedByFarmer: false },
        });
        if (!connection) {
            return res.status(403).json({ message: "You are not connected to this dealer" });
        }
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { id: dealerId },
            select: { id: true, name: true, contact: true, address: true },
        });
        let cart = yield prisma_1.default.farmerCart.findUnique({
            where: { farmerId_dealerId: { farmerId: userId, dealerId } },
            include: { items: { include: { product: true } } },
        });
        if (!cart) {
            cart = yield prisma_1.default.farmerCart.create({
                data: { farmerId: userId, dealerId },
                include: { items: { include: { product: true } } },
            });
        }
        const total = cart.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
        return res.status(200).json({
            success: true,
            data: Object.assign(Object.assign({}, cart), { total, dealer }),
        });
    }
    catch (error) {
        console.error("Get farmer cart error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getFarmerCart = getFarmerCart;
// ==================== FARMER CART: ADD ITEM ====================
const addItemToFarmerCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { dealerId, productId, quantity, unit } = req.body;
        if (!dealerId || !productId || !quantity) {
            return res.status(400).json({ message: "dealerId, productId, and quantity are required" });
        }
        if (Number(quantity) <= 0) {
            return res.status(400).json({ message: "Quantity must be greater than 0" });
        }
        // Verify connection
        const connection = yield prisma_1.default.dealerFarmer.findFirst({
            where: { farmerId: userId, dealerId, archivedByFarmer: false },
        });
        if (!connection) {
            return res.status(403).json({ message: "You are not connected to this dealer" });
        }
        // Verify product belongs to this dealer
        const product = yield prisma_1.default.dealerProduct.findFirst({
            where: { id: productId, dealerId },
        });
        if (!product) {
            return res.status(404).json({ message: "Product not found or does not belong to this dealer" });
        }
        if (Number(product.currentStock) < Number(quantity)) {
            return res.status(400).json({
                message: `Insufficient stock. Available: ${product.currentStock} ${product.unit}`,
            });
        }
        // Get or create cart
        let cart = yield prisma_1.default.farmerCart.findUnique({
            where: { farmerId_dealerId: { farmerId: userId, dealerId } },
        });
        if (!cart) {
            cart = yield prisma_1.default.farmerCart.create({
                data: { farmerId: userId, dealerId },
            });
        }
        // Upsert cart item
        const existingItem = yield prisma_1.default.farmerCartItem.findUnique({
            where: { cartId_productId: { cartId: cart.id, productId } },
        });
        let cartItem;
        if (existingItem) {
            const newQty = Number(existingItem.quantity) + Number(quantity);
            if (Number(product.currentStock) < newQty) {
                return res.status(400).json({
                    message: `Insufficient stock. Available: ${product.currentStock} ${product.unit}, Already in cart: ${existingItem.quantity}`,
                });
            }
            cartItem = yield prisma_1.default.farmerCartItem.update({
                where: { id: existingItem.id },
                data: { quantity: new client_1.Prisma.Decimal(newQty) },
                include: { product: true },
            });
        }
        else {
            cartItem = yield prisma_1.default.farmerCartItem.create({
                data: {
                    cartId: cart.id,
                    productId,
                    quantity: new client_1.Prisma.Decimal(quantity),
                    unitPrice: product.sellingPrice,
                    unit: unit || null,
                },
                include: { product: true },
            });
        }
        return res.status(201).json({ success: true, data: cartItem, message: "Item added to cart" });
    }
    catch (error) {
        console.error("Add item to farmer cart error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.addItemToFarmerCart = addItemToFarmerCart;
// ==================== FARMER CART: UPDATE ITEM ====================
const updateFarmerCartItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { itemId } = req.params;
        const { quantity } = req.body;
        if (quantity === undefined || Number(quantity) <= 0) {
            return res.status(400).json({ message: "Quantity must be greater than 0" });
        }
        const cartItem = yield prisma_1.default.farmerCartItem.findUnique({
            where: { id: itemId },
            include: { cart: true, product: true },
        });
        if (!cartItem) {
            return res.status(404).json({ message: "Cart item not found" });
        }
        if (cartItem.cart.farmerId !== userId) {
            return res.status(403).json({ message: "Not your cart" });
        }
        if (Number(cartItem.product.currentStock) < Number(quantity)) {
            return res.status(400).json({
                message: `Insufficient stock. Available: ${cartItem.product.currentStock} ${cartItem.product.unit}`,
            });
        }
        const updated = yield prisma_1.default.farmerCartItem.update({
            where: { id: itemId },
            data: { quantity: new client_1.Prisma.Decimal(quantity) },
            include: { product: true },
        });
        return res.status(200).json({ success: true, data: updated });
    }
    catch (error) {
        console.error("Update farmer cart item error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateFarmerCartItem = updateFarmerCartItem;
// ==================== FARMER CART: REMOVE ITEM ====================
const removeFarmerCartItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { itemId } = req.params;
        const cartItem = yield prisma_1.default.farmerCartItem.findUnique({
            where: { id: itemId },
            include: { cart: true },
        });
        if (!cartItem) {
            return res.status(404).json({ message: "Cart item not found" });
        }
        if (cartItem.cart.farmerId !== userId) {
            return res.status(403).json({ message: "Not your cart" });
        }
        yield prisma_1.default.farmerCartItem.delete({ where: { id: itemId } });
        return res.status(200).json({ success: true, message: "Item removed from cart" });
    }
    catch (error) {
        console.error("Remove farmer cart item error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.removeFarmerCartItem = removeFarmerCartItem;
// ==================== FARMER CART: CLEAR ====================
const clearFarmerCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { dealerId } = req.params;
        const cart = yield prisma_1.default.farmerCart.findUnique({
            where: { farmerId_dealerId: { farmerId: userId, dealerId } },
        });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        yield prisma_1.default.farmerCartItem.deleteMany({ where: { cartId: cart.id } });
        return res.status(200).json({ success: true, message: "Cart cleared" });
    }
    catch (error) {
        console.error("Clear farmer cart error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.clearFarmerCart = clearFarmerCart;
// ==================== FARMER CART: CHECKOUT ====================
const checkoutFarmerCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { dealerId } = req.params;
        const { notes } = req.body;
        const cart = yield prisma_1.default.farmerCart.findUnique({
            where: { farmerId_dealerId: { farmerId: userId, dealerId } },
            include: { items: { include: { product: true } } },
        });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }
        // Validate stock
        for (const item of cart.items) {
            if (Number(item.product.currentStock) < Number(item.quantity)) {
                return res.status(400).json({
                    message: `Insufficient stock for ${item.product.name}. Available: ${item.product.currentStock} ${item.product.unit}`,
                });
            }
        }
        // Find customer record for this farmer-dealer pair
        // The dealer's ownerId is needed to find the customer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { id: dealerId },
            select: { ownerId: true },
        });
        if (!(dealer === null || dealer === void 0 ? void 0 : dealer.ownerId)) {
            return res.status(400).json({ message: "Dealer has no owner account" });
        }
        const customer = yield prisma_1.default.customer.findFirst({
            where: { farmerId: userId, userId: dealer.ownerId },
        });
        if (!customer) {
            return res.status(400).json({
                message: "No customer record found. Dealer connection may be incomplete.",
            });
        }
        const request = yield farmerPurchaseRequestService_1.FarmerPurchaseRequestService.createPurchaseRequest({
            farmerId: userId,
            dealerId,
            customerId: customer.id,
            items: cart.items.map((item) => ({
                productId: item.productId,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                unit: item.unit || undefined,
            })),
            notes: notes || undefined,
            date: new Date(),
        });
        // Clear cart
        yield prisma_1.default.farmerCartItem.deleteMany({ where: { cartId: cart.id } });
        return res.status(201).json({
            success: true,
            data: request,
            message: "Purchase request sent to dealer",
        });
    }
    catch (error) {
        console.error("Checkout farmer cart error:", error);
        return res.status(400).json({ message: error.message || "Internal server error" });
    }
});
exports.checkoutFarmerCart = checkoutFarmerCart;
// ==================== DEALER CATALOG FOR FARMERS ====================
const getDealerCatalogProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { dealerId } = req.params;
        const { page = 1, limit = 12, search, type } = req.query;
        // Verify connection
        const connection = yield prisma_1.default.dealerFarmer.findFirst({
            where: { farmerId: userId, dealerId, archivedByFarmer: false },
        });
        if (!connection) {
            return res.status(403).json({ message: "You are not connected to this dealer" });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            dealerId,
            currentStock: { gt: 0 },
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }
        if (type && type !== "ALL") {
            where.type = type;
        }
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { id: dealerId },
            select: { id: true, name: true, contact: true, address: true },
        });
        const [products, total] = yield Promise.all([
            prisma_1.default.dealerProduct.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { name: "asc" },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    type: true,
                    unit: true,
                    sellingPrice: true,
                    currentStock: true,
                    unitConversions: true,
                    companyProduct: {
                        select: {
                            unitConversions: true,
                        },
                    },
                },
            }),
            prisma_1.default.dealerProduct.count({ where }),
        ]);
        return res.status(200).json({
            success: true,
            data: products,
            dealer,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get dealer catalog error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerCatalogProducts = getDealerCatalogProducts;
// ==================== FARMER: LIST PURCHASE REQUESTS ====================
const getFarmerPurchaseRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { page = 1, limit = 10, status, dealerId } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = { farmerId: userId };
        if (status)
            where.status = status;
        if (dealerId)
            where.dealerId = dealerId;
        const [requests, total] = yield Promise.all([
            prisma_1.default.farmerPurchaseRequest.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
                include: {
                    dealer: { select: { id: true, name: true, contact: true, address: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, type: true, unit: true } },
                        },
                    },
                    dealerSale: { select: { id: true, invoiceNumber: true } },
                },
            }),
            prisma_1.default.farmerPurchaseRequest.count({ where }),
        ]);
        return res.status(200).json({
            success: true,
            data: requests,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get farmer purchase requests error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getFarmerPurchaseRequests = getFarmerPurchaseRequests;
// ==================== FARMER: GET PURCHASE REQUEST BY ID ====================
const getFarmerPurchaseRequestById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const request = yield prisma_1.default.farmerPurchaseRequest.findFirst({
            where: { id, farmerId: userId },
            include: {
                dealer: { select: { id: true, name: true, contact: true, address: true } },
                items: { include: { product: true } },
                dealerSale: {
                    select: { id: true, invoiceNumber: true, date: true, totalAmount: true, paidAmount: true, dueAmount: true },
                },
            },
        });
        if (!request) {
            return res.status(404).json({ message: "Purchase request not found" });
        }
        return res.status(200).json({ success: true, data: request });
    }
    catch (error) {
        console.error("Get farmer purchase request by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getFarmerPurchaseRequestById = getFarmerPurchaseRequestById;
// ==================== FARMER: PURCHASE REQUEST STATS ====================
const getFarmerPurchaseRequestStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const [pending, approved, rejected, totalCount] = yield Promise.all([
            prisma_1.default.farmerPurchaseRequest.count({ where: { farmerId: userId, status: "PENDING" } }),
            prisma_1.default.farmerPurchaseRequest.count({ where: { farmerId: userId, status: "APPROVED" } }),
            prisma_1.default.farmerPurchaseRequest.count({ where: { farmerId: userId, status: "REJECTED" } }),
            prisma_1.default.farmerPurchaseRequest.count({ where: { farmerId: userId } }),
        ]);
        const pendingRequests = yield prisma_1.default.farmerPurchaseRequest.findMany({
            where: { farmerId: userId, status: "PENDING" },
            select: { totalAmount: true },
        });
        const pendingAmount = pendingRequests.reduce((sum, r) => sum + Number(r.totalAmount), 0);
        return res.status(200).json({
            success: true,
            data: { pending, approved, rejected, total: totalCount, pendingAmount },
        });
    }
    catch (error) {
        console.error("Get farmer purchase request stats error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getFarmerPurchaseRequestStats = getFarmerPurchaseRequestStats;
// ==================== DEALER: LIST INCOMING PURCHASE REQUESTS ====================
const getDealerPurchaseRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { page = 1, limit = 10, status, farmerId } = req.query;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const where = { dealerId: dealer.id };
        if (status)
            where.status = status;
        if (farmerId)
            where.farmerId = farmerId;
        const [requests, total] = yield Promise.all([
            prisma_1.default.farmerPurchaseRequest.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
                include: {
                    farmer: { select: { id: true, name: true, phone: true, companyName: true } },
                    customer: { select: { id: true, name: true, phone: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, type: true, unit: true, sellingPrice: true, currentStock: true } },
                        },
                    },
                    dealerSale: { select: { id: true, invoiceNumber: true } },
                },
            }),
            prisma_1.default.farmerPurchaseRequest.count({ where }),
        ]);
        return res.status(200).json({
            success: true,
            data: requests,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get dealer purchase requests error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerPurchaseRequests = getDealerPurchaseRequests;
// ==================== DEALER: GET PURCHASE REQUEST BY ID ====================
const getDealerPurchaseRequestById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const request = yield prisma_1.default.farmerPurchaseRequest.findFirst({
            where: { id, dealerId: dealer.id },
            include: {
                farmer: { select: { id: true, name: true, phone: true, companyName: true } },
                customer: { select: { id: true, name: true, phone: true, address: true } },
                items: { include: { product: true } },
                dealerSale: {
                    select: { id: true, invoiceNumber: true, date: true, totalAmount: true, paidAmount: true, dueAmount: true },
                },
                dealer: { select: { id: true, name: true, contact: true, address: true } },
            },
        });
        if (!request) {
            return res.status(404).json({ message: "Purchase request not found" });
        }
        return res.status(200).json({ success: true, data: request });
    }
    catch (error) {
        console.error("Get dealer purchase request by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerPurchaseRequestById = getDealerPurchaseRequestById;
// ==================== DEALER: PURCHASE REQUEST STATS ====================
const getDealerPurchaseRequestStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const [pending, approved, rejected, totalCount] = yield Promise.all([
            prisma_1.default.farmerPurchaseRequest.count({ where: { dealerId: dealer.id, status: "PENDING" } }),
            prisma_1.default.farmerPurchaseRequest.count({ where: { dealerId: dealer.id, status: "APPROVED" } }),
            prisma_1.default.farmerPurchaseRequest.count({ where: { dealerId: dealer.id, status: "REJECTED" } }),
            prisma_1.default.farmerPurchaseRequest.count({ where: { dealerId: dealer.id } }),
        ]);
        const pendingRequests = yield prisma_1.default.farmerPurchaseRequest.findMany({
            where: { dealerId: dealer.id, status: "PENDING" },
            select: { totalAmount: true },
        });
        const pendingAmount = pendingRequests.reduce((sum, r) => sum + Number(r.totalAmount), 0);
        return res.status(200).json({
            success: true,
            data: { pending, approved, rejected, total: totalCount, pendingAmount },
        });
    }
    catch (error) {
        console.error("Get dealer purchase request stats error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerPurchaseRequestStats = getDealerPurchaseRequestStats;
// ==================== DEALER: APPROVE PURCHASE REQUEST ====================
const approvePurchaseRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { discount } = req.body || {};
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const discountParam = discount && discount.value > 0
            ? { type: discount.type, value: Number(discount.value) }
            : undefined;
        const sale = yield farmerPurchaseRequestService_1.FarmerPurchaseRequestService.approvePurchaseRequest({
            requestId: id,
            dealerId: dealer.id,
            discount: discountParam,
        });
        return res.status(200).json({
            success: true,
            data: sale,
            message: "Purchase request approved. Sale created.",
        });
    }
    catch (error) {
        console.error("Approve purchase request error:", error);
        return res.status(400).json({ message: error.message || "Internal server error" });
    }
});
exports.approvePurchaseRequest = approvePurchaseRequest;
// ==================== DEALER: REJECT PURCHASE REQUEST ====================
const rejectPurchaseRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { rejectionReason } = req.body;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const request = yield farmerPurchaseRequestService_1.FarmerPurchaseRequestService.rejectPurchaseRequest({
            requestId: id,
            dealerId: dealer.id,
            rejectionReason,
        });
        return res.status(200).json({
            success: true,
            data: request,
            message: "Purchase request rejected.",
        });
    }
    catch (error) {
        console.error("Reject purchase request error:", error);
        return res.status(400).json({ message: error.message || "Internal server error" });
    }
});
exports.rejectPurchaseRequest = rejectPurchaseRequest;
