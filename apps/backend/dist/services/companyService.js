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
exports.CompanyService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const discountHelpers_1 = require("../utils/discountHelpers");
class CompanyService {
    /**
     * Create a company sale with inventory updates and account balance updates
     */
    static createCompanySale(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { companyId, dealerId, soldById, items, paymentMethod, notes, date, overrideBalanceLimit, discount: discountInput, } = data;
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
            const itemTotals = discountAmount > 0
                ? (0, discountHelpers_1.distributeDiscountToItems)(subtotal, discountAmount, items)
                : items.map((item) => item.quantity * item.unitPrice);
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // 1. Validate stock availability for all items
                for (const item of items) {
                    const product = yield tx.product.findUnique({
                        where: { id: item.productId },
                    });
                    if (!product) {
                        throw new Error(`Product ${item.productId} not found`);
                    }
                    if (Number(product.currentStock) < item.quantity) {
                        throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}`);
                    }
                }
                // 2. Get dealer info
                const dealer = yield tx.dealer.findUnique({
                    where: { id: dealerId },
                });
                if (!dealer) {
                    throw new Error("Dealer not found");
                }
                const isCredit = paymentMethod === "CREDIT";
                // 4. Get or create account for company-dealer pair
                let account = yield tx.companyDealerAccount.findUnique({
                    where: {
                        companyId_dealerId: {
                            companyId,
                            dealerId,
                        },
                    },
                    select: {
                        id: true,
                        balance: true,
                        balanceLimit: true,
                    },
                });
                if (!account) {
                    const created = yield tx.companyDealerAccount.create({
                        data: {
                            companyId,
                            dealerId,
                            balance: new client_1.Prisma.Decimal(0),
                            totalSales: new client_1.Prisma.Decimal(0),
                            totalPayments: new client_1.Prisma.Decimal(0),
                        },
                    });
                    account = {
                        id: created.id,
                        balance: created.balance,
                        balanceLimit: created.balanceLimit,
                    };
                }
                // Check balance limit before creating sale
                if (account.balanceLimit) {
                    const currentBalance = Number(account.balance);
                    const newBalance = currentBalance + totalAmount;
                    const limit = Number(account.balanceLimit);
                    if (newBalance > limit && !overrideBalanceLimit) {
                        throw new Error(`Balance limit exceeded. Current: ${currentBalance}, New: ${newBalance}, Limit: ${limit}. ` +
                            `Exceeds by: ${(newBalance - limit).toFixed(2)}`);
                    }
                }
                // 5. Generate invoice number
                const invoiceNumber = `CINV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                // 6. Create the sale (account-based system)
                const sale = yield tx.companySale.create({
                    data: {
                        invoiceNumber,
                        date,
                        subtotalAmount: discountAmount > 0
                            ? new client_1.Prisma.Decimal(subtotal)
                            : undefined,
                        totalAmount: new client_1.Prisma.Decimal(totalAmount),
                        isCredit,
                        paymentMethod: paymentMethod || "CASH",
                        notes,
                        companyId,
                        dealerId,
                        soldById,
                        accountId: account.id,
                    },
                });
                if (discountAmount > 0 && discountInput) {
                    yield tx.saleDiscount.create({
                        data: {
                            type: discountInput.type,
                            value: new client_1.Prisma.Decimal(discountInput.value),
                            scope: "SALE",
                            companySaleId: sale.id,
                        },
                    });
                }
                // 6b. Create sale items and update stock
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    yield tx.companySaleItem.create({
                        data: {
                            saleId: sale.id,
                            productId: item.productId,
                            quantity: new client_1.Prisma.Decimal(item.quantity),
                            unitPrice: new client_1.Prisma.Decimal(item.unitPrice),
                            totalAmount: new client_1.Prisma.Decimal(itemTotals[i]),
                            unit: item.unit || null,
                        },
                    });
                    // Update product stock
                    yield tx.product.update({
                        where: { id: item.productId },
                        data: {
                            currentStock: {
                                decrement: new client_1.Prisma.Decimal(item.quantity),
                            },
                        },
                    });
                }
                // 7. Update CompanyDealerAccount with sale amount
                yield tx.companyDealerAccount.update({
                    where: { id: account.id },
                    data: {
                        balance: {
                            increment: new client_1.Prisma.Decimal(totalAmount),
                        },
                        totalSales: {
                            increment: new client_1.Prisma.Decimal(totalAmount),
                        },
                        lastSaleDate: date,
                    },
                });
                // 8. Get current ledger balance for this dealer
                const lastLedgerEntry = yield tx.companyLedgerEntry.findFirst({
                    where: {
                        companyId,
                        partyId: dealerId,
                        partyType: "DEALER",
                    },
                    orderBy: { createdAt: "desc" },
                });
                const currentLedgerBalance = lastLedgerEntry
                    ? Number(lastLedgerEntry.runningBalance)
                    : 0;
                // 9. Create ledger entry for sale (for transaction history)
                const newLedgerBalance = currentLedgerBalance + totalAmount;
                yield tx.companyLedgerEntry.create({
                    data: {
                        type: "SALE",
                        entryType: "SALE",
                        amount: new client_1.Prisma.Decimal(totalAmount),
                        runningBalance: new client_1.Prisma.Decimal(newLedgerBalance),
                        date,
                        description: `Sale to ${dealer.name} - Invoice ${invoiceNumber}`,
                        companyId,
                        companySaleId: sale.id,
                        partyId: dealerId,
                        partyType: "DEALER",
                        transactionId: sale.id,
                        transactionType: "SALE",
                    },
                });
                // 10. Return sale with all relations
                return yield tx.companySale.findUnique({
                    where: { id: sale.id },
                    include: {
                        discount: true,
                        items: {
                            include: {
                                product: true,
                            },
                        },
                        account: true,
                        dealer: true,
                    },
                });
            }));
        });
    }
    // addSalePayment method removed - use CompanyDealerAccountService.recordPayment instead
    /**
     * Create consignment request from company to dealer
     */
    static createConsignmentRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { companyId, dealerId, items, notes } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // 1. Validate products
                for (const item of items) {
                    const product = yield tx.product.findUnique({
                        where: { id: item.productId },
                    });
                    if (!product) {
                        throw new Error(`Product ${item.productId} not found`);
                    }
                    if (Number(product.currentStock) < item.quantity) {
                        throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}`);
                    }
                }
                // 2. Calculate total amount
                const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
                // 3. Generate request number
                const requestNumber = `CONS-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                // 4. Create consignment request
                const consignment = yield tx.consignmentRequest.create({
                    data: {
                        requestNumber,
                        status: client_1.ConsignmentStatus.CREATED,
                        direction: "COMPANY_TO_DEALER",
                        totalAmount: new client_1.Prisma.Decimal(totalAmount),
                        requestedQuantity: new client_1.Prisma.Decimal(items.reduce((sum, item) => sum + item.quantity, 0)),
                        notes,
                        fromCompanyId: companyId,
                        toDealerId: dealerId,
                    },
                });
                // 5. Create consignment items
                for (const item of items) {
                    yield tx.consignmentItem.create({
                        data: {
                            consignmentId: consignment.id,
                            companyProductId: item.productId,
                            quantity: new client_1.Prisma.Decimal(item.quantity),
                            unitPrice: new client_1.Prisma.Decimal(item.unitPrice),
                            totalAmount: new client_1.Prisma.Decimal(item.quantity * item.unitPrice),
                            unit: item.unit || null,
                        },
                    });
                }
                return yield tx.consignmentRequest.findUnique({
                    where: { id: consignment.id },
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
            }));
        });
    }
    /**
     * Approve consignment request (company approves dealer's request)
     */
    static approveConsignmentRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { consignmentId, companyId } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const consignment = yield tx.consignmentRequest.findFirst({
                    where: {
                        id: consignmentId,
                        fromCompanyId: companyId,
                    },
                });
                if (!consignment) {
                    throw new Error("Consignment not found");
                }
                if (consignment.status !== client_1.ConsignmentStatus.CREATED) {
                    throw new Error(`Cannot approve consignment with status: ${consignment.status}`);
                }
                return yield tx.consignmentRequest.update({
                    where: { id: consignmentId },
                    data: {
                        status: client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
                    },
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
            }));
        });
    }
    /**
     * Dispatch consignment (company sends goods)
     */
    static dispatchConsignment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { consignmentId, companyId, notes } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const consignment = yield tx.consignmentRequest.findFirst({
                    where: {
                        id: consignmentId,
                        fromCompanyId: companyId,
                    },
                    include: {
                        items: true,
                    },
                });
                if (!consignment) {
                    throw new Error("Consignment not found");
                }
                if (consignment.status !== client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH) {
                    throw new Error(`Cannot dispatch consignment with status: ${consignment.status}`);
                }
                // Update product stock for dispatched items
                for (const item of consignment.items) {
                    if (item.companyProductId) {
                        yield tx.product.update({
                            where: { id: item.companyProductId },
                            data: {
                                currentStock: {
                                    decrement: item.quantity,
                                },
                            },
                        });
                    }
                }
                return yield tx.consignmentRequest.update({
                    where: { id: consignmentId },
                    data: {
                        status: "DISPATCHED",
                        notes: notes ? `${consignment.notes || ''}\nDispatch notes: ${notes}` : consignment.notes,
                    },
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
            }));
        });
    }
    /**
     * Calculate company balance with a specific dealer
     */
    static calculateDealerBalance(companyId, dealerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const lastEntry = yield prisma_1.default.companyLedgerEntry.findFirst({
                where: {
                    companyId,
                    partyId: dealerId,
                    partyType: "DEALER",
                },
                orderBy: { createdAt: "desc" },
            });
            return lastEntry ? Number(lastEntry.runningBalance) : 0;
        });
    }
    /**
     * Get ledger entries with filters
     */
    static getLedgerEntries(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { companyId, type, partyId, startDate, endDate, page = 1, limit = 50, } = params;
            const where = { companyId };
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
                prisma_1.default.companyLedgerEntry.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { date: "desc" },
                    include: {
                        companySale: {
                            include: {
                                dealer: true,
                            },
                        },
                    },
                }),
                prisma_1.default.companyLedgerEntry.count({ where }),
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
    /**
     * Get company statistics
     */
    static getStatistics(companyId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const where = { companyId };
            if (startDate || endDate) {
                where.date = {};
                if (startDate)
                    where.date.gte = startDate;
                if (endDate)
                    where.date.lte = endDate;
            }
            const [sales, totalRevenue, activeConsignments] = yield Promise.all([
                prisma_1.default.companySale.count({ where }),
                prisma_1.default.companySale.aggregate({
                    where,
                    _sum: { totalAmount: true },
                }),
                prisma_1.default.consignmentRequest.count({
                    where: {
                        fromCompanyId: companyId,
                        status: { in: [client_1.ConsignmentStatus.CREATED, client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH, client_1.ConsignmentStatus.DISPATCHED] },
                    },
                }),
            ]);
            return {
                totalSales: sales,
                totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
                activeConsignments,
            };
        });
    }
    /**
     * Create a payment request
     */
    static createPaymentRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { companyId, dealerId, requestedById, amount, companySaleId, description, direction, } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // Generate request number
                const requestNumber = `PR-${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 7)
                    .toUpperCase()}`;
                // Create payment request
                const paymentRequest = yield tx.paymentRequest.create({
                    data: {
                        requestNumber,
                        amount: new client_1.Prisma.Decimal(amount),
                        direction,
                        status: client_1.PaymentRequestStatus.PENDING,
                        description,
                        companyId,
                        dealerId,
                        requestedById,
                        companySaleId: companySaleId !== null && companySaleId !== void 0 ? companySaleId : null,
                    },
                    include: {
                        company: true,
                        dealer: true,
                        companySale: true,
                        requestedBy: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                    },
                });
                return paymentRequest;
            }));
        });
    }
    /**
     * Accept payment request
     * For COMPANY_TO_DEALER: dealer accepts company's payment request
     * For DEALER_TO_COMPANY: company accepts dealer's payment request
     */
    static acceptPaymentRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { requestId, dealerId, companyId, acceptedById } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const where = {
                    id: requestId,
                    status: client_1.PaymentRequestStatus.PENDING,
                };
                if (dealerId) {
                    where.dealerId = dealerId;
                }
                if (companyId) {
                    where.companyId = companyId;
                }
                const request = yield tx.paymentRequest.findFirst({
                    where,
                });
                if (!request) {
                    throw new Error("Payment request not found or already processed");
                }
                const updated = yield tx.paymentRequest.update({
                    where: { id: requestId },
                    data: {
                        status: client_1.PaymentRequestStatus.ACCEPTED,
                        acceptedById,
                        acceptedAt: new Date(),
                    },
                    include: {
                        company: true,
                        dealer: true,
                        companySale: true,
                    },
                });
                return updated;
            }));
        });
    }
    /**
     * Submit payment proof (dealer submits)
     * For dealer-initiated requests (DEALER_TO_COMPANY), can submit directly from PENDING
     * For company-initiated requests (COMPANY_TO_DEALER), must be ACCEPTED first
     */
    static submitPaymentProof(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { requestId, dealerId, submittedById, paymentMethod, paymentReference, paymentReceiptUrl, paymentDate, } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const request = yield tx.paymentRequest.findFirst({
                    where: {
                        id: requestId,
                        dealerId,
                    },
                });
                if (!request) {
                    throw new Error("Payment request not found");
                }
                // For dealer-initiated requests, can submit directly from PENDING
                // For company-initiated requests, must be ACCEPTED first
                if (request.direction === client_1.PaymentRequestDirection.COMPANY_TO_DEALER) {
                    if (request.status !== client_1.PaymentRequestStatus.ACCEPTED) {
                        throw new Error("Payment request must be accepted before submitting proof");
                    }
                }
                else if (request.direction === client_1.PaymentRequestDirection.DEALER_TO_COMPANY) {
                    if (request.status !== client_1.PaymentRequestStatus.PENDING && request.status !== client_1.PaymentRequestStatus.ACCEPTED) {
                        throw new Error("Payment request must be in PENDING or ACCEPTED status to submit proof");
                    }
                }
                const updated = yield tx.paymentRequest.update({
                    where: { id: requestId },
                    data: {
                        status: client_1.PaymentRequestStatus.PAYMENT_SUBMITTED,
                        paymentMethod,
                        paymentReference,
                        paymentReceiptUrl,
                        paymentDate,
                        submittedById,
                        submittedAt: new Date(),
                    },
                    include: {
                        company: true,
                        dealer: true,
                        companySale: true,
                    },
                });
                return updated;
            }));
        });
    }
    /**
     * Cancel payment request
     */
    static cancelPaymentRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { requestId, companyId, dealerId, cancelledById } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const where = { id: requestId };
                if (companyId) {
                    where.companyId = companyId;
                }
                if (dealerId) {
                    where.dealerId = dealerId;
                }
                const request = yield tx.paymentRequest.findFirst({
                    where: Object.assign(Object.assign({}, where), { status: client_1.PaymentRequestStatus.PENDING }),
                });
                if (!request) {
                    throw new Error("Payment request not found or cannot be cancelled");
                }
                const updated = yield tx.paymentRequest.update({
                    where: { id: requestId },
                    data: {
                        status: client_1.PaymentRequestStatus.CANCELLED,
                        reviewedById: cancelledById,
                        reviewedAt: new Date(),
                        reviewNotes: "Cancelled by user",
                    },
                    include: {
                        company: true,
                        dealer: true,
                        companySale: true,
                    },
                });
                return updated;
            }));
        });
    }
    /**
     * Apply payment to multiple sales automatically (oldest first)
     */
    // applyPaymentToSales method removed - using account-based payment system
    /**
     * Verify payment request (company verifies and approves)
     */
    static verifyPaymentRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { requestId, companyId, reviewedById, isApproved, reviewNotes } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const request = yield tx.paymentRequest.findFirst({
                    where: {
                        id: requestId,
                        companyId,
                        status: client_1.PaymentRequestStatus.PAYMENT_SUBMITTED,
                    },
                    include: {
                        companySale: true,
                    },
                });
                if (!request) {
                    throw new Error("Payment request not found or not in PAYMENT_SUBMITTED status");
                }
                if (isApproved) {
                    const paymentAmount = Number(request.amount);
                    const paymentDate = request.paymentDate || new Date();
                    const paymentMethod = request.paymentMethod || "CASH";
                    // Get or create account for company-dealer pair
                    let account = yield tx.companyDealerAccount.findUnique({
                        where: {
                            companyId_dealerId: {
                                companyId,
                                dealerId: request.dealerId,
                            },
                        },
                    });
                    if (!account) {
                        account = yield tx.companyDealerAccount.create({
                            data: {
                                companyId,
                                dealerId: request.dealerId,
                                balance: new client_1.Prisma.Decimal(0),
                                totalSales: new client_1.Prisma.Decimal(0),
                                totalPayments: new client_1.Prisma.Decimal(0),
                            },
                        });
                    }
                    // Calculate new balance
                    const newBalance = Number(account.balance) - paymentAmount;
                    // Update account with payment
                    yield tx.companyDealerAccount.update({
                        where: { id: account.id },
                        data: {
                            balance: new client_1.Prisma.Decimal(newBalance),
                            totalPayments: {
                                increment: paymentAmount,
                            },
                            lastPaymentDate: paymentDate,
                        },
                    });
                    // Create CompanyDealerPayment record
                    yield tx.companyDealerPayment.create({
                        data: {
                            accountId: account.id,
                            amount: new client_1.Prisma.Decimal(paymentAmount),
                            paymentMethod,
                            paymentDate,
                            notes: `Payment via request ${request.requestNumber}${reviewNotes ? ` - ${reviewNotes}` : ''}`,
                            reference: request.requestNumber,
                            receiptImageUrl: request.paymentReceiptUrl,
                            balanceAfter: new client_1.Prisma.Decimal(newBalance),
                            recordedById: reviewedById,
                        },
                    });
                    // Create ledger entry for transaction history
                    const lastLedgerEntry = yield tx.companyLedgerEntry.findFirst({
                        where: {
                            companyId,
                            partyId: request.dealerId,
                            partyType: "DEALER",
                        },
                        orderBy: { createdAt: "desc" },
                    });
                    const ledgerBalance = lastLedgerEntry
                        ? Number(lastLedgerEntry.runningBalance)
                        : 0;
                    const newLedgerBalance = ledgerBalance - paymentAmount;
                    yield tx.companyLedgerEntry.create({
                        data: {
                            companyId,
                            companySaleId: request.companySaleId,
                            partyId: request.dealerId,
                            partyType: "DEALER",
                            transactionId: requestId,
                            transactionType: "RECEIPT",
                            type: client_1.LedgerEntryType.PAYMENT_RECEIVED,
                            entryType: client_1.LedgerEntryType.PAYMENT_RECEIVED,
                            amount: new client_1.Prisma.Decimal(paymentAmount),
                            runningBalance: new client_1.Prisma.Decimal(newLedgerBalance),
                            date: paymentDate,
                            description: `Payment via request ${request.requestNumber}`,
                        },
                    });
                    // Payment is already applied to account above - no per-sale logic needed
                    // Update request status
                    const updated = yield tx.paymentRequest.update({
                        where: { id: requestId },
                        data: {
                            status: client_1.PaymentRequestStatus.VERIFIED,
                            reviewedById,
                            reviewedAt: new Date(),
                            reviewNotes,
                        },
                        include: {
                            company: true,
                            dealer: true,
                            companySale: true,
                        },
                    });
                    return updated;
                }
                else {
                    // Reject payment
                    const updated = yield tx.paymentRequest.update({
                        where: { id: requestId },
                        data: {
                            status: client_1.PaymentRequestStatus.REJECTED,
                            reviewedById,
                            reviewedAt: new Date(),
                            reviewNotes,
                        },
                        include: {
                            company: true,
                            dealer: true,
                            companySale: true,
                        },
                    });
                    return updated;
                }
            }));
        });
    }
    /**
     * Get payment requests with filters
     */
    static getPaymentRequests(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { companyId, dealerId, status, direction, page = 1, limit = 50, } = params;
            const where = {};
            if (companyId)
                where.companyId = companyId;
            if (dealerId)
                where.dealerId = dealerId;
            if (status)
                where.status = status;
            if (direction)
                where.direction = direction;
            const skip = (page - 1) * limit;
            const [requests, total] = yield Promise.all([
                prisma_1.default.paymentRequest.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: "desc" },
                    include: {
                        company: true,
                        dealer: true,
                        companySale: {
                            select: {
                                id: true,
                                invoiceNumber: true,
                                totalAmount: true,
                            },
                        },
                        requestedBy: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                        acceptedBy: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                        submittedBy: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                        reviewedBy: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                    },
                }),
                prisma_1.default.paymentRequest.count({ where }),
            ]);
            return {
                requests,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        });
    }
}
exports.CompanyService = CompanyService;
