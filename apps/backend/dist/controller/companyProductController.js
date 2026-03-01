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
exports.adjustCompanyProductStock = exports.getCompanyProductSummary = exports.deleteCompanyProduct = exports.updateCompanyProduct = exports.getCompanyProductById = exports.getCompanyProducts = exports.createCompanyProduct = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
// ==================== CREATE COMPANY PRODUCT ====================
const createCompanyProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { name, description, type, unit, unitSellingPrice, unitCostPrice, quantity, imageUrl, unitConversions } = req.body;
        // Validation
        if (!name || !type || !unit || !unitSellingPrice || !quantity) {
            return res.status(400).json({
                message: "Name, type, unit, unit selling price, and quantity are required",
            });
        }
        // Get the company record
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const totalPrice = Number(unitSellingPrice) * Number(quantity);
        // Create product with optional unit conversions
        const product = yield prisma_1.default.product.create({
            data: Object.assign({ name,
                description,
                type,
                unit, unitSellingPrice: new client_1.Prisma.Decimal(unitSellingPrice), unitCostPrice: unitCostPrice ? new client_1.Prisma.Decimal(unitCostPrice) : new client_1.Prisma.Decimal(0), quantity: new client_1.Prisma.Decimal(quantity), currentStock: new client_1.Prisma.Decimal(quantity), totalPrice: new client_1.Prisma.Decimal(totalPrice), imageUrl: imageUrl || null, supplierId: userId }, (unitConversions && unitConversions.length > 0 && {
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
        console.error("Create company product error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createCompanyProduct = createCompanyProduct;
// ==================== GET ALL COMPANY PRODUCTS ====================
const getCompanyProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { page = 1, limit = 10, search, type } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {
            supplierId: userId,
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }
        if (type) {
            where.type = type;
        }
        const [products, total] = yield Promise.all([
            prisma_1.default.product.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
                include: { unitConversions: true },
            }),
            prisma_1.default.product.count({ where }),
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
        console.error("Get company products error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanyProducts = getCompanyProducts;
// ==================== GET COMPANY PRODUCT BY ID ====================
const getCompanyProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const product = yield prisma_1.default.product.findFirst({
            where: {
                id,
                supplierId: userId,
            },
            include: {
                dealerProducts: {
                    select: {
                        id: true,
                        dealer: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
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
        console.error("Get company product by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanyProductById = getCompanyProductById;
// ==================== UPDATE COMPANY PRODUCT ====================
const updateCompanyProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { name, description, type, unit, unitSellingPrice, unitCostPrice, quantity, imageUrl, unitConversions } = req.body;
        // Check if product exists and belongs to company
        const existingProduct = yield prisma_1.default.product.findFirst({
            where: {
                id,
                supplierId: userId,
            },
        });
        if (!existingProduct) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Calculate new total price if price or quantity changed
        const newPrice = unitSellingPrice !== undefined ? Number(unitSellingPrice) : Number(existingProduct.unitSellingPrice);
        const newQuantity = quantity !== undefined ? Number(quantity) : Number(existingProduct.quantity);
        const totalPrice = newPrice * newQuantity;
        // Update product and unit conversions in a transaction
        const updatedProduct = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // If unitConversions provided, replace all existing conversions
            if (unitConversions !== undefined) {
                yield tx.productUnitConversion.deleteMany({ where: { productId: id } });
                if (unitConversions.length > 0) {
                    yield tx.productUnitConversion.createMany({
                        data: unitConversions.map((uc) => ({
                            productId: id,
                            unitName: uc.unitName,
                            conversionFactor: new client_1.Prisma.Decimal(uc.conversionFactor),
                        })),
                    });
                }
            }
            return tx.product.update({
                where: { id },
                data: {
                    name,
                    description,
                    type,
                    unit,
                    unitSellingPrice: unitSellingPrice !== undefined ? new client_1.Prisma.Decimal(unitSellingPrice) : undefined,
                    unitCostPrice: unitCostPrice !== undefined ? new client_1.Prisma.Decimal(unitCostPrice) : undefined,
                    quantity: quantity !== undefined ? new client_1.Prisma.Decimal(quantity) : undefined,
                    currentStock: quantity !== undefined ? new client_1.Prisma.Decimal(quantity) : undefined,
                    totalPrice: new client_1.Prisma.Decimal(totalPrice),
                    imageUrl: imageUrl !== undefined ? imageUrl : undefined,
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
        console.error("Update company product error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateCompanyProduct = updateCompanyProduct;
// ==================== DELETE COMPANY PRODUCT ====================
const deleteCompanyProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        // Check if product exists and belongs to company
        const product = yield prisma_1.default.product.findFirst({
            where: {
                id,
                supplierId: userId,
            },
        });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Check if product is referenced by dealer products
        const dealerProductCount = yield prisma_1.default.dealerProduct.count({
            where: { companyProductId: id },
        });
        if (dealerProductCount > 0) {
            return res.status(400).json({
                message: "Cannot delete product that is used by dealers",
            });
        }
        // Check if product is in consignments
        const consignmentItemCount = yield prisma_1.default.consignmentItem.count({
            where: { companyProductId: id },
        });
        if (consignmentItemCount > 0) {
            return res.status(400).json({
                message: "Cannot delete product that is in consignments",
            });
        }
        // Delete product
        yield prisma_1.default.product.delete({
            where: { id },
        });
        return res.status(200).json({
            success: true,
            message: "Product deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete company product error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteCompanyProduct = deleteCompanyProduct;
// ==================== GET COMPANY PRODUCT SUMMARY ====================
const getCompanyProductSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        // Get the company for this user
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        // Get total products
        const totalProducts = yield prisma_1.default.product.count({
            where: { supplierId: userId },
        });
        // Get products by type
        const productsByType = yield prisma_1.default.product.groupBy({
            by: ["type"],
            where: { supplierId: userId },
            _count: true,
            _sum: {
                quantity: true,
                totalPrice: true,
            },
        });
        // Get total inventory value
        const products = yield prisma_1.default.product.findMany({
            where: { supplierId: userId },
        });
        const totalInventoryValue = products.reduce((sum, product) => {
            return sum + Number(product.totalPrice);
        }, 0);
        // Get connected dealers count from DealerCompany relationship
        // Also count manually created dealers (those with userId = current user)
        let dealersCount = 0;
        if (company) {
            // Count connected dealers (active, not archived by company)
            const connectedDealers = yield prisma_1.default.dealerCompany.count({
                where: {
                    companyId: company.id,
                    archivedByCompany: false,
                },
            });
            // Count manually created dealers
            const manualDealers = yield prisma_1.default.dealer.count({
                where: {
                    userId: userId,
                },
            });
            dealersCount = connectedDealers + manualDealers;
        }
        return res.status(200).json({
            success: true,
            data: {
                totalProducts,
                totalInventoryValue,
                dealersCount,
                productsByType: productsByType.map((item) => ({
                    type: item.type,
                    count: item._count,
                    totalQuantity: item._sum.quantity,
                    totalValue: item._sum.totalPrice,
                })),
            },
        });
    }
    catch (error) {
        console.error("Get company product summary error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanyProductSummary = getCompanyProductSummary;
// ==================== ADJUST COMPANY PRODUCT STOCK ====================
const adjustCompanyProductStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { quantity } = req.body;
        // Validation
        if (quantity === undefined) {
            return res.status(400).json({
                message: "Quantity is required",
            });
        }
        // Check if product exists
        const product = yield prisma_1.default.product.findFirst({
            where: {
                id,
                supplierId: userId,
            },
        });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Calculate new quantity and total price
        const newQuantity = Number(product.quantity) + Number(quantity);
        const newCurrentStock = Number(product.currentStock || product.quantity) + Number(quantity);
        const newTotalPrice = newQuantity * Number(product.unitSellingPrice);
        // Update product
        const updatedProduct = yield prisma_1.default.product.update({
            where: { id },
            data: {
                quantity: new client_1.Prisma.Decimal(newQuantity),
                currentStock: new client_1.Prisma.Decimal(newCurrentStock),
                totalPrice: new client_1.Prisma.Decimal(newTotalPrice),
            },
        });
        return res.status(200).json({
            success: true,
            data: updatedProduct,
            message: "Stock adjusted successfully",
        });
    }
    catch (error) {
        console.error("Adjust company product stock error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.adjustCompanyProductStock = adjustCompanyProductStock;
