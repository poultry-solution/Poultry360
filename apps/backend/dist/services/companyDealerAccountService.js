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
exports.CompanyDealerAccountService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
class CompanyDealerAccountService {
    /**
     * Get or create account for company-dealer pair
     * Uses upsert to prevent race conditions
     */
    static getOrCreateAccount(companyId, dealerId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use upsert to atomically get or create - prevents race conditions
            const account = yield prisma_1.default.companyDealerAccount.upsert({
                where: {
                    companyId_dealerId: {
                        companyId,
                        dealerId,
                    },
                },
                update: {}, // Don't update if exists, just return it
                create: {
                    companyId,
                    dealerId,
                    balance: new client_1.Prisma.Decimal(0),
                    totalSales: new client_1.Prisma.Decimal(0),
                    totalPayments: new client_1.Prisma.Decimal(0),
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                        },
                    },
                    dealer: {
                        select: {
                            id: true,
                            name: true,
                            contact: true,
                            address: true,
                        },
                    },
                },
            });
            return account;
        });
    }
    /**
     * Record sale and update account balance
     */
    static recordSale(companyId, dealerId, saleAmount, saleId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // Use upsert to ensure account exists (prevents race conditions)
                const account = yield tx.companyDealerAccount.upsert({
                    where: {
                        companyId_dealerId: {
                            companyId,
                            dealerId,
                        },
                    },
                    update: {
                        balance: { increment: new client_1.Prisma.Decimal(saleAmount) },
                        totalSales: { increment: new client_1.Prisma.Decimal(saleAmount) },
                        lastSaleDate: new Date(),
                    },
                    create: {
                        companyId,
                        dealerId,
                        balance: new client_1.Prisma.Decimal(saleAmount),
                        totalSales: new client_1.Prisma.Decimal(saleAmount),
                        totalPayments: new client_1.Prisma.Decimal(0),
                        lastSaleDate: new Date(),
                    },
                });
                // Link the sale to the account
                yield tx.companySale.update({
                    where: { id: saleId },
                    data: {
                        accountId: account.id,
                    },
                });
                return account;
            }));
        });
    }
    /**
     * Record payment and update account balance
     */
    static recordPayment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // Use upsert to ensure account exists (prevents race conditions)
                const account = yield tx.companyDealerAccount.upsert({
                    where: {
                        companyId_dealerId: {
                            companyId: data.companyId,
                            dealerId: data.dealerId,
                        },
                    },
                    update: {
                        balance: { decrement: new client_1.Prisma.Decimal(data.amount) },
                        totalPayments: { increment: new client_1.Prisma.Decimal(data.amount) },
                        lastPaymentDate: data.paymentDate || new Date(),
                    },
                    create: {
                        companyId: data.companyId,
                        dealerId: data.dealerId,
                        balance: new client_1.Prisma.Decimal(-data.amount), // Negative = advance payment
                        totalSales: new client_1.Prisma.Decimal(0),
                        totalPayments: new client_1.Prisma.Decimal(data.amount),
                        lastPaymentDate: data.paymentDate || new Date(),
                    },
                });
                // Get the updated balance after payment (already updated in upsert above)
                const newBalance = Number(account.balance);
                // Create payment record
                const payment = yield tx.companyDealerPayment.create({
                    data: {
                        accountId: account.id,
                        amount: new client_1.Prisma.Decimal(data.amount),
                        paymentMethod: data.paymentMethod || "CASH",
                        paymentDate: data.paymentDate || new Date(),
                        notes: data.notes,
                        reference: data.reference,
                        receiptImageUrl: data.receiptImageUrl,
                        proofImageUrl: data.proofImageUrl,
                        balanceAfter: new client_1.Prisma.Decimal(newBalance),
                        recordedById: data.recordedById,
                    },
                });
                return {
                    payment,
                    account,
                };
            }));
        });
    }
    /**
     * Get account balance
     */
    static getAccountBalance(companyId, dealerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = yield prisma_1.default.companyDealerAccount.findUnique({
                where: {
                    companyId_dealerId: {
                        companyId,
                        dealerId,
                    },
                },
                select: {
                    id: true,
                    balance: true,
                    totalSales: true,
                    totalPayments: true,
                    lastSaleDate: true,
                    lastPaymentDate: true,
                },
            });
            return account;
        });
    }
    /**
     * Get account statement (sales and payments)
     */
    static getAccountStatement(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { companyId, dealerId, startDate, endDate, page = 1, limit = 50 } = params;
            const account = yield this.getOrCreateAccount(companyId, dealerId);
            const skip = (page - 1) * limit;
            // Build date filter
            const dateFilter = {};
            if (startDate) {
                dateFilter.gte = startDate;
            }
            if (endDate) {
                dateFilter.lte = endDate;
            }
            // Get sales
            const salesWhere = {
                companyId,
                dealerId,
                accountId: account.id,
            };
            if (startDate || endDate) {
                salesWhere.date = dateFilter;
            }
            const [sales, salesCount] = yield Promise.all([
                prisma_1.default.companySale.findMany({
                    where: salesWhere,
                    select: {
                        id: true,
                        invoiceNumber: true,
                        date: true,
                        subtotalAmount: true,
                        totalAmount: true,
                        notes: true,
                        invoiceImageUrl: true,
                        discount: { select: { type: true, value: true } },
                    },
                    orderBy: { date: "desc" },
                    skip,
                    take: limit,
                }),
                prisma_1.default.companySale.count({ where: salesWhere }),
            ]);
            // Get payments
            const paymentsWhere = {
                accountId: account.id,
            };
            if (startDate || endDate) {
                paymentsWhere.paymentDate = dateFilter;
            }
            const [payments, paymentsCount] = yield Promise.all([
                prisma_1.default.companyDealerPayment.findMany({
                    where: paymentsWhere,
                    select: {
                        id: true,
                        amount: true,
                        paymentMethod: true,
                        paymentDate: true,
                        notes: true,
                        reference: true,
                        receiptImageUrl: true,
                        proofImageUrl: true,
                        balanceAfter: true,
                    },
                    orderBy: { paymentDate: "desc" },
                    skip,
                    take: limit,
                }),
                prisma_1.default.companyDealerPayment.count({ where: paymentsWhere }),
            ]);
            // Format sales (include discount for statement UI)
            const formattedSales = sales.map((sale) => {
                var _a, _b, _c;
                return ({
                    id: sale.id,
                    invoiceNumber: sale.invoiceNumber,
                    date: sale.date,
                    amount: Number(sale.totalAmount),
                    subtotalAmount: sale.subtotalAmount != null ? Number(sale.subtotalAmount) : null,
                    discountType: (_b = (_a = sale.discount) === null || _a === void 0 ? void 0 : _a.type) !== null && _b !== void 0 ? _b : null,
                    discountValue: ((_c = sale.discount) === null || _c === void 0 ? void 0 : _c.value) != null ? Number(sale.discount.value) : null,
                    notes: sale.notes,
                    invoiceImageUrl: sale.invoiceImageUrl,
                });
            });
            // Format payments
            const formattedPayments = payments.map((payment) => ({
                id: payment.id,
                amount: Number(payment.amount),
                paymentMethod: payment.paymentMethod,
                paymentDate: payment.paymentDate,
                notes: payment.notes,
                reference: payment.reference,
                receiptImageUrl: payment.receiptImageUrl,
                proofImageUrl: payment.proofImageUrl,
                balanceAfter: Number(payment.balanceAfter),
            }));
            // Also return combined transactions for backward compatibility (if needed)
            const transactions = [
                ...formattedSales.map((sale) => ({
                    type: "SALE",
                    id: sale.id,
                    date: sale.date,
                    amount: sale.amount,
                    subtotalAmount: sale.subtotalAmount,
                    discountType: sale.discountType,
                    discountValue: sale.discountValue,
                    reference: sale.invoiceNumber,
                    notes: sale.notes,
                    imageUrl: sale.invoiceImageUrl,
                })),
                ...formattedPayments.map((payment) => ({
                    type: "PAYMENT",
                    id: payment.id,
                    date: payment.paymentDate,
                    amount: payment.amount,
                    reference: payment.reference,
                    notes: payment.notes,
                    paymentMethod: payment.paymentMethod,
                    imageUrl: payment.receiptImageUrl,
                    balanceAfter: payment.balanceAfter,
                })),
            ].sort((a, b) => b.date.getTime() - a.date.getTime());
            return {
                account: {
                    id: account.id,
                    balance: Number(account.balance),
                    totalSales: Number(account.totalSales),
                    totalPayments: Number(account.totalPayments),
                    lastSaleDate: account.lastSaleDate,
                    lastPaymentDate: account.lastPaymentDate,
                    company: account.company,
                    dealer: account.dealer,
                },
                sales: formattedSales,
                payments: formattedPayments,
                transactions, // Keep for backward compatibility
                pagination: {
                    page,
                    limit,
                    totalSales: salesCount,
                    totalPayments: paymentsCount,
                    totalTransactions: salesCount + paymentsCount,
                    totalPages: Math.ceil((salesCount + paymentsCount) / limit),
                },
            };
        });
    }
    /**
     * Get all accounts for a company
     */
    static getCompanyAccounts(companyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const accounts = yield prisma_1.default.companyDealerAccount.findMany({
                where: { companyId },
                include: {
                    dealer: {
                        select: {
                            id: true,
                            name: true,
                            contact: true,
                            address: true,
                        },
                    },
                },
                orderBy: { balance: "desc" },
            });
            return accounts.map((account) => ({
                id: account.id,
                dealerId: account.dealerId,
                dealerName: account.dealer.name,
                dealerContact: account.dealer.contact,
                dealerAddress: account.dealer.address,
                balance: Number(account.balance),
                totalSales: Number(account.totalSales),
                totalPayments: Number(account.totalPayments),
                lastSaleDate: account.lastSaleDate,
                lastPaymentDate: account.lastPaymentDate,
            }));
        });
    }
    /**
     * Set or update balance limit for a dealer account
     */
    static setBalanceLimit(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { companyId, dealerId, balanceLimit, setById } = params;
            const account = yield prisma_1.default.companyDealerAccount.upsert({
                where: {
                    companyId_dealerId: { companyId, dealerId },
                },
                update: {
                    balanceLimit: balanceLimit !== null ? new client_1.Prisma.Decimal(balanceLimit) : null,
                    balanceLimitSetAt: new Date(),
                    balanceLimitSetBy: setById,
                },
                create: {
                    companyId,
                    dealerId,
                    balance: new client_1.Prisma.Decimal(0),
                    totalSales: new client_1.Prisma.Decimal(0),
                    totalPayments: new client_1.Prisma.Decimal(0),
                    balanceLimit: balanceLimit !== null ? new client_1.Prisma.Decimal(balanceLimit) : null,
                    balanceLimitSetAt: new Date(),
                    balanceLimitSetBy: setById,
                },
                include: {
                    company: { select: { id: true, name: true, address: true } },
                    dealer: { select: { id: true, name: true, contact: true, address: true } },
                },
            });
            return account;
        });
    }
    /**
     * Check if a sale would exceed the balance limit
     * Returns { allowed: boolean, currentBalance: number, newBalance: number, limit: number | null, exceedsBy?: number }
     */
    static checkBalanceLimit(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { companyId, dealerId, saleAmount } = params;
            const account = yield prisma_1.default.companyDealerAccount.findUnique({
                where: {
                    companyId_dealerId: { companyId, dealerId },
                },
                select: { balance: true, balanceLimit: true },
            });
            const currentBalance = account ? Number(account.balance) : 0;
            const newBalance = currentBalance + saleAmount;
            const limit = (account === null || account === void 0 ? void 0 : account.balanceLimit) ? Number(account.balanceLimit) : null;
            if (limit === null) {
                return { allowed: true, currentBalance, newBalance, limit: null };
            }
            const allowed = newBalance <= limit;
            const exceedsBy = !allowed ? newBalance - limit : undefined;
            return Object.assign({ allowed,
                currentBalance,
                newBalance,
                limit }, (exceedsBy !== undefined && { exceedsBy }));
        });
    }
    /**
     * Get all accounts for a dealer
     */
    static getDealerAccounts(dealerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const accounts = yield prisma_1.default.companyDealerAccount.findMany({
                where: { dealerId },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                        },
                    },
                },
                orderBy: { balance: "desc" },
            });
            return accounts.map((account) => ({
                id: account.id,
                companyId: account.companyId,
                companyName: account.company.name,
                companyAddress: account.company.address,
                balance: Number(account.balance),
                totalSales: Number(account.totalSales),
                totalPayments: Number(account.totalPayments),
                lastSaleDate: account.lastSaleDate,
                lastPaymentDate: account.lastPaymentDate,
            }));
        });
    }
    /**
     * Get all payments for a company across all dealers
     */
    static getAllPayments(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { companyId, startDate, endDate, page = 1, limit = 50, dealerId } = params;
            const skip = (page - 1) * limit;
            const where = {
                account: {
                    companyId,
                },
            };
            if (dealerId) {
                where.account.dealerId = dealerId;
            }
            if (startDate || endDate) {
                where.paymentDate = {};
                if (startDate)
                    where.paymentDate.gte = startDate;
                if (endDate)
                    where.paymentDate.lte = endDate;
            }
            const [payments, total] = yield Promise.all([
                prisma_1.default.companyDealerPayment.findMany({
                    where,
                    include: {
                        account: {
                            include: {
                                dealer: {
                                    select: {
                                        id: true,
                                        name: true,
                                        contact: true,
                                        address: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { paymentDate: "desc" },
                    skip,
                    take: limit,
                }),
                prisma_1.default.companyDealerPayment.count({ where }),
            ]);
            const formattedPayments = payments.map((payment) => ({
                id: payment.id,
                dealerId: payment.account.dealerId,
                dealerName: payment.account.dealer.name,
                dealerContact: payment.account.dealer.contact,
                amount: Number(payment.amount),
                paymentMethod: payment.paymentMethod,
                paymentDate: payment.paymentDate,
                notes: payment.notes,
                reference: payment.reference,
                receiptImageUrl: payment.receiptImageUrl,
                proofImageUrl: payment.proofImageUrl,
                balanceAfter: Number(payment.balanceAfter),
            }));
            return {
                payments: formattedPayments,
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
exports.CompanyDealerAccountService = CompanyDealerAccountService;
