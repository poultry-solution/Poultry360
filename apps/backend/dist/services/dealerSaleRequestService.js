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
exports.DealerSaleRequestService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const dealerFarmerAccountService_1 = require("./dealerFarmerAccountService");
const inventoryService_1 = require("./inventoryService");
const discountHelpers_1 = require("../utils/discountHelpers");
class DealerSaleRequestService {
    /**
     * Create a sale request for a connected farmer
     * Validates stock but does not deduct it yet.
     * When discount is provided, request total and item totals/unit prices are stored after discount.
     */
    static createSaleRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { dealerId, customerId, farmerId, items, paidAmount, paymentMethod, notes, date, discount, } = data;
            const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
            const hasDiscount = discount &&
                discount.value > 0 &&
                (discount.type !== "PERCENT" || discount.value <= 100) &&
                (discount.type !== "FLAT" || discount.value < subtotal);
            let finalTotal;
            let itemTotals;
            if (hasDiscount && discount) {
                const discountAmount = (0, discountHelpers_1.computeDiscountAmount)(subtotal, discount.type, discount.value);
                finalTotal = Math.round((subtotal - discountAmount) * 100) / 100;
                itemTotals = (0, discountHelpers_1.distributeDiscountToItems)(subtotal, discountAmount, items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })));
            }
            else {
                finalTotal = subtotal;
                itemTotals = items.map((i) => Math.round(i.quantity * i.unitPrice * 100) / 100);
            }
            if (paidAmount > finalTotal) {
                throw new Error(`Paid amount (रू ${paidAmount.toFixed(2)}) cannot exceed total amount (रू ${finalTotal.toFixed(2)})`);
            }
            const requestId = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                // 1. Validate stock availability for all items (but don't deduct yet)
                for (const item of items) {
                    const product = yield tx.dealerProduct.findUnique({
                        where: { id: item.productId },
                    });
                    if (!product) {
                        throw new Error(`Product ${item.productId} not found`);
                    }
                    if (Number(product.currentStock) < item.quantity) {
                        throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}`);
                    }
                }
                // 2. Generate request number
                const requestNumber = `SR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                // 3. Create the sale request (with discounted total when applicable)
                const requestData = {
                    requestNumber,
                    date,
                    totalAmount: new client_1.Prisma.Decimal(finalTotal),
                    paidAmount: new client_1.Prisma.Decimal(paidAmount),
                    paymentMethod,
                    notes,
                    dealerId,
                    farmerId,
                    customerId,
                    status: "PENDING",
                };
                if (hasDiscount) {
                    requestData.subtotalAmount = new client_1.Prisma.Decimal(subtotal);
                    requestData.discountType = discount.type;
                    requestData.discountValue = new client_1.Prisma.Decimal(discount.value);
                }
                const request = yield tx.dealerSaleRequest.create({
                    data: requestData,
                });
                // 4. Create request items (discounted unit price = totalAmount/quantity per line)
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const lineTotal = (_a = itemTotals[i]) !== null && _a !== void 0 ? _a : item.quantity * item.unitPrice;
                    const qty = item.quantity;
                    const unitPriceAfterDiscount = qty > 0 ? lineTotal / qty : item.unitPrice;
                    yield tx.dealerSaleRequestItem.create({
                        data: {
                            requestId: request.id,
                            productId: item.productId,
                            quantity: new client_1.Prisma.Decimal(item.quantity),
                            unitPrice: new client_1.Prisma.Decimal(Math.round(unitPriceAfterDiscount * 100) / 100),
                            totalAmount: new client_1.Prisma.Decimal(Math.round(lineTotal * 100) / 100),
                        },
                    });
                }
                return request.id;
            }), { timeout: 20000 });
            // 6. Return request with items (outside transaction to avoid timeout; read is fast)
            const result = yield prisma_1.default.dealerSaleRequest.findUnique({
                where: { id: requestId },
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    dealer: true,
                    farmer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                        },
                    },
                    customer: true,
                },
            });
            if (!result) {
                throw new Error("Sale request not found after create");
            }
            return result;
        });
    }
    /**
     * Approve a sale request and create the actual sale (account-based).
     * Creates DealerSale and links it to DealerFarmerAccount via recordSale();
     * sales increase account balance; payments are recorded separately via
     * DealerFarmerAccountService.recordPayment(). paidAmount/dueAmount on the sale
     * are kept for backward compatibility and reporting but do not drive payment
     * allocation. Farmer-side inventory is still processed via InventoryService;
     * no bill-wise DealerSalePayment or EntityTransaction PAYMENT is created.
     */
    static approveSaleRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { requestId, farmerId, purchaseCategory } = data;
            // 1. Fetch the request BEFORE transaction (to use data after transaction).
            // Include dealer.ownerId so upfront payments can use a valid User ID for recordedById.
            const request = yield prisma_1.default.dealerSaleRequest.findUnique({
                where: { id: requestId },
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    dealer: { select: { id: true, ownerId: true } },
                    customer: true,
                },
            });
            if (!request) {
                throw new Error("Sale request not found");
            }
            // 2. Verify this request belongs to the farmer
            if (request.farmerId !== farmerId) {
                throw new Error("You can only approve requests sent to you");
            }
            // 3. Check if already processed
            if (request.status !== "PENDING") {
                throw new Error(`Request is already ${request.status.toLowerCase()}`);
            }
            // 4. Calculate totals (paidAmount stored on sale for reporting only; no bill-wise payment records)
            const totalAmount = Number(request.totalAmount);
            const paidAmount = Number(request.paidAmount);
            const dueAmount = totalAmount - paidAmount;
            const isCredit = dueAmount > 0;
            // Resolve dealer's user/owner ID for recording upfront payments (recordedById must be a valid User id)
            const recordedByUserId = paidAmount > 0
                ? (_b = (_a = request.dealer) === null || _a === void 0 ? void 0 : _a.ownerId) !== null && _b !== void 0 ? _b : (() => {
                    throw new Error("Dealer has no owner; cannot record upfront payment. Please set the dealer's owner.");
                })()
                : null;
            // 5. Generate invoice number
            const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            // 6. Execute dealer-side transaction (long timeout: many items + ledger + account)
            const saleId = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // Re-validate stock availability
                for (const item of request.items) {
                    const product = yield tx.dealerProduct.findUnique({
                        where: { id: item.productId },
                    });
                    if (!product || Number(product.currentStock) < Number(item.quantity)) {
                        throw new Error(`Insufficient stock for product ${item.product.name}`);
                    }
                }
                // Create the actual DealerSale (farmerId for farmer-side listing; accountId set by recordSale)
                // Preserve discount metadata from request so dealer/farmer views show "was X, discount Y"
                const saleData = {
                    invoiceNumber,
                    date: request.date,
                    totalAmount: request.totalAmount,
                    paidAmount: request.paidAmount,
                    dueAmount: dueAmount > 0 ? new client_1.Prisma.Decimal(dueAmount) : null,
                    isCredit,
                    notes: request.notes,
                    dealerId: request.dealerId,
                    customerId: request.customerId,
                    farmerId: request.farmerId,
                };
                const requestWithDiscount = request;
                if (requestWithDiscount.subtotalAmount != null) {
                    saleData.subtotalAmount = requestWithDiscount.subtotalAmount;
                }
                const sale = yield tx.dealerSale.create({
                    data: saleData,
                });
                if (requestWithDiscount.discountType &&
                    requestWithDiscount.discountValue != null) {
                    yield tx.saleDiscount.create({
                        data: {
                            type: requestWithDiscount.discountType,
                            value: requestWithDiscount.discountValue,
                            dealerSaleId: sale.id,
                        },
                    });
                }
                // Account-based: record only net due so balance is not overstated for partially-paid sales.
                // When paidAmount exists, record sale for dueAmount then record upfront payment in same tx.
                const accountSaleAmount = paidAmount > 0 ? dueAmount : totalAmount;
                yield dealerFarmerAccountService_1.DealerFarmerAccountService.recordSale(request.dealerId, request.farmerId, accountSaleAmount, sale.id, tx);
                if (paidAmount > 0 && recordedByUserId) {
                    yield dealerFarmerAccountService_1.DealerFarmerAccountService.recordPayment({
                        dealerId: request.dealerId,
                        farmerId: request.farmerId,
                        amount: paidAmount,
                        paymentDate: request.date,
                        reference: invoiceNumber,
                        recordedById: recordedByUserId,
                    }, tx);
                }
                // Create sale items and update product stock
                for (const requestItem of request.items) {
                    yield tx.dealerSaleItem.create({
                        data: {
                            saleId: sale.id,
                            productId: requestItem.productId,
                            quantity: requestItem.quantity,
                            unitPrice: requestItem.unitPrice,
                            totalAmount: requestItem.totalAmount,
                        },
                    });
                    // Update product stock
                    yield tx.dealerProduct.update({
                        where: { id: requestItem.productId },
                        data: {
                            currentStock: {
                                decrement: requestItem.quantity,
                            },
                        },
                    });
                    // Create product transaction
                    yield tx.dealerProductTransaction.create({
                        data: {
                            type: "SALE",
                            quantity: requestItem.quantity,
                            unitPrice: requestItem.unitPrice,
                            totalAmount: requestItem.totalAmount,
                            date: request.date,
                            description: `Sale - Invoice ${invoiceNumber}`,
                            reference: invoiceNumber,
                            productId: requestItem.productId,
                            dealerSaleId: sale.id,
                        },
                    });
                }
                // Payments are no longer created here; they are recorded separately via
                // DealerFarmerAccountService.recordPayment(). paidAmount on the sale is
                // kept for historical/reporting only.
                // Get current ledger balance for the dealer
                const lastLedgerEntry = yield tx.dealerLedgerEntry.findFirst({
                    where: { dealerId: request.dealerId },
                    orderBy: { createdAt: "desc" },
                });
                const currentBalance = lastLedgerEntry
                    ? Number(lastLedgerEntry.balance)
                    : 0;
                // Dealer-side ledger: sale entry only (payments create their own entries via
                // DealerFarmerAccountService.recordPayment())
                const newBalance = currentBalance + totalAmount;
                yield tx.dealerLedgerEntry.create({
                    data: {
                        type: "SALE",
                        amount: request.totalAmount,
                        balance: new client_1.Prisma.Decimal(newBalance),
                        date: request.date,
                        description: `Sale (account-based) - Invoice ${invoiceNumber}`,
                        reference: invoiceNumber,
                        dealerId: request.dealerId,
                        saleId: sale.id,
                        partyId: request.customerId,
                        partyType: "CUSTOMER",
                    },
                });
                // Update customer balance (if customer exists). For farmer-linked customers,
                // the authoritative balance is in DealerFarmerAccount; this field can serve
                // as a denormalized cache or for manual customer compatibility.
                if (request.customerId) {
                    const customer = yield tx.customer.findUnique({
                        where: { id: request.customerId },
                    });
                    if (customer) {
                        const currentCustomerBalance = Number(customer.balance || 0);
                        // Add the due amount to customer balance
                        const newCustomerBalance = currentCustomerBalance + dueAmount;
                        yield tx.customer.update({
                            where: { id: request.customerId },
                            data: {
                                balance: new client_1.Prisma.Decimal(newCustomerBalance),
                            },
                        });
                    }
                }
                // Update request status and link to sale
                yield tx.dealerSaleRequest.update({
                    where: { id: requestId },
                    data: {
                        status: "APPROVED",
                        reviewedAt: new Date(),
                        dealerSaleId: sale.id,
                    },
                });
                return sale.id;
            }), { timeout: 20000 });
            // Process farmer-side inventory OUTSIDE main transaction (InventoryService).
            // No EntityTransaction PAYMENT is created here; payments are recorded via
            // DealerFarmerAccountService.recordPayment() and are not tied to individual sales.
            for (const requestItem of request.items) {
                yield inventoryService_1.InventoryService.processSupplierPurchase({
                    dealerId: request.dealerId,
                    itemName: requestItem.product.name,
                    quantity: Number(requestItem.quantity),
                    unitPrice: Number(requestItem.unitPrice),
                    totalAmount: Number(requestItem.totalAmount),
                    date: request.date,
                    description: `Purchase - Invoice ${invoiceNumber}`,
                    reference: invoiceNumber,
                    purchaseCategory: purchaseCategory,
                    userId: request.farmerId,
                });
            }
            // Fetch the complete sale details
            return yield prisma_1.default.dealerSale.findUnique({
                where: { id: saleId },
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    payments: true,
                    customer: true,
                    dealer: true,
                    saleRequest: true,
                },
            });
        });
    }
    /**
     * Reject a sale request
     */
    static rejectSaleRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { requestId, farmerId, rejectionReason } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // 1. Get the request
                const request = yield tx.dealerSaleRequest.findUnique({
                    where: { id: requestId },
                });
                if (!request) {
                    throw new Error("Sale request not found");
                }
                // 2. Verify this request belongs to the farmer
                if (request.farmerId !== farmerId) {
                    throw new Error("You can only reject requests sent to you");
                }
                // 3. Check if already processed
                if (request.status !== "PENDING") {
                    throw new Error(`Request is already ${request.status.toLowerCase()}`);
                }
                // 4. Update request status
                const updatedRequest = yield tx.dealerSaleRequest.update({
                    where: { id: requestId },
                    data: {
                        status: "REJECTED",
                        reviewedAt: new Date(),
                        rejectionReason,
                    },
                    include: {
                        items: {
                            include: {
                                product: true,
                            },
                        },
                        dealer: true,
                        farmer: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                        customer: true,
                    },
                });
                return updatedRequest;
            }));
        });
    }
}
exports.DealerSaleRequestService = DealerSaleRequestService;
