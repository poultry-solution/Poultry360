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
exports.adjustProductStock = exports.getInventorySummary = exports.deleteDealerProduct = exports.updateDealerProduct = exports.getDealerProductById = exports.getDealerProducts = exports.createDealerProduct = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
// ==================== CREATE DEALER PRODUCT ====================
const createDealerProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dealerId = req.userId; // Assuming dealer is logged in with their user ID
        const { name, description, type, unit, costPrice, sellingPrice, currentStock, minStock, sku, companyProductId, unitConversions, } = req.body;
        // Validation
        if (!name || !type || !unit || !costPrice || !sellingPrice) {
            return res.status(400).json({
                message: "Name, type, unit, cost price, and selling price are required",
            });
        }
        // Get the dealer record to get dealerId
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: dealerId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Check if product with same name, cost price and selling price already exists
        const existingProduct = yield prisma_1.default.dealerProduct.findFirst({
            where: {
                dealerId: dealer.id,
                name,
                costPrice,
                sellingPrice,
            },
        });
        if (existingProduct) {
            return res.status(400).json({
                message: "Product with this name, cost price, and selling price already exists",
            });
        }
        // Create product with optional unit conversions
        const product = yield prisma_1.default.dealerProduct.create({
            data: Object.assign({ name,
                description,
                type,
                unit, costPrice: new client_1.Prisma.Decimal(costPrice), sellingPrice: new client_1.Prisma.Decimal(sellingPrice), currentStock: currentStock ? new client_1.Prisma.Decimal(currentStock) : new client_1.Prisma.Decimal(0), minStock: minStock ? new client_1.Prisma.Decimal(minStock) : null, sku, dealerId: dealer.id, companyProductId }, (unitConversions && unitConversions.length > 0 && {
                unitConversions: {
                    create: unitConversions.map((uc) => ({
                        unitName: uc.unitName,
                        conversionFactor: new client_1.Prisma.Decimal(uc.conversionFactor),
                    })),
                },
            })),
            include: { unitConversions: true },
        });
        return res.status(201).json({
            success: true,
            data: product,
            message: "Product created successfully",
        });
    }
    catch (error) {
        console.error("Create dealer product error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createDealerProduct = createDealerProduct;
// ==================== GET ALL DEALER PRODUCTS ====================
const getDealerProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dealerId = req.userId;
        const { page = 1, limit = 10, search, type, lowStock } = req.query;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: dealerId },
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
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
            ];
        }
        if (type) {
            where.type = type;
        }
        if (lowStock === "true") {
            where.currentStock = {
                lte: prisma_1.default.dealerProduct.fields.minStock,
            };
        }
        const [products, total] = yield Promise.all([
            prisma_1.default.dealerProduct.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
                include: {
                    companyProduct: {
                        include: { unitConversions: true },
                    },
                    unitConversions: true,
                },
            }),
            prisma_1.default.dealerProduct.count({ where }),
        ]);
        return res.status(200).json({
            success: true,
            data: products,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get dealer products error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerProducts = getDealerProducts;
// ==================== GET DEALER PRODUCT BY ID ====================
const getDealerProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dealerId = req.userId;
        const { id } = req.params;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: dealerId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const product = yield prisma_1.default.dealerProduct.findFirst({
            where: {
                id,
                dealerId: dealer.id,
            },
            include: {
                companyProduct: {
                    include: { unitConversions: true },
                },
                transactions: {
                    orderBy: { date: "desc" },
                    take: 10,
                },
                unitConversions: true,
            },
        });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        return res.status(200).json({
            success: true,
            data: product,
        });
    }
    catch (error) {
        console.error("Get dealer product by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerProductById = getDealerProductById;
// ==================== UPDATE DEALER PRODUCT ====================
const updateDealerProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dealerId = req.userId;
        const { id } = req.params;
        const { name, description, type, unit, costPrice, sellingPrice, minStock, sku, unitConversions, } = req.body;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: dealerId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Check if product exists and belongs to dealer
        const existingProduct = yield prisma_1.default.dealerProduct.findFirst({
            where: {
                id,
                dealerId: dealer.id,
            },
        });
        if (!existingProduct) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Check for duplicates if name or costPrice or sellingPrice is changing
        const targetName = name || existingProduct.name;
        const targetCostPrice = costPrice
            ? new client_1.Prisma.Decimal(costPrice)
            : existingProduct.costPrice;
        const targetSellingPrice = sellingPrice
            ? new client_1.Prisma.Decimal(sellingPrice)
            : existingProduct.sellingPrice;
        if ((name && name !== existingProduct.name) ||
            (costPrice && Number(costPrice) !== Number(existingProduct.costPrice)) ||
            (sellingPrice &&
                Number(sellingPrice) !== Number(existingProduct.sellingPrice))) {
            const duplicateProduct = yield prisma_1.default.dealerProduct.findFirst({
                where: {
                    dealerId: dealer.id,
                    name: targetName,
                    costPrice: targetCostPrice,
                    sellingPrice: targetSellingPrice,
                    NOT: {
                        id,
                    },
                },
            });
            if (duplicateProduct) {
                return res.status(400).json({
                    message: "Product with this name, cost price, and selling price already exists. Updates would cause a duplicate.",
                });
            }
        }
        // Update product and unit conversions in a transaction
        const updatedProduct = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            if (unitConversions !== undefined) {
                yield tx.dealerProductUnitConversion.deleteMany({ where: { dealerProductId: id } });
                if (unitConversions.length > 0) {
                    yield tx.dealerProductUnitConversion.createMany({
                        data: unitConversions.map((uc) => ({
                            dealerProductId: id,
                            unitName: uc.unitName,
                            conversionFactor: new client_1.Prisma.Decimal(uc.conversionFactor),
                        })),
                    });
                }
            }
            return tx.dealerProduct.update({
                where: { id },
                data: {
                    name,
                    description,
                    type,
                    unit,
                    costPrice: costPrice ? new client_1.Prisma.Decimal(costPrice) : undefined,
                    sellingPrice: sellingPrice ? new client_1.Prisma.Decimal(sellingPrice) : undefined,
                    minStock: minStock !== undefined ? (minStock ? new client_1.Prisma.Decimal(minStock) : null) : undefined,
                    sku,
                },
                include: { unitConversions: true },
            });
        }));
        return res.status(200).json({
            success: true,
            data: updatedProduct,
            message: "Product updated successfully",
        });
    }
    catch (error) {
        console.error("Update dealer product error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateDealerProduct = updateDealerProduct;
// ==================== DELETE DEALER PRODUCT ====================
const deleteDealerProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dealerId = req.userId;
        const { id } = req.params;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: dealerId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Check if product exists and belongs to dealer
        const product = yield prisma_1.default.dealerProduct.findFirst({
            where: {
                id,
                dealerId: dealer.id,
            },
        });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Check if product has been used in sales
        const saleItemsCount = yield prisma_1.default.dealerSaleItem.count({
            where: { productId: id },
        });
        if (saleItemsCount > 0) {
            return res.status(400).json({
                message: "Cannot delete product that has been used in sales",
            });
        }
        // Delete product
        yield prisma_1.default.dealerProduct.delete({
            where: { id },
        });
        return res.status(200).json({
            success: true,
            message: "Product deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete dealer product error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteDealerProduct = deleteDealerProduct;
// ==================== GET INVENTORY SUMMARY ====================
const getInventorySummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dealerId = req.userId;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: dealerId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Get total products
        const totalProducts = yield prisma_1.default.dealerProduct.count({
            where: { dealerId: dealer.id },
        });
        // Get low stock products
        const lowStockProducts = yield prisma_1.default.dealerProduct.count({
            where: {
                dealerId: dealer.id,
                AND: [
                    { minStock: { not: null } },
                    {
                        currentStock: {
                            lte: prisma_1.default.dealerProduct.fields.minStock,
                        },
                    },
                ],
            },
        });
        // Get out of stock products
        const outOfStockProducts = yield prisma_1.default.dealerProduct.count({
            where: {
                dealerId: dealer.id,
                currentStock: { lte: 0 },
            },
        });
        // Get total inventory value
        const products = yield prisma_1.default.dealerProduct.findMany({
            where: { dealerId: dealer.id },
        });
        const totalInventoryValue = products.reduce((sum, product) => {
            return sum + Number(product.currentStock) * Number(product.costPrice);
        }, 0);
        // Get products by type
        const productsByType = yield prisma_1.default.dealerProduct.groupBy({
            by: ["type"],
            where: { dealerId: dealer.id },
            _count: true,
        });
        return res.status(200).json({
            success: true,
            data: {
                totalProducts,
                lowStockProducts,
                outOfStockProducts,
                totalInventoryValue,
                productsByType,
            },
        });
    }
    catch (error) {
        console.error("Get inventory summary error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getInventorySummary = getInventorySummary;
// ==================== ADJUST PRODUCT STOCK ====================
const adjustProductStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dealerId = req.userId;
        const { id } = req.params;
        const { quantity, type, description, reference } = req.body;
        // Validation
        if (!quantity || !type) {
            return res.status(400).json({
                message: "Quantity and type are required",
            });
        }
        if (!["ADJUSTMENT", "PURCHASE", "RETURN"].includes(type)) {
            return res.status(400).json({
                message: "Invalid adjustment type",
            });
        }
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: dealerId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Check if product exists
        const product = yield prisma_1.default.dealerProduct.findFirst({
            where: {
                id,
                dealerId: dealer.id,
            },
        });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Perform adjustment
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Update stock
            const updatedProduct = yield tx.dealerProduct.update({
                where: { id },
                data: {
                    currentStock: {
                        increment: new client_1.Prisma.Decimal(quantity),
                    },
                },
            });
            // Create transaction record
            yield tx.dealerProductTransaction.create({
                data: {
                    type,
                    quantity: new client_1.Prisma.Decimal(Math.abs(quantity)),
                    unitPrice: product.costPrice,
                    totalAmount: new client_1.Prisma.Decimal(Math.abs(quantity) * Number(product.costPrice)),
                    date: new Date(),
                    description: description || `Stock ${type.toLowerCase()}`,
                    reference,
                    productId: id,
                },
            });
            return updatedProduct;
        }));
        return res.status(200).json({
            success: true,
            data: result,
            message: "Stock adjusted successfully",
        });
    }
    catch (error) {
        console.error("Adjust product stock error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.adjustProductStock = adjustProductStock;
