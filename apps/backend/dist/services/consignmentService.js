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
exports.ConsignmentService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const discountHelpers_1 = require("../utils/discountHelpers");
class ConsignmentService {
    /**
     * Generate unique consignment number
     */
    static generateConsignmentNumber() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 7).toUpperCase();
        return `CN-${timestamp}-${random}`;
    }
    /**
     * Create audit log entry
     */
    static createAuditLog(tx, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield tx.consignmentAuditLog.create({
                data: {
                    consignmentId: data.consignmentId,
                    action: data.action,
                    statusFrom: data.statusFrom,
                    statusTo: data.statusTo,
                    actorId: data.actorId,
                    quantityChange: data.quantityChange
                        ? new client_1.Prisma.Decimal(data.quantityChange)
                        : null,
                    documentRef: data.documentRef,
                    notes: data.notes,
                },
            });
        });
    }
    /**
     * Validate state transition
     */
    static validateStateTransition(from, to) {
        var _a;
        const validTransitions = {
            CREATED: [client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH, client_1.ConsignmentStatus.REJECTED, client_1.ConsignmentStatus.CANCELLED],
            ACCEPTED_PENDING_DISPATCH: [client_1.ConsignmentStatus.DISPATCHED, client_1.ConsignmentStatus.REJECTED, client_1.ConsignmentStatus.CANCELLED],
            DISPATCHED: [client_1.ConsignmentStatus.RECEIVED],
            RECEIVED: [client_1.ConsignmentStatus.SETTLED],
            SETTLED: [],
            REJECTED: [],
            CANCELLED: [],
        };
        if (!((_a = validTransitions[from]) === null || _a === void 0 ? void 0 : _a.includes(to))) {
            throw new Error(`Invalid state transition from ${from} to ${to}`);
        }
    }
    /**
     * Create consignment (Company or Dealer initiates)
     */
    static createConsignment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
                let finalTotal;
                let itemTotals;
                const hasDiscount = data.discount &&
                    data.discount.value > 0 &&
                    (data.discount.type !== "PERCENT" || data.discount.value <= 100) &&
                    (data.discount.type !== "FLAT" || data.discount.value < subtotal);
                if (hasDiscount && data.discount) {
                    const discountAmount = (0, discountHelpers_1.computeDiscountAmount)(subtotal, data.discount.type, data.discount.value);
                    finalTotal = Math.round((subtotal - discountAmount) * 100) / 100;
                    itemTotals = (0, discountHelpers_1.distributeDiscountToItems)(subtotal, discountAmount, data.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })));
                }
                else {
                    finalTotal = subtotal;
                    itemTotals = data.items.map((item) => Math.round(item.quantity * item.unitPrice * 100) / 100);
                }
                const requestedQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
                // Balance limit check for company-to-dealer consignments (use final total)
                if (data.fromCompanyId && data.toDealerId && !data.overrideBalanceLimit) {
                    const account = yield tx.companyDealerAccount.findUnique({
                        where: {
                            companyId_dealerId: {
                                companyId: data.fromCompanyId,
                                dealerId: data.toDealerId,
                            },
                        },
                        select: { balance: true, balanceLimit: true },
                    });
                    if (account === null || account === void 0 ? void 0 : account.balanceLimit) {
                        const currentBalance = Number(account.balance);
                        const newBalance = currentBalance + finalTotal;
                        const limit = Number(account.balanceLimit);
                        if (newBalance > limit) {
                            throw new Error(`Balance limit exceeded. Current: ${currentBalance}, After consignment: ${newBalance}, Limit: ${limit}. ` +
                                `Exceeds by: ${(newBalance - limit).toFixed(2)}. Use override to proceed.`);
                        }
                    }
                }
                const consignmentData = {
                    requestNumber: this.generateConsignmentNumber(),
                    direction: data.direction,
                    status: client_1.ConsignmentStatus.CREATED,
                    totalAmount: new client_1.Prisma.Decimal(finalTotal),
                    requestedQuantity: new client_1.Prisma.Decimal(requestedQuantity),
                    notes: data.notes,
                    overrideBalanceLimit: (_a = data.overrideBalanceLimit) !== null && _a !== void 0 ? _a : false,
                    fromCompanyId: data.fromCompanyId,
                    fromDealerId: data.fromDealerId,
                    toDealerId: data.toDealerId,
                    toFarmerId: data.toFarmerId,
                    items: {
                        create: data.items.map((item, idx) => {
                            var _a;
                            return ({
                                quantity: new client_1.Prisma.Decimal(item.quantity),
                                unitPrice: new client_1.Prisma.Decimal(item.unitPrice),
                                totalAmount: new client_1.Prisma.Decimal((_a = itemTotals[idx]) !== null && _a !== void 0 ? _a : item.quantity * item.unitPrice),
                                companyProductId: item.companyProductId,
                                dealerProductId: item.dealerProductId,
                            });
                        }),
                    },
                };
                if (hasDiscount && data.discount) {
                    consignmentData.subtotalAmount = new client_1.Prisma.Decimal(subtotal);
                    consignmentData.discountType = data.discount.type;
                    consignmentData.discountValue = new client_1.Prisma.Decimal(data.discount.value);
                }
                const consignment = yield tx.consignmentRequest.create({
                    data: consignmentData,
                    include: {
                        items: {
                            include: {
                                companyProduct: true,
                                dealerProduct: true,
                            },
                        },
                        fromCompany: true,
                        fromDealer: true,
                        toDealer: true,
                        toFarmer: true,
                    },
                });
                // Create audit log
                yield this.createAuditLog(tx, {
                    consignmentId: consignment.id,
                    action: "CREATED",
                    statusTo: client_1.ConsignmentStatus.CREATED,
                    actorId: data.requestedById,
                    quantityChange: requestedQuantity,
                    notes: data.notes,
                });
                return consignment;
            }));
        });
    }
    /**
     * Accept consignment (supports partial acceptance).
     * Optional discount: when provided, applied to accepted subtotal; consignment totalAmount and item totalAmounts updated.
     */
    static acceptConsignment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const consignment = yield tx.consignmentRequest.findUnique({
                    where: { id: data.consignmentId },
                    include: { items: true },
                });
                if (!consignment) {
                    throw new Error("Consignment not found");
                }
                if (consignment.status !== client_1.ConsignmentStatus.CREATED) {
                    throw new Error(`Cannot accept consignment in ${consignment.status} status`);
                }
                // Build accepted items list and update accepted quantities
                const acceptedItemsMeta = [];
                let totalApprovedQty = 0;
                let totalAcceptedAmount = 0;
                let itemIndex = 0;
                for (const item of data.items) {
                    const originalItem = consignment.items.find((i) => i.id === item.itemId);
                    if (!originalItem)
                        continue;
                    yield tx.consignmentItem.update({
                        where: { id: item.itemId },
                        data: {
                            acceptedQuantity: new client_1.Prisma.Decimal(item.acceptedQuantity),
                            isAccepted: item.acceptedQuantity > 0,
                        },
                    });
                    totalApprovedQty += item.acceptedQuantity;
                    const lineSubtotal = Number(originalItem.unitPrice) * item.acceptedQuantity;
                    totalAcceptedAmount += lineSubtotal;
                    if (item.acceptedQuantity > 0) {
                        acceptedItemsMeta.push({
                            itemId: item.itemId,
                            quantity: item.acceptedQuantity,
                            unitPrice: Number(originalItem.unitPrice),
                            index: itemIndex++,
                        });
                    }
                }
                const subtotal = Math.round(totalAcceptedAmount * 100) / 100;
                const hasDiscount = data.discount &&
                    data.discount.value > 0 &&
                    (data.discount.type !== "PERCENT" || data.discount.value <= 100) &&
                    (data.discount.type !== "FLAT" || data.discount.value < subtotal);
                let finalTotal;
                let itemTotals;
                if (hasDiscount && data.discount) {
                    const discountAmount = (0, discountHelpers_1.computeDiscountAmount)(subtotal, data.discount.type, data.discount.value);
                    finalTotal = Math.round((subtotal - discountAmount) * 100) / 100;
                    itemTotals = (0, discountHelpers_1.distributeDiscountToItems)(subtotal, discountAmount, acceptedItemsMeta.map((m) => ({ quantity: m.quantity, unitPrice: m.unitPrice })));
                }
                else {
                    finalTotal = subtotal;
                    itemTotals = acceptedItemsMeta.map((m) => Math.round(m.quantity * m.unitPrice * 100) / 100);
                }
                // Update each ConsignmentItem totalAmount to distributed (accepted) line total
                for (let i = 0; i < acceptedItemsMeta.length; i++) {
                    const meta = acceptedItemsMeta[i];
                    const lineTotal = (_a = itemTotals[i]) !== null && _a !== void 0 ? _a : meta.quantity * meta.unitPrice;
                    yield tx.consignmentItem.update({
                        where: { id: meta.itemId },
                        data: {
                            totalAmount: new client_1.Prisma.Decimal(Math.round(lineTotal * 100) / 100),
                        },
                    });
                }
                // Balance limit check when company accepts (use discounted total)
                if (consignment.fromCompanyId &&
                    consignment.toDealerId &&
                    consignment.overrideBalanceLimit !== true) {
                    const account = yield tx.companyDealerAccount.findUnique({
                        where: {
                            companyId_dealerId: {
                                companyId: consignment.fromCompanyId,
                                dealerId: consignment.toDealerId,
                            },
                        },
                        select: { balance: true, balanceLimit: true },
                    });
                    if (account === null || account === void 0 ? void 0 : account.balanceLimit) {
                        const currentBalance = Number(account.balance);
                        const newBalance = currentBalance + finalTotal;
                        const limit = Number(account.balanceLimit);
                        if (newBalance > limit) {
                            throw new Error(`Balance limit exceeded. Current: ${currentBalance}, After acceptance: ${newBalance}, Limit: ${limit}. ` +
                                `Exceeds by: ${(newBalance - limit).toFixed(2)}. Reject or ask to update limit.`);
                        }
                    }
                }
                const updateData = {
                    status: client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
                    approvedQuantity: new client_1.Prisma.Decimal(totalApprovedQty),
                    totalAmount: new client_1.Prisma.Decimal(finalTotal),
                };
                if (hasDiscount && data.discount) {
                    updateData.subtotalAmount = new client_1.Prisma.Decimal(subtotal);
                    updateData.discountType = data.discount.type;
                    updateData.discountValue = new client_1.Prisma.Decimal(data.discount.value);
                }
                const updated = yield tx.consignmentRequest.update({
                    where: { id: data.consignmentId },
                    data: updateData,
                    include: {
                        items: {
                            include: {
                                companyProduct: true,
                                dealerProduct: true,
                            },
                        },
                        fromCompany: true,
                        fromDealer: true,
                        toDealer: true,
                    },
                });
                yield this.createAuditLog(tx, {
                    consignmentId: data.consignmentId,
                    action: "ACCEPTED",
                    statusFrom: client_1.ConsignmentStatus.CREATED,
                    statusTo: client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
                    actorId: data.acceptedById,
                    quantityChange: totalApprovedQty,
                    notes: data.notes,
                });
                return updated;
            }));
        });
    }
    /**
     * Reject consignment (before dispatch)
     */
    static rejectConsignment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const consignment = yield tx.consignmentRequest.findUnique({
                    where: { id: data.consignmentId },
                });
                if (!consignment) {
                    throw new Error("Consignment not found");
                }
                const rejectableStatuses = [
                    client_1.ConsignmentStatus.CREATED,
                    client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
                ];
                if (!rejectableStatuses.includes(consignment.status)) {
                    throw new Error("Cannot reject consignment after dispatch");
                }
                const updated = yield tx.consignmentRequest.update({
                    where: { id: data.consignmentId },
                    data: {
                        status: client_1.ConsignmentStatus.REJECTED,
                    },
                    include: {
                        items: true,
                        fromCompany: true,
                        fromDealer: true,
                        toDealer: true,
                    },
                });
                // Create audit log
                yield this.createAuditLog(tx, {
                    consignmentId: data.consignmentId,
                    action: "REJECTED",
                    statusFrom: consignment.status,
                    statusTo: client_1.ConsignmentStatus.REJECTED,
                    actorId: data.rejectedById,
                    notes: data.reason,
                });
                return updated;
            }));
        });
    }
    /**
     * Dispatch consignment (Company dispatches)
     */
    static dispatchConsignment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const consignment = yield tx.consignmentRequest.findUnique({
                    where: { id: data.consignmentId },
                    include: { items: true },
                });
                if (!consignment) {
                    throw new Error("Consignment not found");
                }
                if (consignment.status !== client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH) {
                    throw new Error(`Cannot dispatch consignment in ${consignment.status} status`);
                }
                // Calculate dispatched quantity from approved quantities
                const dispatchedQty = consignment.items.reduce((sum, item) => sum + Number(item.acceptedQuantity || 0), 0);
                const updated = yield tx.consignmentRequest.update({
                    where: { id: data.consignmentId },
                    data: {
                        status: client_1.ConsignmentStatus.DISPATCHED,
                        dispatchedQuantity: new client_1.Prisma.Decimal(dispatchedQty),
                        dispatchRef: data.dispatchRef,
                        trackingInfo: data.trackingInfo,
                        dispatchedAt: new Date(),
                        dispatchedById: data.dispatchedById,
                    },
                    include: {
                        items: {
                            include: {
                                companyProduct: true,
                                dealerProduct: true,
                            },
                        },
                        fromCompany: true,
                        fromDealer: true,
                        toDealer: true,
                    },
                });
                // Create audit log
                yield this.createAuditLog(tx, {
                    consignmentId: data.consignmentId,
                    action: "DISPATCHED",
                    statusFrom: client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
                    statusTo: client_1.ConsignmentStatus.DISPATCHED,
                    actorId: data.dispatchedById,
                    quantityChange: dispatchedQty,
                    documentRef: data.dispatchRef,
                    notes: data.notes,
                });
                return updated;
            }));
        });
    }
    // allocatePrepaymentToSale method removed - using account-based system
    // Prepayments are now tracked in CompanyDealerAccount balance, not allocated to individual sales
    /**
     * Confirm receipt (Dealer confirms - CRITICAL S3 transition)
     * - Transfers inventory
     * - Creates CompanySale
     * - Updates account balance
     * - Creates ledger entries
     */
    static confirmReceipt(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const consignment = yield tx.consignmentRequest.findUnique({
                    where: { id: data.consignmentId },
                    include: {
                        items: {
                            include: {
                                companyProduct: true,
                            },
                        },
                        fromCompany: true,
                        toDealer: true,
                    },
                });
                if (!consignment) {
                    throw new Error("Consignment not found");
                }
                if (consignment.status !== client_1.ConsignmentStatus.DISPATCHED) {
                    throw new Error(`Cannot confirm receipt for consignment in ${consignment.status} status`);
                }
                if (!consignment.fromCompany || !consignment.toDealer) {
                    throw new Error("Invalid consignment: missing company or dealer");
                }
                const receivedQty = Number(consignment.dispatchedQuantity || 0);
                // 1. Update inventory - reduce company stock, increase dealer stock
                for (const item of consignment.items) {
                    const acceptedQty = Number(item.acceptedQuantity || 0);
                    if (acceptedQty <= 0 || !item.companyProduct)
                        continue;
                    // Use discounted unit price as cost when applicable (totalAmount is post-discount line total)
                    const effectiveCostPerUnit = acceptedQty > 0
                        ? Number(item.totalAmount) / acceptedQty
                        : Number(item.unitPrice);
                    const costPriceDecimal = new client_1.Prisma.Decimal(effectiveCostPerUnit);
                    // Reduce company stock
                    yield tx.product.update({
                        where: { id: item.companyProductId },
                        data: {
                            currentStock: {
                                decrement: acceptedQty,
                            },
                        },
                    });
                    // Find user provided selling price
                    const userItem = (_a = data.items) === null || _a === void 0 ? void 0 : _a.find((i) => i.itemId === item.id);
                    const sellingPrice = (userItem === null || userItem === void 0 ? void 0 : userItem.sellingPrice)
                        ? new client_1.Prisma.Decimal(userItem.sellingPrice)
                        : new client_1.Prisma.Decimal(Math.round(effectiveCostPerUnit * 1.2 * 100) / 100);
                    // Check if dealer has this product in their inventory (match by cost to support same product at different costs)
                    const dealerProduct = yield tx.dealerProduct.findFirst({
                        where: {
                            dealerId: consignment.toDealerId,
                            name: item.companyProduct.name,
                            costPrice: costPriceDecimal,
                            sellingPrice: sellingPrice,
                        },
                    });
                    if (dealerProduct) {
                        // Increase existing dealer product stock
                        yield tx.dealerProduct.update({
                            where: { id: dealerProduct.id },
                            data: {
                                currentStock: {
                                    increment: acceptedQty,
                                },
                            },
                        });
                    }
                    else {
                        // Create new dealer product with discounted cost
                        yield tx.dealerProduct.create({
                            data: {
                                name: item.companyProduct.name,
                                type: item.companyProduct.type || "OTHER",
                                unit: item.companyProduct.unit || "UNITS",
                                costPrice: costPriceDecimal,
                                sellingPrice: sellingPrice,
                                currentStock: acceptedQty,
                                dealerId: consignment.toDealerId,
                            },
                        });
                    }
                    // Update item received quantity
                    yield tx.consignmentItem.update({
                        where: { id: item.id },
                        data: {
                            receivedQuantity: item.acceptedQuantity,
                        },
                    });
                }
                // 2. Get or create account for company-dealer pair
                let account = yield tx.companyDealerAccount.findUnique({
                    where: {
                        companyId_dealerId: {
                            companyId: consignment.fromCompanyId,
                            dealerId: consignment.toDealerId,
                        },
                    },
                });
                if (!account) {
                    account = yield tx.companyDealerAccount.create({
                        data: {
                            companyId: consignment.fromCompanyId,
                            dealerId: consignment.toDealerId,
                            balance: new client_1.Prisma.Decimal(0),
                            totalSales: new client_1.Prisma.Decimal(0),
                            totalPayments: new client_1.Prisma.Decimal(0),
                        },
                    });
                }
                // 3. Create CompanySale record (preserve consignment discount on sale)
                const invoiceNumber = `CINV-${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 7)
                    .toUpperCase()}`;
                const consignmentWithDiscount = consignment;
                const hasConsignmentDiscount = consignmentWithDiscount.subtotalAmount != null &&
                    consignmentWithDiscount.discountType &&
                    consignmentWithDiscount.discountValue != null;
                const saleData = {
                    invoiceNumber,
                    companyId: consignment.fromCompanyId,
                    dealerId: consignment.toDealerId,
                    soldById: data.receivedById,
                    totalAmount: consignment.totalAmount,
                    isCredit: true,
                    paymentMethod: "CREDIT",
                    notes: `Consignment sale from ${consignment.requestNumber}`,
                    consignmentId: consignment.id,
                    accountId: account.id,
                    items: {
                        create: consignment.items
                            .filter((item) => Number(item.acceptedQuantity || 0) > 0)
                            .map((item) => ({
                            productId: item.companyProductId,
                            quantity: item.acceptedQuantity,
                            unitPrice: item.unitPrice,
                            // Use consignment item's totalAmount (already includes discount distribution)
                            totalAmount: item.totalAmount,
                        })),
                    },
                };
                if (hasConsignmentDiscount) {
                    saleData.subtotalAmount = consignmentWithDiscount.subtotalAmount;
                }
                const sale = yield tx.companySale.create({
                    data: saleData,
                });
                if (hasConsignmentDiscount &&
                    consignmentWithDiscount.discountType &&
                    consignmentWithDiscount.discountValue != null) {
                    yield tx.saleDiscount.create({
                        data: {
                            type: consignmentWithDiscount.discountType,
                            value: consignmentWithDiscount.discountValue,
                            companySaleId: sale.id,
                        },
                    });
                }
                // 3. Update account balance with sale amount
                yield tx.companyDealerAccount.update({
                    where: { id: account.id },
                    data: {
                        balance: {
                            increment: consignment.totalAmount,
                        },
                        totalSales: {
                            increment: consignment.totalAmount,
                        },
                        lastSaleDate: new Date(),
                    },
                });
                // 4. Create CONSIGNMENT_INVOICE ledger entry
                const lastLedgerEntry = yield tx.companyLedgerEntry.findFirst({
                    where: {
                        companyId: consignment.fromCompanyId,
                        partyId: consignment.toDealerId,
                        partyType: "DEALER",
                    },
                    orderBy: { createdAt: "desc" },
                });
                const currentBalance = lastLedgerEntry
                    ? Number(lastLedgerEntry.runningBalance)
                    : 0;
                const newLedgerBalance = currentBalance + Number(consignment.totalAmount);
                yield tx.companyLedgerEntry.create({
                    data: {
                        companyId: consignment.fromCompanyId,
                        companySaleId: sale.id,
                        type: client_1.LedgerEntryType.CONSIGNMENT_INVOICE,
                        entryType: client_1.LedgerEntryType.CONSIGNMENT_INVOICE,
                        amount: consignment.totalAmount,
                        runningBalance: new client_1.Prisma.Decimal(newLedgerBalance),
                        date: new Date(),
                        description: `Consignment invoice ${invoiceNumber}`,
                        partyId: consignment.toDealerId,
                        partyType: "DEALER",
                        transactionId: sale.id,
                        transactionType: "SALE",
                    },
                });
                // 6. Update consignment status to RECEIVED
                const updated = yield tx.consignmentRequest.update({
                    where: { id: data.consignmentId },
                    data: {
                        status: client_1.ConsignmentStatus.RECEIVED,
                        receivedQuantity: new client_1.Prisma.Decimal(receivedQty),
                        receivedAt: new Date(),
                        receivedById: data.receivedById,
                        grnRef: data.grnRef,
                        companySaleId: sale.id,
                    },
                    include: {
                        items: {
                            include: {
                                companyProduct: true,
                                dealerProduct: true,
                            },
                        },
                        fromCompany: true,
                        toDealer: true,
                        companySale: {
                            include: {
                                discount: true,
                                items: true,
                                account: true,
                            },
                        },
                    },
                });
                // 7. Create audit log
                yield this.createAuditLog(tx, {
                    consignmentId: data.consignmentId,
                    action: "RECEIVED",
                    statusFrom: client_1.ConsignmentStatus.DISPATCHED,
                    statusTo: client_1.ConsignmentStatus.RECEIVED,
                    actorId: data.receivedById,
                    quantityChange: receivedQty,
                    documentRef: data.grnRef,
                    notes: data.notes,
                });
                return updated;
            }), { timeout: 30000 }); // 30 seconds timeout for complex operations
        });
    }
    /**
     * Cancel consignment (before dispatch only)
     */
    static cancelConsignment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const consignment = yield tx.consignmentRequest.findUnique({
                    where: { id: data.consignmentId },
                });
                if (!consignment) {
                    throw new Error("Consignment not found");
                }
                const cancellableStatuses = [
                    client_1.ConsignmentStatus.CREATED,
                    client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
                ];
                if (!cancellableStatuses.includes(consignment.status)) {
                    throw new Error("Cannot cancel consignment after dispatch");
                }
                const updated = yield tx.consignmentRequest.update({
                    where: { id: data.consignmentId },
                    data: {
                        status: client_1.ConsignmentStatus.CANCELLED,
                    },
                    include: {
                        items: true,
                        fromCompany: true,
                        fromDealer: true,
                        toDealer: true,
                    },
                });
                // Create audit log
                yield this.createAuditLog(tx, {
                    consignmentId: data.consignmentId,
                    action: "CANCELLED",
                    statusFrom: consignment.status,
                    statusTo: client_1.ConsignmentStatus.CANCELLED,
                    actorId: data.cancelledById,
                    notes: data.reason,
                });
                return updated;
            }));
        });
    }
    /**
     * Get consignment by ID with full details
     */
    static getConsignmentById(consignmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.consignmentRequest.findUnique({
                where: { id: consignmentId },
                include: {
                    items: {
                        include: {
                            companyProduct: true,
                            dealerProduct: true,
                        },
                    },
                    fromCompany: true,
                    fromDealer: true,
                    toDealer: true,
                    toFarmer: true,
                    companySale: {
                        include: {
                            discount: true,
                            items: true,
                            account: true,
                        },
                    },
                    dispatchedBy: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                        },
                    },
                    receivedBy: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                        },
                    },
                },
            });
        });
    }
    /**
     * Get audit logs for a consignment
     */
    static getAuditLogs(consignmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.consignmentAuditLog.findMany({
                where: { consignmentId },
                include: {
                    actor: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                        },
                    },
                },
                orderBy: { createdAt: "asc" },
            });
        });
    }
    /**
     * List consignments with filters
     */
    static listConsignments(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { fromCompanyId, fromDealerId, toDealerId, status, direction, page = 1, limit = 50, search, } = params;
            const skip = (page - 1) * limit;
            const where = {};
            if (fromCompanyId)
                where.fromCompanyId = fromCompanyId;
            if (fromDealerId)
                where.fromDealerId = fromDealerId;
            if (toDealerId)
                where.toDealerId = toDealerId;
            if (status)
                where.status = status;
            if (direction)
                where.direction = direction;
            if (search) {
                where.OR = [
                    { requestNumber: { contains: search, mode: "insensitive" } },
                    { notes: { contains: search, mode: "insensitive" } },
                ];
            }
            const [consignments, total] = yield Promise.all([
                prisma_1.default.consignmentRequest.findMany({
                    where,
                    include: {
                        items: {
                            include: {
                                companyProduct: true,
                                dealerProduct: true,
                            },
                        },
                        fromCompany: true,
                        fromDealer: true,
                        toDealer: true,
                        toFarmer: true,
                        companySale: {
                            select: {
                                id: true,
                                invoiceNumber: true,
                                subtotalAmount: true,
                                totalAmount: true,
                                discount: true,
                                account: {
                                    select: {
                                        id: true,
                                        balance: true,
                                    },
                                },
                            },
                        },
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: "desc" },
                }),
                prisma_1.default.consignmentRequest.count({ where }),
            ]);
            return {
                consignments,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        });
    }
}
exports.ConsignmentService = ConsignmentService;
