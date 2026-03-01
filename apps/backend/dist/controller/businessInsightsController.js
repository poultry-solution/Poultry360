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
exports.getDealerInsights = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
// ==================== GET DEALER INSIGHTS ====================
const getDealerInsights = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        if (currentUserRole !== client_1.UserRole.COMPANY && currentUserRole !== client_1.UserRole.OWNER) { // Assuming Company Owner
            // Strict check: only company users should access this
            // However, middleware might have already handled basic auth.
            // We'll rely on Prisma queries to ensure data isolation.
        }
        // Find the company associated with the current user
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: currentUserId },
            include: {
                dealerCompanies: {
                    include: {
                        dealer: {
                            include: {
                                owner: {
                                    select: {
                                        name: true,
                                        phone: true,
                                        CompanyFarmLocation: true,
                                        isOnline: true,
                                        lastSeen: true,
                                    },
                                },
                                farmerAccounts: {
                                    select: {
                                        balance: true
                                    }
                                },
                                farmerConnections: {
                                    select: {
                                        id: true
                                    }
                                }
                            },
                        },
                    },
                },
            },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        // Aggregate data for each dealer
        const dealerInsights = yield Promise.all(company.dealerCompanies.map((dc) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const dealer = dc.dealer;
            const dealerId = dealer.id;
            // 1. Sales Volume (company -> dealer)
            // Lifetime
            const lifetimeSales = yield prisma_1.default.companySale.aggregate({
                where: {
                    companyId: company.id,
                    dealerId: dealerId,
                },
                _sum: {
                    totalAmount: true,
                },
            });
            // This Month
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const thisMonthSales = yield prisma_1.default.companySale.aggregate({
                where: {
                    companyId: company.id,
                    dealerId: dealerId,
                    date: {
                        gte: firstDayOfMonth,
                    },
                },
                _sum: {
                    totalAmount: true,
                },
            });
            // 2. Pending Balance (what dealer owes company)
            // We can get this from CompanyDealerAccount if it exists, otherwise 0
            const account = yield prisma_1.default.companyDealerAccount.findUnique({
                where: {
                    companyId_dealerId: {
                        companyId: company.id,
                        dealerId: dealerId,
                    },
                },
                select: { balance: true },
            });
            // 3. Farmer Receivables (what farmers owe dealer)
            // Sum of all positive balances in DealerFarmerAccount for this dealer
            // Note: balance > 0 means farmer owes dealer. balance < 0 means dealer owes farmer (advance).
            // We usually care about total receivables (positive balances).
            const farmerReceivables = yield prisma_1.default.dealerFarmerAccount.aggregate({
                where: {
                    dealerId: dealerId,
                    balance: { gt: 0 }
                },
                _sum: {
                    balance: true
                }
            });
            // 4. Connected Farmers
            const connectedFarmersCount = yield prisma_1.default.dealerFarmer.count({
                where: {
                    dealerId: dealerId
                }
            });
            // 5. Dealer Sales (dealer -> farmer/customer)
            // Lifetime
            const dealerLifetimeSales = yield prisma_1.default.dealerSale.aggregate({
                where: {
                    dealerId: dealerId,
                },
                _sum: {
                    totalAmount: true,
                },
            });
            // This Month
            const dealerThisMonthSales = yield prisma_1.default.dealerSale.aggregate({
                where: {
                    dealerId: dealerId,
                    date: {
                        gte: firstDayOfMonth,
                    },
                },
                _sum: {
                    totalAmount: true,
                },
            });
            return {
                dealerId: dealer.id,
                name: dealer.name || ((_a = dealer.owner) === null || _a === void 0 ? void 0 : _a.name) || "Unknown",
                phone: dealer.contact || ((_b = dealer.owner) === null || _b === void 0 ? void 0 : _b.phone) || "N/A",
                location: dealer.address || ((_c = dealer.owner) === null || _c === void 0 ? void 0 : _c.CompanyFarmLocation) || "N/A",
                isOnline: ((_d = dealer.owner) === null || _d === void 0 ? void 0 : _d.isOnline) || false,
                lastSeen: ((_e = dealer.owner) === null || _e === void 0 ? void 0 : _e.lastSeen) || null,
                // Metrics
                totalSales: lifetimeSales._sum.totalAmount || 0,
                monthlySales: thisMonthSales._sum.totalAmount || 0,
                pendingBalance: (account === null || account === void 0 ? void 0 : account.balance) || 0, // Receivables from Dealer (Company perspective)
                farmerReceivables: farmerReceivables._sum.balance || 0, // Receivables from Farmers (Dealer perspective)
                connectedFarmers: connectedFarmersCount,
                // Dealer Sales Metrics
                dealerTotalSales: dealerLifetimeSales._sum.totalAmount || 0, // Sales by Dealer to Farmers (Lifetime)
                dealerMonthlySales: dealerThisMonthSales._sum.totalAmount || 0, // Sales by Dealer to Farmers (This Month)
                // Status (simple logic for now)
                isActive: !dc.archivedByCompany,
            };
        })));
        // Calculate Summary Stats
        const summary = {
            totalDealers: dealerInsights.length,
            totalActiveFarmers: dealerInsights.reduce((sum, d) => sum + d.connectedFarmers, 0),
            totalReceivable: dealerInsights.reduce((sum, d) => sum + Number(d.pendingBalance), 0),
            totalDealerReceivables: dealerInsights.reduce((sum, d) => sum + Number(d.farmerReceivables), 0)
        };
        return res.json({
            success: true,
            data: {
                summary,
                dealers: dealerInsights,
            },
        });
    }
    catch (error) {
        console.error("Get dealer insights error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerInsights = getDealerInsights;
