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
exports.checkoutCart = exports.clearCart = exports.removeCartItem = exports.updateCartItem = exports.addItemToCart = exports.getDealerCart = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const consignmentService_1 = require("../services/consignmentService");
// ==================== GET OR CREATE CART FOR COMPANY ====================
const getDealerCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { companyId } = req.params;
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Verify dealer has connection to company
        const connection = yield prisma_1.default.dealerCompany.findUnique({
            where: {
                dealerId_companyId: {
                    dealerId: dealer.id,
                    companyId: companyId,
                },
                archivedByDealer: false,
            },
        });
        if (!connection) {
            return res.status(403).json({
                message: "You are not connected to this company",
            });
        }
        // Get or create cart
        let cart = yield prisma_1.default.dealerCart.findUnique({
            where: {
                dealerId_companyId: {
                    dealerId: dealer.id,
                    companyId: companyId,
                },
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                    },
                },
            },
        });
        if (!cart) {
            cart = yield prisma_1.default.dealerCart.create({
                data: {
                    dealerId: dealer.id,
                    companyId: companyId,
                },
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    company: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                        },
                    },
                },
            });
        }
        // Calculate cart total
        const cartTotal = cart.items.reduce((sum, item) => {
            return sum + Number(item.quantity) * Number(item.unitPrice);
        }, 0);
        return res.status(200).json({
            success: true,
            data: Object.assign(Object.assign({}, cart), { total: cartTotal }),
        });
    }
    catch (error) {
        console.error("Get dealer cart error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerCart = getDealerCart;
// ==================== ADD ITEM TO CART ====================
const addItemToCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { companyId, productId, quantity } = req.body;
        // Validation
        if (!companyId || !productId || !quantity) {
            return res.status(400).json({
                message: "Company ID, product ID, and quantity are required",
            });
        }
        if (Number(quantity) <= 0) {
            return res.status(400).json({
                message: "Quantity must be greater than 0",
            });
        }
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Verify dealer has connection to company
        const connection = yield prisma_1.default.dealerCompany.findUnique({
            where: {
                dealerId_companyId: {
                    dealerId: dealer.id,
                    companyId: companyId,
                },
                archivedByDealer: false,
            },
        });
        if (!connection) {
            return res.status(403).json({
                message: "You are not connected to this company",
            });
        }
        // Get product and verify it belongs to the company
        const company = yield prisma_1.default.company.findUnique({
            where: { id: companyId },
            select: { ownerId: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const product = yield prisma_1.default.product.findFirst({
            where: {
                id: productId,
                supplierId: company.ownerId,
            },
        });
        if (!product) {
            return res.status(404).json({
                message: "Product not found or does not belong to this company",
            });
        }
        // Check stock availability
        if (Number(product.currentStock) < Number(quantity)) {
            return res.status(400).json({
                message: `Insufficient stock. Available: ${product.currentStock} ${product.unit}`,
            });
        }
        // Get or create cart
        let cart = yield prisma_1.default.dealerCart.findUnique({
            where: {
                dealerId_companyId: {
                    dealerId: dealer.id,
                    companyId: companyId,
                },
            },
        });
        if (!cart) {
            cart = yield prisma_1.default.dealerCart.create({
                data: {
                    dealerId: dealer.id,
                    companyId: companyId,
                },
            });
        }
        // Check if item already exists in cart
        const existingItem = yield prisma_1.default.dealerCartItem.findUnique({
            where: {
                cartId_productId: {
                    cartId: cart.id,
                    productId: productId,
                },
            },
        });
        let cartItem;
        if (existingItem) {
            // Update quantity
            const newQuantity = Number(existingItem.quantity) + Number(quantity);
            // Check stock for new total quantity
            if (Number(product.currentStock) < newQuantity) {
                return res.status(400).json({
                    message: `Insufficient stock. Available: ${product.currentStock} ${product.unit}, Already in cart: ${existingItem.quantity} ${product.unit}`,
                });
            }
            cartItem = yield prisma_1.default.dealerCartItem.update({
                where: { id: existingItem.id },
                data: {
                    quantity: new client_1.Prisma.Decimal(newQuantity),
                },
                include: {
                    product: true,
                },
            });
        }
        else {
            // Create new cart item
            cartItem = yield prisma_1.default.dealerCartItem.create({
                data: {
                    cartId: cart.id,
                    productId: productId,
                    quantity: new client_1.Prisma.Decimal(quantity),
                    unitPrice: product.unitSellingPrice, // Freeze current price
                },
                include: {
                    product: true,
                },
            });
        }
        return res.status(201).json({
            success: true,
            data: cartItem,
            message: "Item added to cart successfully",
        });
    }
    catch (error) {
        console.error("Add item to cart error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.addItemToCart = addItemToCart;
// ==================== UPDATE CART ITEM QUANTITY ====================
const updateCartItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { itemId } = req.params;
        const { quantity } = req.body;
        // Validation
        if (quantity === undefined) {
            return res.status(400).json({
                message: "Quantity is required",
            });
        }
        if (Number(quantity) <= 0) {
            return res.status(400).json({
                message: "Quantity must be greater than 0",
            });
        }
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Get cart item and verify ownership
        const cartItem = yield prisma_1.default.dealerCartItem.findUnique({
            where: { id: itemId },
            include: {
                cart: true,
                product: true,
            },
        });
        if (!cartItem) {
            return res.status(404).json({ message: "Cart item not found" });
        }
        if (cartItem.cart.dealerId !== dealer.id) {
            return res.status(403).json({
                message: "You do not have permission to modify this cart",
            });
        }
        // Check stock availability
        if (Number(cartItem.product.currentStock) < Number(quantity)) {
            return res.status(400).json({
                message: `Insufficient stock. Available: ${cartItem.product.currentStock} ${cartItem.product.unit}`,
            });
        }
        // Update quantity
        const updatedItem = yield prisma_1.default.dealerCartItem.update({
            where: { id: itemId },
            data: {
                quantity: new client_1.Prisma.Decimal(quantity),
            },
            include: {
                product: true,
            },
        });
        return res.status(200).json({
            success: true,
            data: updatedItem,
            message: "Cart item updated successfully",
        });
    }
    catch (error) {
        console.error("Update cart item error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateCartItem = updateCartItem;
// ==================== REMOVE CART ITEM ====================
const removeCartItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { itemId } = req.params;
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Get cart item and verify ownership
        const cartItem = yield prisma_1.default.dealerCartItem.findUnique({
            where: { id: itemId },
            include: {
                cart: true,
            },
        });
        if (!cartItem) {
            return res.status(404).json({ message: "Cart item not found" });
        }
        if (cartItem.cart.dealerId !== dealer.id) {
            return res.status(403).json({
                message: "You do not have permission to modify this cart",
            });
        }
        // Delete item
        yield prisma_1.default.dealerCartItem.delete({
            where: { id: itemId },
        });
        return res.status(200).json({
            success: true,
            message: "Item removed from cart successfully",
        });
    }
    catch (error) {
        console.error("Remove cart item error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.removeCartItem = removeCartItem;
// ==================== CLEAR CART ====================
const clearCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { companyId } = req.params;
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Get cart
        const cart = yield prisma_1.default.dealerCart.findUnique({
            where: {
                dealerId_companyId: {
                    dealerId: dealer.id,
                    companyId: companyId,
                },
            },
        });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        // Delete all items in cart
        yield prisma_1.default.dealerCartItem.deleteMany({
            where: { cartId: cart.id },
        });
        return res.status(200).json({
            success: true,
            message: "Cart cleared successfully",
        });
    }
    catch (error) {
        console.error("Clear cart error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.clearCart = clearCart;
// ==================== CHECKOUT CART ====================
const checkoutCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { companyId } = req.params;
        const { notes } = req.body;
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Get cart with items
        const cart = yield prisma_1.default.dealerCart.findUnique({
            where: {
                dealerId_companyId: {
                    dealerId: dealer.id,
                    companyId: companyId,
                },
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        ownerId: true,
                        name: true,
                    },
                },
            },
        });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        if (cart.items.length === 0) {
            return res.status(400).json({
                message: "Cart is empty. Add items before checkout",
            });
        }
        // Validate stock availability for all items
        for (const item of cart.items) {
            if (Number(item.product.currentStock) < Number(item.quantity)) {
                return res.status(400).json({
                    message: `Insufficient stock for ${item.product.name}. Available: ${item.product.currentStock} ${item.product.unit}`,
                });
            }
        }
        // Create consignment using ConsignmentService
        // Dealer is ordering from company, so direction is DEALER_TO_COMPANY
        // fromCompanyId = company that will provide products (source)
        // fromDealerId = dealer who is requesting
        // toDealerId = dealer who will receive (same as requester)
        // Company will need to accept/approve this order
        const consignment = yield consignmentService_1.ConsignmentService.createConsignment({
            direction: client_1.ConsignmentDirection.DEALER_TO_COMPANY,
            fromDealerId: dealer.id,
            fromCompanyId: cart.company.id,
            toDealerId: dealer.id,
            requestedById: userId,
            items: cart.items.map((item) => ({
                companyProductId: item.productId,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
            })),
            notes: notes || `Order from catalog - ${cart.company.name}`,
        });
        // Clear cart after successful consignment creation
        yield prisma_1.default.dealerCartItem.deleteMany({
            where: { cartId: cart.id },
        });
        return res.status(201).json({
            success: true,
            data: consignment,
            message: "Order placed successfully! Consignment created",
        });
    }
    catch (error) {
        console.error("Checkout cart error:", error);
        return res.status(500).json({
            message: error.message || "Internal server error",
        });
    }
});
exports.checkoutCart = checkoutCart;
