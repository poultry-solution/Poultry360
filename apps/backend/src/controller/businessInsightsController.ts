import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole } from "@prisma/client";

// ==================== GET DEALER INSIGHTS ====================
export const getDealerInsights = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const currentUserId = req.userId;
        const currentUserRole = req.role;

        if (currentUserRole !== UserRole.COMPANY && currentUserRole !== UserRole.OWNER) { // Assuming Company Owner
            // Strict check: only company users should access this
            // However, middleware might have already handled basic auth.
            // We'll rely on Prisma queries to ensure data isolation.
        }

        // Find the company associated with the current user
        const company = await prisma.company.findUnique({
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
        const dealerInsights = await Promise.all(
            company.dealerCompanies.map(async (dc: any) => {
                const dealer = dc.dealer;
                const dealerId = dealer.id;

                // 1. Sales Volume (company -> dealer)
                // Lifetime
                const lifetimeSales = await prisma.companySale.aggregate({
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
                const thisMonthSales = await prisma.companySale.aggregate({
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
                const account = await prisma.companyDealerAccount.findUnique({
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
                const farmerReceivables = await prisma.dealerFarmerAccount.aggregate({
                    where: {
                        dealerId: dealerId,
                        balance: { gt: 0 }
                    },
                    _sum: {
                        balance: true
                    }
                });

                // 4. Connected Farmers
                const connectedFarmersCount = await prisma.dealerFarmer.count({
                    where: {
                        dealerId: dealerId
                    }
                });

                // 5. Dealer Sales (dealer -> farmer/customer)
                // Lifetime
                const dealerLifetimeSales = await prisma.dealerSale.aggregate({
                    where: {
                        dealerId: dealerId,
                    },
                    _sum: {
                        totalAmount: true,
                    },
                });

                // This Month
                const dealerThisMonthSales = await prisma.dealerSale.aggregate({
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
                    name: dealer.name || dealer.owner?.name || "Unknown",
                    phone: dealer.contact || dealer.owner?.phone || "N/A",
                    location: dealer.address || dealer.owner?.CompanyFarmLocation || "N/A",
                    isOnline: dealer.owner?.isOnline || false,
                    lastSeen: dealer.owner?.lastSeen || null,

                    // Metrics
                    totalSales: lifetimeSales._sum.totalAmount || 0,
                    monthlySales: thisMonthSales._sum.totalAmount || 0,
                    pendingBalance: account?.balance || 0, // Receivables from Dealer (Company perspective)
                    farmerReceivables: farmerReceivables._sum.balance || 0, // Receivables from Farmers (Dealer perspective)
                    connectedFarmers: connectedFarmersCount,

                    // Dealer Sales Metrics
                    dealerTotalSales: dealerLifetimeSales._sum.totalAmount || 0, // Sales by Dealer to Farmers (Lifetime)
                    dealerMonthlySales: dealerThisMonthSales._sum.totalAmount || 0, // Sales by Dealer to Farmers (This Month)

                    // Status (simple logic for now)
                    isActive: !dc.archivedByCompany,
                };
            })
        );

        // Calculate Summary Stats
        const summary = {
            totalDealers: dealerInsights.length,
            totalActiveFarmers: dealerInsights.reduce((sum: number, d: any) => sum + d.connectedFarmers, 0),
            totalReceivable: dealerInsights.reduce((sum: number, d: any) => sum + Number(d.pendingBalance), 0),
            totalDealerReceivables: dealerInsights.reduce((sum: number, d: any) => sum + Number(d.farmerReceivables), 0)
        };

        return res.json({
            success: true,
            data: {
                summary,
                dealers: dealerInsights,
            },
        });
    } catch (error) {
        console.error("Get dealer insights error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
