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
exports.DealerFarmerAccountService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
class DealerFarmerAccountService {
    /**
     * Get or create account for dealer-farmer pair
     * Uses upsert to prevent race conditions
     */
    static getOrCreateAccount(dealerId, farmerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = yield prisma_1.default.dealerFarmerAccount.upsert({
                where: {
                    dealerId_farmerId: {
                        dealerId,
                        farmerId,
                    },
                },
                update: {},
                create: {
                    dealerId,
                    farmerId,
                    balance: new client_1.Prisma.Decimal(0),
                    totalSales: new client_1.Prisma.Decimal(0),
                    totalPayments: new client_1.Prisma.Decimal(0),
                },
                include: {
                    dealer: {
                        select: {
                            id: true,
                            name: true,
                            contact: true,
                            address: true,
                        },
                    },
                    farmer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            companyName: true,
                            CompanyFarmLocation: true,
                        },
                    },
                },
            });
            return account;
        });
    }
    /**
     * Record sale and update account balance.
     * When tx is provided, runs inside the caller's transaction for atomicity.
     */
    static recordSale(dealerId, farmerId, amount, saleId, tx) {
        return __awaiter(this, void 0, void 0, function* () {
            const run = (client) => __awaiter(this, void 0, void 0, function* () {
                const account = yield client.dealerFarmerAccount.upsert({
                    where: {
                        dealerId_farmerId: {
                            dealerId,
                            farmerId,
                        },
                    },
                    update: {
                        balance: { increment: new client_1.Prisma.Decimal(amount) },
                        totalSales: { increment: new client_1.Prisma.Decimal(amount) },
                        lastSaleDate: new Date(),
                    },
                    create: {
                        dealerId,
                        farmerId,
                        balance: new client_1.Prisma.Decimal(amount),
                        totalSales: new client_1.Prisma.Decimal(amount),
                        totalPayments: new client_1.Prisma.Decimal(0),
                        lastSaleDate: new Date(),
                    },
                });
                yield client.dealerSale.update({
                    where: { id: saleId },
                    data: {
                        accountId: account.id,
                    },
                });
                return account;
            });
            if (tx) {
                return run(tx);
            }
            return yield prisma_1.default.$transaction(run);
        });
    }
    /**
     * Record payment and update account balance.
     * Payments only create DealerFarmerPayment and DealerLedgerEntry; they do not update
     * any DealerSale row (account-only model; sales are history only).
     * When tx is provided, runs inside the caller's transaction for atomicity.
     */
    static recordPayment(data, tx) {
        return __awaiter(this, void 0, void 0, function* () {
            const run = (client) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                const account = yield client.dealerFarmerAccount.upsert({
                    where: {
                        dealerId_farmerId: {
                            dealerId: data.dealerId,
                            farmerId: data.farmerId,
                        },
                    },
                    update: {
                        balance: { decrement: new client_1.Prisma.Decimal(data.amount) },
                        totalPayments: { increment: new client_1.Prisma.Decimal(data.amount) },
                        lastPaymentDate: data.paymentDate || new Date(),
                    },
                    create: {
                        dealerId: data.dealerId,
                        farmerId: data.farmerId,
                        balance: new client_1.Prisma.Decimal(-data.amount),
                        totalSales: new client_1.Prisma.Decimal(0),
                        totalPayments: new client_1.Prisma.Decimal(data.amount),
                        lastPaymentDate: data.paymentDate || new Date(),
                    },
                });
                const newBalance = Number(account.balance);
                const payment = yield client.dealerFarmerPayment.create({
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
                // Dealer ledger: record payment received from farmer so ledger balance stays aligned with account movements
                const paymentDate = data.paymentDate || new Date();
                const lastLedgerEntry = yield client.dealerLedgerEntry.findFirst({
                    where: { dealerId: data.dealerId },
                    orderBy: { createdAt: "desc" },
                });
                const currentLedgerBalance = lastLedgerEntry
                    ? Number(lastLedgerEntry.balance)
                    : 0;
                const newLedgerBalance = currentLedgerBalance - data.amount;
                yield client.dealerLedgerEntry.create({
                    data: {
                        type: "PAYMENT_RECEIVED",
                        amount: new client_1.Prisma.Decimal(data.amount),
                        balance: new client_1.Prisma.Decimal(newLedgerBalance),
                        date: paymentDate,
                        description: (_a = data.notes) !== null && _a !== void 0 ? _a : "Payment received from farmer",
                        reference: (_b = data.reference) !== null && _b !== void 0 ? _b : payment.id,
                        dealerId: data.dealerId,
                        partyId: data.farmerId,
                        partyType: "FARMER",
                        imageUrl: data.receiptImageUrl,
                    },
                });
                return {
                    payment,
                    account,
                };
            });
            if (tx) {
                return run(tx);
            }
            return yield prisma_1.default.$transaction(run);
        });
    }
    /**
     * Get account balance
     */
    static getAccountBalance(dealerId, farmerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = yield prisma_1.default.dealerFarmerAccount.findUnique({
                where: {
                    dealerId_farmerId: {
                        dealerId,
                        farmerId,
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
     * Get account statement (sales and payments) with pagination
     */
    static getAccountStatement(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { dealerId, farmerId, startDate, endDate, page = 1, limit = 50 } = params;
            const account = yield this.getOrCreateAccount(dealerId, farmerId);
            const skip = (page - 1) * limit;
            const dateFilter = {};
            if (startDate)
                dateFilter.gte = startDate;
            if (endDate)
                dateFilter.lte = endDate;
            // Query by accountId only: DealerSale rows may have farmerId null (set only accountId via recordSale)
            const salesWhere = {
                accountId: account.id,
            };
            if (startDate || endDate)
                salesWhere.date = dateFilter;
            const [sales, salesCount] = yield Promise.all([
                prisma_1.default.dealerSale.findMany({
                    where: salesWhere,
                    select: {
                        id: true,
                        invoiceNumber: true,
                        date: true,
                        totalAmount: true,
                        subtotalAmount: true,
                        notes: true,
                        discount: {
                            select: { type: true, value: true },
                        },
                    },
                    orderBy: { date: "desc" },
                    skip,
                    take: limit,
                }),
                prisma_1.default.dealerSale.count({ where: salesWhere }),
            ]);
            const paymentsWhere = {
                accountId: account.id,
            };
            if (startDate || endDate)
                paymentsWhere.paymentDate = dateFilter;
            const [payments, paymentsCount] = yield Promise.all([
                prisma_1.default.dealerFarmerPayment.findMany({
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
                prisma_1.default.dealerFarmerPayment.count({ where: paymentsWhere }),
            ]);
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
                });
            });
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
            const transactions = [
                ...formattedSales.map((sale) => ({
                    type: "SALE",
                    id: sale.id,
                    date: sale.date,
                    amount: sale.amount,
                    reference: sale.invoiceNumber,
                    notes: sale.notes,
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
                    dealer: account.dealer,
                    farmer: account.farmer,
                },
                sales: formattedSales,
                payments: formattedPayments,
                transactions,
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
     * Set or update balance limit for a dealer-farmer account
     */
    static setBalanceLimit(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { dealerId, farmerId, balanceLimit, setById } = params;
            const account = yield prisma_1.default.dealerFarmerAccount.upsert({
                where: {
                    dealerId_farmerId: { dealerId, farmerId },
                },
                update: {
                    balanceLimit: balanceLimit !== null ? new client_1.Prisma.Decimal(balanceLimit) : null,
                    balanceLimitSetAt: new Date(),
                    balanceLimitSetBy: setById,
                },
                create: {
                    dealerId,
                    farmerId,
                    balance: new client_1.Prisma.Decimal(0),
                    totalSales: new client_1.Prisma.Decimal(0),
                    totalPayments: new client_1.Prisma.Decimal(0),
                    balanceLimit: balanceLimit !== null ? new client_1.Prisma.Decimal(balanceLimit) : null,
                    balanceLimitSetAt: new Date(),
                    balanceLimitSetBy: setById,
                },
                include: {
                    dealer: { select: { id: true, name: true, contact: true, address: true } },
                    farmer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            companyName: true,
                            CompanyFarmLocation: true,
                        },
                    },
                },
            });
            return account;
        });
    }
    /**
     * Check if a sale would exceed the balance limit
     */
    static checkBalanceLimit(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { dealerId, farmerId, saleAmount } = params;
            const account = yield prisma_1.default.dealerFarmerAccount.findUnique({
                where: {
                    dealerId_farmerId: { dealerId, farmerId },
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
     * Get all farmer accounts for a dealer
     */
    static getDealerAccounts(dealerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const accounts = yield prisma_1.default.dealerFarmerAccount.findMany({
                where: { dealerId },
                include: {
                    farmer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            companyName: true,
                            CompanyFarmLocation: true,
                        },
                    },
                },
                orderBy: { balance: "desc" },
            });
            return accounts.map((account) => ({
                id: account.id,
                farmerId: account.farmerId,
                farmerName: account.farmer.name,
                farmerPhone: account.farmer.phone,
                farmerCompanyName: account.farmer.companyName,
                farmerLocation: account.farmer.CompanyFarmLocation,
                balance: Number(account.balance),
                totalSales: Number(account.totalSales),
                totalPayments: Number(account.totalPayments),
                lastSaleDate: account.lastSaleDate,
                lastPaymentDate: account.lastPaymentDate,
            }));
        });
    }
    /**
     * Get all dealer accounts for a farmer
     */
    static getFarmerAccounts(farmerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const accounts = yield prisma_1.default.dealerFarmerAccount.findMany({
                where: { farmerId },
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
}
exports.DealerFarmerAccountService = DealerFarmerAccountService;
