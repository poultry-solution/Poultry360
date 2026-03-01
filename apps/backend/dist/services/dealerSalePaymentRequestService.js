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
exports.DealerSalePaymentRequestService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const dealerFarmerAccountService_1 = require("./dealerFarmerAccountService");
class DealerSalePaymentRequestService {
    /**
     * Farmer creates a payment request for a linked sale
     */
    static createPaymentRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { dealerSaleId, farmerId, amount, paymentDate, paymentReference, paymentMethod, description, proofOfPaymentUrl, } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                // 1. Validate the sale exists and is linked to this farmer
                const sale = yield tx.dealerSale.findUnique({
                    where: { id: dealerSaleId },
                    include: {
                        customer: true,
                        dealer: true,
                    },
                });
                if (!sale) {
                    throw new Error("Sale not found");
                }
                if (!((_a = sale.customer) === null || _a === void 0 ? void 0 : _a.farmerId) || sale.customer.farmerId !== farmerId) {
                    throw new Error("This sale is not linked to you or does not exist");
                }
                // 2. Validate amount (no cap on sale.dueAmount — account-linked sales use
                // dealer-farmer account balance; amounts above balance allow advances)
                if (amount <= 0) {
                    throw new Error("Payment amount must be greater than zero");
                }
                // 3. Generate request number
                const requestNumber = `PR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                // 4. Create payment request
                const paymentRequest = yield tx.dealerSalePaymentRequest.create({
                    data: {
                        requestNumber,
                        amount: new client_1.Prisma.Decimal(amount),
                        description,
                        paymentMethod,
                        paymentReference,
                        paymentDate,
                        dealerSaleId,
                        dealerId: sale.dealerId,
                        farmerId,
                        customerId: sale.customerId,
                        status: "PENDING",
                        proofOfPaymentUrl,
                    },
                    include: {
                        dealerSale: true,
                        dealer: true,
                        farmer: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                        customer: {
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
     * Farmer creates a ledger-level payment request (not tied to specific sale)
     */
    static createLedgerLevelPaymentRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { dealerId, farmerId, customerId, amount, paymentDate, paymentReference, paymentMethod, description, proofOfPaymentUrl, } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // 1. Validate dealer-farmer connection exists
                const dealerFarmerConnection = yield tx.dealerFarmer.findFirst({
                    where: {
                        dealerId,
                        farmerId,
                        archivedByFarmer: false,
                        archivedByDealer: false,
                    },
                });
                if (!dealerFarmerConnection) {
                    throw new Error("No active connection found between you and this dealer");
                }
                // 2. Validate customer belongs to this dealer
                const dealer = yield tx.dealer.findUnique({
                    where: { id: dealerId },
                });
                if (!dealer || !dealer.ownerId) {
                    throw new Error("Invalid dealer or dealer not registered");
                }
                const customer = yield tx.customer.findUnique({
                    where: { id: customerId },
                });
                if (!customer || customer.userId !== dealer.ownerId || customer.farmerId !== farmerId) {
                    throw new Error("Invalid customer record or customer not linked to this dealer-farmer pair");
                }
                // 3. Validate amount
                if (amount <= 0) {
                    throw new Error("Payment amount must be greater than zero");
                }
                // 4. Generate request number
                const requestNumber = `LPR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                // 5. Create ledger-level payment request
                const paymentRequest = yield tx.dealerSalePaymentRequest.create({
                    data: {
                        requestNumber,
                        amount: new client_1.Prisma.Decimal(amount),
                        description: description || "General payment",
                        paymentMethod,
                        paymentReference,
                        paymentDate,
                        dealerId,
                        farmerId,
                        customerId,
                        status: "PENDING",
                        isLedgerLevel: true,
                        dealerSaleId: null, // No specific sale
                        proofOfPaymentUrl,
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
                            },
                        },
                        customer: {
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
     * Dealer creates a payment request to farmer (asking farmer to pay)
     */
    static createDealerPaymentRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { dealerId, farmerId, amount, description } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // 1. Validate dealer-farmer connection exists
                const dealerFarmerConnection = yield tx.dealerFarmer.findFirst({
                    where: {
                        dealerId,
                        farmerId,
                        archivedByFarmer: false,
                        archivedByDealer: false,
                    },
                });
                if (!dealerFarmerConnection) {
                    throw new Error("No active connection found with this farmer");
                }
                // 2. Get dealer to find ownerId
                const dealer = yield tx.dealer.findUnique({
                    where: { id: dealerId },
                });
                if (!dealer || !dealer.ownerId) {
                    throw new Error("Invalid dealer");
                }
                // 3. Find customer record
                const customer = yield tx.customer.findFirst({
                    where: {
                        userId: dealer.ownerId,
                        farmerId,
                    },
                });
                if (!customer) {
                    throw new Error("No customer record found for this farmer");
                }
                // 4. Validate amount
                if (amount <= 0) {
                    throw new Error("Payment amount must be greater than zero");
                }
                // 5. Generate request number
                const requestNumber = `DPR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                // 6. Create payment request (dealer asking farmer to pay)
                const paymentRequest = yield tx.dealerSalePaymentRequest.create({
                    data: {
                        requestNumber,
                        amount: new client_1.Prisma.Decimal(amount),
                        description: description || "Payment request from dealer",
                        dealerId,
                        farmerId,
                        customerId: customer.id,
                        status: "PENDING",
                        isLedgerLevel: true,
                        dealerSaleId: null,
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
                            },
                        },
                        customer: {
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
     * Farmer responds to a dealer-initiated payment request with proof
     */
    static respondToPaymentRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { requestId, farmerId, paymentMethod, paymentReference, paymentDate, proofOfPaymentUrl } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // 1. Get the payment request
                const request = yield tx.dealerSalePaymentRequest.findUnique({
                    where: { id: requestId },
                });
                if (!request) {
                    throw new Error("Payment request not found");
                }
                // 2. Verify this request belongs to this farmer
                if (request.farmerId !== farmerId) {
                    throw new Error("You can only respond to payment requests sent to you");
                }
                // 3. Check if already processed
                if (request.status !== "PENDING") {
                    throw new Error(`Request is already ${request.status.toLowerCase()}`);
                }
                // 4. Update with proof data
                const updatedRequest = yield tx.dealerSalePaymentRequest.update({
                    where: { id: requestId },
                    data: {
                        paymentMethod: paymentMethod || request.paymentMethod,
                        paymentReference: paymentReference || request.paymentReference,
                        paymentDate: paymentDate || request.paymentDate || new Date(),
                        proofOfPaymentUrl: proofOfPaymentUrl || request.proofOfPaymentUrl,
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
                            },
                        },
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                    },
                });
                return updatedRequest;
            }));
        });
    }
    /**
     * Dealer approves a payment request.
     * Always records the payment via DealerFarmerAccountService.recordPayment (no FIFO or bill-wise allocation).
     */
    static approvePaymentRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { requestId, dealerId, recordedById } = data;
            // 1. Validate and fetch the request (no transaction yet)
            const request = yield prisma_1.default.dealerSalePaymentRequest.findUnique({
                where: { id: requestId },
                include: {
                    dealerSale: true,
                },
            });
            if (!request) {
                throw new Error("Payment request not found");
            }
            // Verify this request belongs to the dealer
            if (request.dealerId !== dealerId) {
                throw new Error("You can only approve requests sent to you");
            }
            // Check if already processed
            if (request.status !== "PENDING") {
                throw new Error(`Request is already ${request.status.toLowerCase()}`);
            }
            // 2. Mark request as approved
            yield prisma_1.default.dealerSalePaymentRequest.update({
                where: { id: requestId },
                data: {
                    status: "APPROVED",
                    reviewedAt: new Date(),
                },
            });
            // 3. Record payment on dealer-farmer account (account-only; no sale allocation).
            try {
                yield dealerFarmerAccountService_1.DealerFarmerAccountService.recordPayment({
                    dealerId,
                    farmerId: request.farmerId,
                    amount: Number(request.amount),
                    paymentMethod: request.paymentMethod || undefined,
                    paymentDate: request.paymentDate || new Date(),
                    notes: request.description || `Payment request approved - ${request.requestNumber}`,
                    reference: request.requestNumber,
                    recordedById,
                });
            }
            catch (error) {
                // If payment processing fails, revert the approval status
                yield prisma_1.default.dealerSalePaymentRequest.update({
                    where: { id: requestId },
                    data: {
                        status: "PENDING",
                        reviewedAt: null,
                    },
                });
                throw error;
            }
            // 4. Return the updated request with all details
            return yield prisma_1.default.dealerSalePaymentRequest.findUnique({
                where: { id: requestId },
                include: {
                    dealerSale: {
                        include: {
                            payments: true,
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
                    customer: {
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
     * Dealer rejects a payment request
     */
    static rejectPaymentRequest(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { requestId, dealerId, rejectionReason } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // 1. Get the request
                const request = yield tx.dealerSalePaymentRequest.findUnique({
                    where: { id: requestId },
                });
                if (!request) {
                    throw new Error("Payment request not found");
                }
                // 2. Verify this request belongs to the dealer
                if (request.dealerId !== dealerId) {
                    throw new Error("You can only reject requests sent to you");
                }
                // 3. Check if already processed
                if (request.status !== "PENDING") {
                    throw new Error(`Request is already ${request.status.toLowerCase()}`);
                }
                // 4. Mark request as rejected
                const updatedRequest = yield tx.dealerSalePaymentRequest.update({
                    where: { id: requestId },
                    data: {
                        status: "REJECTED",
                        reviewedAt: new Date(),
                        rejectionReason,
                    },
                    include: {
                        dealerSale: true,
                        dealer: true,
                        farmer: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                    },
                });
                return updatedRequest;
            }));
        });
    }
    /**
     * Get payment requests for a dealer
     */
    static getDealerPaymentRequests(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { dealerId, status, page = 1, limit = 50 } = data;
            const skip = (page - 1) * limit;
            const where = { dealerId };
            if (status) {
                where.status = status;
            }
            const [requests, total] = yield Promise.all([
                prisma_1.default.dealerSalePaymentRequest.findMany({
                    where,
                    include: {
                        dealerSale: {
                            select: {
                                id: true,
                                invoiceNumber: true,
                                totalAmount: true,
                                paidAmount: true,
                                dueAmount: true,
                                date: true,
                            },
                        },
                        farmer: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take: limit,
                }),
                prisma_1.default.dealerSalePaymentRequest.count({ where }),
            ]);
            return {
                requests,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        });
    }
    /**
     * Get payment requests for a farmer
     */
    static getFarmerPaymentRequests(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { farmerId, status, page = 1, limit = 50 } = data;
            const skip = (page - 1) * limit;
            const where = { farmerId };
            if (status) {
                where.status = status;
            }
            const [requests, total] = yield Promise.all([
                prisma_1.default.dealerSalePaymentRequest.findMany({
                    where,
                    include: {
                        dealerSale: {
                            select: {
                                id: true,
                                invoiceNumber: true,
                                totalAmount: true,
                                paidAmount: true,
                                dueAmount: true,
                                date: true,
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
                    orderBy: { createdAt: "desc" },
                    skip,
                    take: limit,
                }),
                prisma_1.default.dealerSalePaymentRequest.count({ where }),
            ]);
            return {
                requests,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        });
    }
    /**
     * Get single payment request by ID
     */
    static getPaymentRequestById(requestId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = yield prisma_1.default.dealerSalePaymentRequest.findUnique({
                where: { id: requestId },
                include: {
                    dealerSale: {
                        include: {
                            items: {
                                include: {
                                    product: true,
                                },
                            },
                            payments: true,
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
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                        },
                    },
                },
            });
            if (!request) {
                throw new Error("Payment request not found");
            }
            return request;
        });
    }
}
exports.DealerSalePaymentRequestService = DealerSalePaymentRequestService;
