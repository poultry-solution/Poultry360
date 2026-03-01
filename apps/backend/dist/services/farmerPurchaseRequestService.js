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
exports.FarmerPurchaseRequestService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const dealerFarmerAccountService_1 = require("./dealerFarmerAccountService");
const inventoryService_1 = require("./inventoryService");
const discountHelpers_1 = require("../utils/discountHelpers");
class FarmerPurchaseRequestService {
    /**
     * Create a purchase request from farmer to dealer.
     * Items are stored at catalog (selling) price — no discount at creation.
     */
    static createPurchaseRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { farmerId, dealerId, customerId, items, notes, date } = data;
            const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
            const requestId = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // Validate stock for all items
                for (const item of items) {
                    const product = yield tx.dealerProduct.findUnique({
                        where: { id: item.productId },
                    });
                    if (!product) {
                        throw new Error(`Product ${item.productId} not found`);
                    }
                    if (Number(product.currentStock) < item.quantity) {
                        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}`);
                    }
                }
                const requestNumber = `PR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                const request = yield tx.farmerPurchaseRequest.create({
                    data: {
                        requestNumber,
                        date,
                        totalAmount: new client_1.Prisma.Decimal(Math.round(totalAmount * 100) / 100),
                        notes,
                        farmerId,
                        dealerId,
                        customerId,
                        status: "PENDING",
                    },
                });
                for (const item of items) {
                    const lineTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
                    yield tx.farmerPurchaseRequestItem.create({
                        data: {
                            requestId: request.id,
                            productId: item.productId,
                            quantity: new client_1.Prisma.Decimal(item.quantity),
                            unitPrice: new client_1.Prisma.Decimal(item.unitPrice),
                            totalAmount: new client_1.Prisma.Decimal(lineTotal),
                            unit: item.unit || null,
                        },
                    });
                }
                return request.id;
            }), { timeout: 20000 });
            return yield prisma_1.default.farmerPurchaseRequest.findUnique({
                where: { id: requestId },
                include: {
                    items: { include: { product: true } },
                    dealer: { select: { id: true, name: true, contact: true, address: true } },
                    farmer: { select: { id: true, name: true, phone: true } },
                    customer: true,
                },
            });
        });
    }
    /**
     * Dealer approves a farmer's purchase request, optionally with discount.
     * Creates DealerSale, updates accounts, decrements stock, processes farmer inventory.
     */
    static approvePurchaseRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { requestId, dealerId, discount } = data;
            const request = yield prisma_1.default.farmerPurchaseRequest.findUnique({
                where: { id: requestId },
                include: {
                    items: { include: { product: true } },
                    dealer: { select: { id: true, ownerId: true } },
                    customer: true,
                },
            });
            if (!request) {
                throw new Error("Purchase request not found");
            }
            if (request.dealerId !== dealerId) {
                throw new Error("You can only approve requests sent to you");
            }
            if (request.status !== "PENDING") {
                throw new Error(`Request is already ${request.status.toLowerCase()}`);
            }
            // Calculate amounts with optional discount
            const subtotal = request.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
            const hasDiscount = discount &&
                discount.value > 0 &&
                (discount.type !== "PERCENT" || discount.value <= 100) &&
                (discount.type !== "FLAT" || discount.value < subtotal);
            let finalTotal;
            let itemTotals;
            if (hasDiscount && discount) {
                const discountAmount = (0, discountHelpers_1.computeDiscountAmount)(subtotal, discount.type, discount.value);
                finalTotal = Math.round((subtotal - discountAmount) * 100) / 100;
                itemTotals = (0, discountHelpers_1.distributeDiscountToItems)(subtotal, discountAmount, request.items.map((i) => ({
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice),
                })));
            }
            else {
                finalTotal = Math.round(subtotal * 100) / 100;
                itemTotals = request.items.map((i) => Math.round(Number(i.quantity) * Number(i.unitPrice) * 100) / 100);
            }
            const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            const saleId = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                // Re-validate stock
                for (const item of request.items) {
                    const product = yield tx.dealerProduct.findUnique({
                        where: { id: item.productId },
                    });
                    if (!product || Number(product.currentStock) < Number(item.quantity)) {
                        throw new Error(`Insufficient stock for product ${item.product.name}`);
                    }
                }
                // Create DealerSale
                const saleData = {
                    invoiceNumber,
                    date: request.date,
                    totalAmount: new client_1.Prisma.Decimal(finalTotal),
                    paidAmount: new client_1.Prisma.Decimal(0),
                    dueAmount: new client_1.Prisma.Decimal(finalTotal),
                    isCredit: true,
                    notes: request.notes,
                    dealerId: request.dealerId,
                    customerId: request.customerId,
                    farmerId: request.farmerId,
                };
                if (hasDiscount) {
                    saleData.subtotalAmount = new client_1.Prisma.Decimal(subtotal);
                }
                const sale = yield tx.dealerSale.create({ data: saleData });
                // Create SaleDiscount if applicable
                if (hasDiscount && discount) {
                    yield tx.saleDiscount.create({
                        data: {
                            type: discount.type,
                            value: new client_1.Prisma.Decimal(discount.value),
                            dealerSaleId: sale.id,
                        },
                    });
                }
                // Record in DealerFarmerAccount (full amount as credit)
                yield dealerFarmerAccountService_1.DealerFarmerAccountService.recordSale(request.dealerId, request.farmerId, finalTotal, sale.id, tx);
                // Create sale items, decrement stock, create product transactions
                for (let i = 0; i < request.items.length; i++) {
                    const requestItem = request.items[i];
                    const lineTotal = (_a = itemTotals[i]) !== null && _a !== void 0 ? _a : Number(requestItem.quantity) * Number(requestItem.unitPrice);
                    const qty = Number(requestItem.quantity);
                    const unitPriceAfterDiscount = qty > 0 ? lineTotal / qty : Number(requestItem.unitPrice);
                    yield tx.dealerSaleItem.create({
                        data: {
                            saleId: sale.id,
                            productId: requestItem.productId,
                            quantity: requestItem.quantity,
                            unitPrice: new client_1.Prisma.Decimal(Math.round(unitPriceAfterDiscount * 100) / 100),
                            totalAmount: new client_1.Prisma.Decimal(Math.round(lineTotal * 100) / 100),
                            unit: requestItem.unit || null,
                            baseQuantity: requestItem.baseQuantity || null,
                        },
                    });
                    // Decrement stock by baseQuantity (base unit) if available, else by quantity
                    const stockDecrement = requestItem.baseQuantity
                        ? new client_1.Prisma.Decimal(Number(requestItem.baseQuantity))
                        : requestItem.quantity;
                    yield tx.dealerProduct.update({
                        where: { id: requestItem.productId },
                        data: {
                            currentStock: { decrement: stockDecrement },
                        },
                    });
                    yield tx.dealerProductTransaction.create({
                        data: {
                            type: "SALE",
                            quantity: requestItem.quantity,
                            unitPrice: new client_1.Prisma.Decimal(Math.round(unitPriceAfterDiscount * 100) / 100),
                            totalAmount: new client_1.Prisma.Decimal(Math.round(lineTotal * 100) / 100),
                            date: request.date,
                            description: `Sale - Invoice ${invoiceNumber}`,
                            reference: invoiceNumber,
                            productId: requestItem.productId,
                            dealerSaleId: sale.id,
                            unit: requestItem.unit || null,
                        },
                    });
                }
                // Dealer ledger entry
                const lastLedgerEntry = yield tx.dealerLedgerEntry.findFirst({
                    where: { dealerId: request.dealerId },
                    orderBy: { createdAt: "desc" },
                });
                const currentBalance = lastLedgerEntry
                    ? Number(lastLedgerEntry.balance)
                    : 0;
                const newBalance = currentBalance + finalTotal;
                yield tx.dealerLedgerEntry.create({
                    data: {
                        type: "SALE",
                        amount: new client_1.Prisma.Decimal(finalTotal),
                        balance: new client_1.Prisma.Decimal(newBalance),
                        date: request.date,
                        description: `Sale (purchase request) - Invoice ${invoiceNumber}`,
                        reference: invoiceNumber,
                        dealerId: request.dealerId,
                        saleId: sale.id,
                        partyId: request.customerId,
                        partyType: "CUSTOMER",
                    },
                });
                // Update customer balance
                if (request.customerId) {
                    const customer = yield tx.customer.findUnique({
                        where: { id: request.customerId },
                    });
                    if (customer) {
                        yield tx.customer.update({
                            where: { id: request.customerId },
                            data: {
                                balance: new client_1.Prisma.Decimal(Number(customer.balance || 0) + finalTotal),
                            },
                        });
                    }
                }
                // Update purchase request
                const updateData = {
                    status: "APPROVED",
                    reviewedAt: new Date(),
                    dealerSaleId: sale.id,
                    totalAmount: new client_1.Prisma.Decimal(finalTotal),
                };
                if (hasDiscount && discount) {
                    updateData.subtotalAmount = new client_1.Prisma.Decimal(subtotal);
                    updateData.discountType = discount.type;
                    updateData.discountValue = new client_1.Prisma.Decimal(discount.value);
                }
                yield tx.farmerPurchaseRequest.update({
                    where: { id: requestId },
                    data: updateData,
                });
                return sale.id;
            }), { timeout: 20000 });
            // Process farmer-side inventory OUTSIDE transaction
            for (let i = 0; i < request.items.length; i++) {
                const requestItem = request.items[i];
                const lineTotal = (_a = itemTotals[i]) !== null && _a !== void 0 ? _a : Number(requestItem.quantity) * Number(requestItem.unitPrice);
                const qty = Number(requestItem.quantity);
                const unitPriceAfterDiscount = qty > 0 ? lineTotal / qty : Number(requestItem.unitPrice);
                yield inventoryService_1.InventoryService.processSupplierPurchase({
                    dealerId: request.dealerId,
                    itemName: requestItem.product.name,
                    quantity: qty,
                    unitPrice: unitPriceAfterDiscount,
                    totalAmount: lineTotal,
                    date: request.date,
                    description: `Purchase - Invoice ${invoiceNumber}`,
                    reference: invoiceNumber,
                    purchaseCategory: requestItem.product.type,
                    userId: request.farmerId,
                    unit: requestItem.unit || undefined,
                });
            }
            return yield prisma_1.default.dealerSale.findUnique({
                where: { id: saleId },
                include: {
                    items: { include: { product: true } },
                    payments: true,
                    customer: true,
                    dealer: true,
                    purchaseRequest: true,
                },
            });
        });
    }
    /**
     * Dealer rejects a farmer's purchase request.
     */
    static rejectPurchaseRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { requestId, dealerId, rejectionReason } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const request = yield tx.farmerPurchaseRequest.findUnique({
                    where: { id: requestId },
                });
                if (!request) {
                    throw new Error("Purchase request not found");
                }
                if (request.dealerId !== dealerId) {
                    throw new Error("You can only reject requests sent to you");
                }
                if (request.status !== "PENDING") {
                    throw new Error(`Request is already ${request.status.toLowerCase()}`);
                }
                return yield tx.farmerPurchaseRequest.update({
                    where: { id: requestId },
                    data: {
                        status: "REJECTED",
                        reviewedAt: new Date(),
                        rejectionReason,
                    },
                    include: {
                        items: { include: { product: true } },
                        dealer: { select: { id: true, name: true, contact: true, address: true } },
                        farmer: { select: { id: true, name: true, phone: true } },
                        customer: true,
                    },
                });
            }));
        });
    }
}
exports.FarmerPurchaseRequestService = FarmerPurchaseRequestService;
