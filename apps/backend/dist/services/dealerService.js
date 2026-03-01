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
exports.DealerService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const discountHelpers_1 = require("../utils/discountHelpers");
class DealerService {
    /**
     * Create a dealer sale with inventory updates and ledger entries
     */
    static createDealerSale(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { dealerId, customerId, items, paidAmount, paymentMethod, notes, date, discount: discountInput, } = data;
            // Validate that customerId is provided
            if (!customerId) {
                throw new Error("Customer ID is required");
            }
            const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
            if (discountInput && discountInput.value > 0) {
                if (discountInput.type === "PERCENT" && discountInput.value > 100) {
                    throw new Error("Discount percent cannot exceed 100");
                }
                if (discountInput.type === "FLAT" && discountInput.value > subtotal) {
                    throw new Error("Flat discount cannot exceed subtotal");
                }
            }
            const discountAmount = discountInput && discountInput.value > 0
                ? (0, discountHelpers_1.computeDiscountAmount)(subtotal, discountInput.type, discountInput.value)
                : 0;
            const totalAmount = Math.round((subtotal - discountAmount) * 100) / 100;
            const dueAmount = totalAmount - paidAmount;
            const isCredit = dueAmount > 0;
            const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            const itemTotals = discountAmount > 0
                ? (0, discountHelpers_1.distributeDiscountToItems)(subtotal, discountAmount, items)
                : items.map((item) => item.quantity * item.unitPrice);
            // Use a single, optimized transaction for all side effects
            const saleId = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // 1. Validate stock availability for all items in parallel
                const productChecks = yield Promise.all(items.map((item) => tx.dealerProduct.findUnique({
                    where: { id: item.productId },
                })));
                for (let i = 0; i < items.length; i++) {
                    const product = productChecks[i];
                    if (!product) {
                        throw new Error(`Product ${items[i].productId} not found`);
                    }
                    if (Number(product.currentStock) < items[i].quantity) {
                        throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.currentStock}, Requested: ${items[i].quantity}`);
                    }
                }
                // 2. Create the sale
                const sale = yield tx.dealerSale.create({
                    data: {
                        invoiceNumber,
                        date,
                        subtotalAmount: discountAmount > 0
                            ? new client_1.Prisma.Decimal(subtotal)
                            : undefined,
                        totalAmount: new client_1.Prisma.Decimal(totalAmount),
                        paidAmount: new client_1.Prisma.Decimal(paidAmount),
                        dueAmount: dueAmount > 0 ? new client_1.Prisma.Decimal(dueAmount) : null,
                        isCredit,
                        notes,
                        dealerId,
                        customerId,
                    },
                });
                if (discountAmount > 0 && discountInput) {
                    yield tx.saleDiscount.create({
                        data: {
                            type: discountInput.type,
                            value: new client_1.Prisma.Decimal(discountInput.value),
                            scope: "SALE",
                            dealerSaleId: sale.id,
                        },
                    });
                }
                // 3. Prepare bulk operations — compute baseQuantity for unit conversions
                const saleItemsData = yield Promise.all(items.map((item, i) => __awaiter(this, void 0, void 0, function* () {
                    let baseQuantity = null;
                    const product = productChecks[i];
                    if (item.unit && item.unit !== product.unit) {
                        const conversions = yield tx.dealerProductUnitConversion.findMany({ where: { dealerProductId: item.productId } });
                        const companyConversions = product.companyProductId
                            ? yield tx.productUnitConversion.findMany({ where: { productId: product.companyProductId } })
                            : [];
                        const allConversions = [...conversions, ...companyConversions];
                        const conv = allConversions.find(c => c.unitName === item.unit);
                        if (conv) {
                            baseQuantity = item.quantity * Number(conv.conversionFactor);
                        }
                    }
                    return {
                        saleId: sale.id,
                        productId: item.productId,
                        quantity: new client_1.Prisma.Decimal(item.quantity),
                        unitPrice: new client_1.Prisma.Decimal(item.unitPrice),
                        totalAmount: new client_1.Prisma.Decimal(itemTotals[i]),
                        unit: item.unit || null,
                        baseQuantity: baseQuantity !== null ? new client_1.Prisma.Decimal(baseQuantity) : null,
                    };
                })));
                const productTransactionsData = items.map((item, i) => ({
                    type: "SALE",
                    quantity: new client_1.Prisma.Decimal(item.quantity),
                    unitPrice: new client_1.Prisma.Decimal(item.unitPrice),
                    totalAmount: new client_1.Prisma.Decimal(itemTotals[i]),
                    date,
                    description: `Sale - Invoice ${invoiceNumber}`,
                    reference: invoiceNumber,
                    productId: item.productId,
                    dealerSaleId: sale.id,
                    unit: item.unit || null,
                }));
                // 4. Execute bulk operations in parallel
                yield Promise.all([
                    // Create all sale items
                    Promise.all(saleItemsData.map((data) => tx.dealerSaleItem.create({ data }))),
                    // Update all product stocks — use baseQuantity (in base unit) when available
                    Promise.all(saleItemsData.map((saleItem, i) => {
                        var _a;
                        return tx.dealerProduct.update({
                            where: { id: items[i].productId },
                            data: {
                                currentStock: {
                                    decrement: (_a = saleItem.baseQuantity) !== null && _a !== void 0 ? _a : new client_1.Prisma.Decimal(items[i].quantity),
                                },
                            },
                        });
                    })),
                    // Create all product transactions
                    Promise.all(productTransactionsData.map((data) => tx.dealerProductTransaction.create({ data }))),
                ]);
                // 5. Create payment record if paidAmount > 0
                if (paidAmount > 0) {
                    yield tx.dealerSalePayment.create({
                        data: {
                            amount: new client_1.Prisma.Decimal(paidAmount),
                            date,
                            description: "Initial payment",
                            paymentMethod,
                            saleId: sale.id,
                        },
                    });
                }
                // 6. Get current ledger balance (single query)
                const lastLedgerEntry = yield tx.dealerLedgerEntry.findFirst({
                    where: { dealerId },
                    orderBy: { createdAt: "desc" },
                });
                const currentBalance = lastLedgerEntry
                    ? Number(lastLedgerEntry.balance)
                    : 0;
                // 7. Create ledger entries
                const newBalance = currentBalance + totalAmount;
                const ledgerEntries = [
                    tx.dealerLedgerEntry.create({
                        data: {
                            type: "SALE",
                            amount: new client_1.Prisma.Decimal(totalAmount),
                            balance: new client_1.Prisma.Decimal(newBalance),
                            date,
                            description: `Sale - Invoice ${invoiceNumber}`,
                            reference: invoiceNumber,
                            dealerId,
                            saleId: sale.id,
                            partyId: customerId,
                            partyType: "CUSTOMER",
                        },
                    }),
                ];
                if (paidAmount > 0) {
                    const balanceAfterPayment = newBalance - paidAmount;
                    ledgerEntries.push(tx.dealerLedgerEntry.create({
                        data: {
                            type: "PAYMENT_RECEIVED",
                            amount: new client_1.Prisma.Decimal(paidAmount),
                            balance: new client_1.Prisma.Decimal(balanceAfterPayment),
                            date,
                            description: `Payment received - Invoice ${invoiceNumber}`,
                            reference: invoiceNumber,
                            dealerId,
                            saleId: sale.id,
                            partyId: customerId,
                            partyType: "CUSTOMER",
                        },
                    }));
                }
                yield Promise.all(ledgerEntries);
                // 8. Update Customer.balance
                const customer = yield tx.customer.findUnique({
                    where: { id: customerId },
                    select: { balance: true },
                });
                if (customer) {
                    const currentCustomerBalance = Number(customer.balance || 0);
                    const newCustomerBalance = currentCustomerBalance + dueAmount;
                    yield tx.customer.update({
                        where: { id: customerId },
                        data: {
                            balance: new client_1.Prisma.Decimal(newCustomerBalance),
                        },
                    });
                }
                // Return sale ID - fetch full details outside transaction
                return sale.id;
            }));
            // Fetch complete sale details outside transaction to avoid timeout
            return yield prisma_1.default.dealerSale.findUnique({
                where: { id: saleId },
                include: {
                    discount: true,
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    payments: true,
                    customer: true,
                },
            });
        });
    }
    /**
     * Add payment to an existing sale
     */
    static addSalePayment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { saleId, amount, date, description, paymentMethod, receiptUrl, reference } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                // 1. Get the sale with customer relation to check if linked
                const sale = yield tx.dealerSale.findUnique({
                    where: { id: saleId },
                    include: {
                        customer: true,
                    },
                });
                if (!sale) {
                    throw new Error("Sale not found");
                }
                const currentDue = Number(sale.dueAmount || 0);
                if (amount > currentDue) {
                    throw new Error(`Payment amount (${amount}) exceeds due amount (${currentDue})`);
                }
                // 2. Create payment record
                yield tx.dealerSalePayment.create({
                    data: {
                        amount: new client_1.Prisma.Decimal(amount),
                        date,
                        description: description || "Payment received",
                        paymentMethod,
                        saleId,
                    },
                });
                // 3. Update sale
                const newPaidAmount = Number(sale.paidAmount) + amount;
                const newDueAmount = Number(sale.totalAmount) - newPaidAmount;
                yield tx.dealerSale.update({
                    where: { id: saleId },
                    data: {
                        paidAmount: new client_1.Prisma.Decimal(newPaidAmount),
                        dueAmount: newDueAmount > 0 ? new client_1.Prisma.Decimal(newDueAmount) : null,
                    },
                });
                // 4. Get current ledger balance
                const lastLedgerEntry = yield tx.dealerLedgerEntry.findFirst({
                    where: { dealerId: sale.dealerId },
                    orderBy: { createdAt: "desc" },
                });
                const currentBalance = lastLedgerEntry
                    ? Number(lastLedgerEntry.balance)
                    : 0;
                // 5. Create ledger entry
                const newBalance = currentBalance - amount;
                yield tx.dealerLedgerEntry.create({
                    data: {
                        type: "PAYMENT_RECEIVED",
                        amount: new client_1.Prisma.Decimal(amount),
                        balance: new client_1.Prisma.Decimal(newBalance),
                        date,
                        description: description || `Payment received - Invoice ${sale.invoiceNumber}`,
                        reference: reference || sale.invoiceNumber || undefined,
                        dealerId: sale.dealerId,
                        saleId: sale.id,
                        partyId: sale.customerId || sale.farmerId,
                        partyType: sale.customerId ? "CUSTOMER" : "FARMER",
                        imageUrl: receiptUrl,
                    },
                });
                // 6. Sync payment to farmer side if this is a linked sale
                if ((_a = sale.customer) === null || _a === void 0 ? void 0 : _a.farmerId) {
                    // This is a linked sale - find the farmer's purchase transaction
                    const purchaseTxn = yield tx.entityTransaction.findFirst({
                        where: {
                            dealerId: sale.dealerId,
                            reference: sale.invoiceNumber,
                            type: "PURCHASE",
                        },
                        orderBy: { createdAt: "desc" },
                    });
                    if (purchaseTxn) {
                        // Create PAYMENT EntityTransaction for farmer
                        yield tx.entityTransaction.create({
                            data: {
                                type: "PAYMENT",
                                amount: new client_1.Prisma.Decimal(amount),
                                date,
                                description: description || `Payment - Invoice ${sale.invoiceNumber}`,
                                reference: reference || sale.invoiceNumber || undefined,
                                dealerId: sale.dealerId,
                                paymentToPurchaseId: purchaseTxn.id,
                                imageUrl: receiptUrl,
                            },
                        });
                    }
                }
                // 7. Update Customer.balance to reflect the payment
                if (sale.customerId) {
                    const customer = yield tx.customer.findUnique({
                        where: { id: sale.customerId },
                        select: { balance: true },
                    });
                    if (customer) {
                        const currentCustomerBalance = Number(customer.balance || 0);
                        // Subtract payment from customer balance
                        const newCustomerBalance = currentCustomerBalance - amount;
                        yield tx.customer.update({
                            where: { id: sale.customerId },
                            data: {
                                balance: new client_1.Prisma.Decimal(newCustomerBalance),
                            },
                        });
                    }
                }
                return yield tx.dealerSale.findUnique({
                    where: { id: saleId },
                    include: {
                        payments: true,
                    },
                });
            }));
        });
    }
    /**
     * Add general payment without specific sale - auto-allocates to oldest unpaid sales using FIFO
     */
    static addGeneralPayment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { customerId, dealerId, amount, date, description, paymentMethod, receiptUrl, reference } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                // 1. Get customer with current balance
                const customer = yield tx.customer.findUnique({
                    where: { id: customerId },
                    select: { id: true, name: true, balance: true, farmerId: true },
                });
                if (!customer) {
                    throw new Error("Customer not found");
                }
                // 2. Fetch all unpaid sales for this customer, ordered by date (FIFO)
                const unpaidSales = yield tx.dealerSale.findMany({
                    where: {
                        dealerId,
                        customerId,
                        dueAmount: { gt: 0 },
                    },
                    orderBy: { date: "asc" }, // Oldest first (FIFO)
                    include: {
                        customer: true,
                    },
                });
                let remainingPayment = amount;
                const allocations = [];
                // 3. Allocate payment to sales using FIFO
                for (const sale of unpaidSales) {
                    if (remainingPayment <= 0)
                        break;
                    const saleDue = Number(sale.dueAmount || 0);
                    const allocationAmount = Math.min(remainingPayment, saleDue);
                    // Create payment record for this sale
                    yield tx.dealerSalePayment.create({
                        data: {
                            amount: new client_1.Prisma.Decimal(allocationAmount),
                            date,
                            description: description || `General payment allocation - Invoice ${sale.invoiceNumber}`,
                            paymentMethod,
                            saleId: sale.id,
                        },
                    });
                    // Update sale amounts
                    const newPaidAmount = Number(sale.paidAmount) + allocationAmount;
                    const newDueAmount = Number(sale.totalAmount) - newPaidAmount;
                    yield tx.dealerSale.update({
                        where: { id: sale.id },
                        data: {
                            paidAmount: new client_1.Prisma.Decimal(newPaidAmount),
                            dueAmount: newDueAmount > 0 ? new client_1.Prisma.Decimal(newDueAmount) : null,
                        },
                    });
                    // Track allocation for ledger entry
                    allocations.push({
                        saleId: sale.id,
                        amount: allocationAmount,
                        invoiceNumber: sale.invoiceNumber,
                    });
                    // Sync to farmer side if this is a linked sale
                    if ((_a = sale.customer) === null || _a === void 0 ? void 0 : _a.farmerId) {
                        const purchaseTxn = yield tx.entityTransaction.findFirst({
                            where: {
                                dealerId,
                                reference: sale.invoiceNumber,
                                type: "PURCHASE",
                            },
                            orderBy: { createdAt: "desc" },
                        });
                        if (purchaseTxn) {
                            yield tx.entityTransaction.create({
                                data: {
                                    type: "PAYMENT",
                                    amount: new client_1.Prisma.Decimal(allocationAmount),
                                    date,
                                    description: description || `Payment - Invoice ${sale.invoiceNumber}`,
                                    reference: reference || sale.invoiceNumber || undefined,
                                    dealerId,
                                    paymentToPurchaseId: purchaseTxn.id,
                                    imageUrl: receiptUrl,
                                },
                            });
                        }
                    }
                    remainingPayment -= allocationAmount;
                }
                // 3b. If there's remaining payment (advance), sync it to EntityTransaction
                if (remainingPayment > 0 && customer.farmerId) {
                    yield tx.entityTransaction.create({
                        data: {
                            type: "PAYMENT",
                            amount: new client_1.Prisma.Decimal(remainingPayment),
                            date,
                            description: description || `Advance payment - रू ${remainingPayment.toFixed(2)} credit`,
                            dealerId,
                            reference: reference || "ADVANCE",
                            imageUrl: receiptUrl,
                        },
                    });
                }
                // 4. Update Customer.balance with the full payment
                // Positive balance = customer owes dealer
                // Negative balance = dealer owes customer (advance)
                const currentBalance = Number(customer.balance);
                const newBalance = currentBalance - amount; // Subtract FULL payment amount
                yield tx.customer.update({
                    where: { id: customerId },
                    data: {
                        balance: new client_1.Prisma.Decimal(newBalance),
                    },
                });
                // 5. Get current ledger balance
                const lastLedgerEntry = yield tx.dealerLedgerEntry.findFirst({
                    where: { dealerId },
                    orderBy: { createdAt: "desc" },
                });
                const currentLedgerBalance = lastLedgerEntry ? Number(lastLedgerEntry.balance) : 0;
                // 6. Create ledger entry for the overall payment
                const ledgerBalance = currentLedgerBalance - amount;
                const allocationSummary = allocations.length > 0
                    ? `Allocated to ${allocations.length} sale(s)` +
                        (remainingPayment > 0 ? ` + रू ${remainingPayment.toFixed(2)} advance` : "")
                    : `Advance payment: रू ${amount.toFixed(2)}`;
                yield tx.dealerLedgerEntry.create({
                    data: {
                        type: "PAYMENT_RECEIVED",
                        amount: new client_1.Prisma.Decimal(amount),
                        balance: new client_1.Prisma.Decimal(ledgerBalance),
                        date,
                        description: description || `General payment from ${customer.name} - ${allocationSummary}`,
                        reference: reference || allocations.map(a => a.invoiceNumber).filter(Boolean).join(", ") || undefined,
                        dealerId,
                        partyId: customerId,
                        partyType: "CUSTOMER",
                        imageUrl: receiptUrl,
                    },
                });
                return {
                    success: true,
                    totalAmount: amount,
                    allocatedToSales: amount - remainingPayment,
                    advanceAmount: remainingPayment,
                    newCustomerBalance: newBalance,
                    allocations,
                };
            }));
        });
    }
    /**
     * Process consignment acceptance with partial support
     */
    static processConsignmentAcceptance(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { consignmentId, dealerId, items } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // 1. Get consignment
                const consignment = yield tx.consignmentRequest.findUnique({
                    where: { id: consignmentId },
                    include: {
                        items: true,
                    },
                });
                if (!consignment) {
                    throw new Error("Consignment not found");
                }
                if (consignment.toDealerId !== dealerId) {
                    throw new Error("Unauthorized to accept this consignment");
                }
                let totalAcceptedAmount = 0;
                let hasPartialAcceptance = false;
                let hasFullRejection = true;
                // 2. Process each item
                for (const item of items) {
                    const consignmentItem = consignment.items.find((ci) => ci.id === item.itemId);
                    if (!consignmentItem) {
                        throw new Error(`Consignment item ${item.itemId} not found`);
                    }
                    // Update consignment item
                    yield tx.consignmentItem.update({
                        where: { id: item.itemId },
                        data: {
                            isAccepted: item.isAccepted,
                            acceptedQuantity: item.isAccepted
                                ? new client_1.Prisma.Decimal(item.acceptedQuantity)
                                : null,
                            rejectionReason: item.rejectionReason,
                        },
                    });
                    if (item.isAccepted) {
                        hasFullRejection = false;
                        const acceptedAmount = item.acceptedQuantity * Number(consignmentItem.unitPrice);
                        totalAcceptedAmount += acceptedAmount;
                        // Check if partial acceptance
                        if (item.acceptedQuantity < Number(consignmentItem.quantity)) {
                            hasPartialAcceptance = true;
                        }
                        // 3. Create or update dealer product
                        const companyProductId = consignmentItem.companyProductId;
                        if (companyProductId) {
                            // Get company product details
                            const companyProduct = yield tx.product.findUnique({
                                where: { id: companyProductId },
                            });
                            if (!companyProduct) {
                                throw new Error(`Company product ${companyProductId} not found`);
                            }
                            // Check if dealer already has this product
                            let dealerProduct = yield tx.dealerProduct.findFirst({
                                where: {
                                    dealerId,
                                    companyProductId,
                                },
                            });
                            if (dealerProduct) {
                                // Update existing product
                                yield tx.dealerProduct.update({
                                    where: { id: dealerProduct.id },
                                    data: {
                                        currentStock: {
                                            increment: new client_1.Prisma.Decimal(item.acceptedQuantity),
                                        },
                                    },
                                });
                            }
                            else {
                                // Create new product
                                dealerProduct = yield tx.dealerProduct.create({
                                    data: {
                                        name: companyProduct.name,
                                        description: companyProduct.description,
                                        type: companyProduct.type,
                                        unit: companyProduct.unit,
                                        costPrice: consignmentItem.unitPrice,
                                        sellingPrice: consignmentItem.unitPrice, // Can be adjusted later
                                        currentStock: new client_1.Prisma.Decimal(item.acceptedQuantity),
                                        dealerId,
                                        companyProductId,
                                    },
                                });
                            }
                            // 4. Create product transaction
                            yield tx.dealerProductTransaction.create({
                                data: {
                                    type: "PURCHASE",
                                    quantity: new client_1.Prisma.Decimal(item.acceptedQuantity),
                                    unitPrice: consignmentItem.unitPrice,
                                    totalAmount: new client_1.Prisma.Decimal(acceptedAmount),
                                    date: new Date(),
                                    description: `Consignment ${consignment.requestNumber}`,
                                    reference: consignment.requestNumber,
                                    productId: dealerProduct.id,
                                },
                            });
                        }
                    }
                }
                // 5. Update consignment status
                let newStatus;
                if (hasFullRejection) {
                    newStatus = "REJECTED";
                }
                else if (hasPartialAcceptance) {
                    newStatus = "PARTIALLY_ACCEPTED";
                }
                else {
                    newStatus = "COMPLETED";
                }
                yield tx.consignmentRequest.update({
                    where: { id: consignmentId },
                    data: { status: newStatus },
                });
                // 6. Create ledger entry if any items were accepted
                if (totalAcceptedAmount > 0) {
                    const lastLedgerEntry = yield tx.dealerLedgerEntry.findFirst({
                        where: { dealerId },
                        orderBy: { createdAt: "desc" },
                    });
                    const currentBalance = lastLedgerEntry
                        ? Number(lastLedgerEntry.balance)
                        : 0;
                    const newBalance = currentBalance + totalAcceptedAmount;
                    yield tx.dealerLedgerEntry.create({
                        data: {
                            type: "PURCHASE",
                            amount: new client_1.Prisma.Decimal(totalAcceptedAmount),
                            balance: new client_1.Prisma.Decimal(newBalance),
                            date: new Date(),
                            description: `Consignment ${consignment.requestNumber}`,
                            reference: consignment.requestNumber,
                            dealerId,
                            consignmentId: consignment.id,
                            partyId: consignment.fromCompanyId || undefined,
                            partyType: "COMPANY",
                        },
                    });
                }
                return yield tx.consignmentRequest.findUnique({
                    where: { id: consignmentId },
                    include: {
                        items: {
                            include: {
                                companyProduct: true,
                                dealerProduct: true,
                            },
                        },
                    },
                });
            }));
        });
    }
    /**
     * Calculate dealer balance
     */
    static calculateBalance(dealerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const lastEntry = yield prisma_1.default.dealerLedgerEntry.findFirst({
                where: { dealerId },
                orderBy: { createdAt: "desc" },
            });
            return lastEntry ? Number(lastEntry.balance) : 0;
        });
    }
    /**
     * Get ledger entries with filters
     */
    static getLedgerEntries(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { dealerId, type, partyId, startDate, endDate, page = 1, limit = 50, } = params;
            const where = { dealerId };
            if (type) {
                where.type = type;
            }
            if (partyId) {
                where.partyId = partyId;
            }
            if (startDate || endDate) {
                where.date = {};
                if (startDate)
                    where.date.gte = startDate;
                if (endDate)
                    where.date.lte = endDate;
            }
            const skip = (page - 1) * limit;
            const [entries, total] = yield Promise.all([
                prisma_1.default.dealerLedgerEntry.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { date: "desc" },
                    include: {
                        sale: {
                            include: {
                                customer: true,
                                farmer: true,
                            },
                        },
                        consignment: true,
                    },
                }),
                prisma_1.default.dealerLedgerEntry.count({ where }),
            ]);
            return {
                entries,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        });
    }
}
exports.DealerService = DealerService;
