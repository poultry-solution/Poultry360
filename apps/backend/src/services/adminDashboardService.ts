import { BatchStatus, UserOnboardingPaymentState, UserRole } from "@prisma/client";
import prisma from "../utils/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * DAY_MS;

export type AdminDashboardOverview = {
  asOf: Date;
  accounts: {
    total: number;
    active: number;
    newToday: number;
    newLast30Days: number;
    byRole: Array<{ role: UserRole; count: number }>;
  };
  farms: {
    total: number;
    totalCapacity: number;
    newLast30Days: number;
  };
  batches: {
    total: number;
    active: number;
    completed: number;
    newLast30Days: number;
  };
  birds: {
    placedInActiveBatches: number;
    currentInActiveBatches: number;
    mortalityInActiveBatches: number;
  };
  queue: {
    pendingAccountApprovals: number;
    pendingReviews: number;
    demoEnquiriesLast30Days: number;
    contactRequestsLast30Days: number;
    activityLast24Hours: number;
  };
  recentAccounts: Array<{
    id: string;
    name: string;
    role: UserRole;
    companyName: string | null;
    status: string;
    createdAt: Date;
  }>;
  recentActivity: Array<{
    id: string;
    actorName: string;
    actorRole: string | null;
    description: string;
    targetType: string;
    createdAt: Date;
  }>;
};

/**
 * Builds the Super Admin home overview from platform records. This is kept
 * independent from the account-usage service because it intentionally reports
 * aggregate platform totals rather than any individual account's data.
 */
export async function getAdminDashboardOverview(): Promise<AdminDashboardOverview> {
  const asOf = new Date();
  const startOfToday = new Date(asOf);
  startOfToday.setHours(0, 0, 0, 0);
  const last24Hours = new Date(asOf.getTime() - DAY_MS);
  const last30Days = new Date(asOf.getTime() - THIRTY_DAYS_MS);
  const customerAccounts = { role: { not: UserRole.SUPER_ADMIN } };

  const [
    totalAccounts,
    activeAccounts,
    newAccountsToday,
    newAccountsLast30Days,
    accountsByRole,
    totalFarms,
    farmCapacity,
    newFarmsLast30Days,
    totalBatches,
    activeBatches,
    completedBatches,
    newBatchesLast30Days,
    activeBatchBirds,
    activeBatchMortality,
    pendingAccountApprovals,
    pendingReviews,
    demoEnquiriesLast30Days,
    contactRequestsLast30Days,
    activityLast24Hours,
    recentAccounts,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count({ where: customerAccounts }),
    prisma.user.count({
      where: { ...customerAccounts, status: "ACTIVE" },
    }),
    prisma.user.count({
      where: { ...customerAccounts, createdAt: { gte: startOfToday } },
    }),
    prisma.user.count({
      where: { ...customerAccounts, createdAt: { gte: last30Days } },
    }),
    prisma.user.groupBy({
      by: ["role"],
      where: customerAccounts,
      _count: { _all: true },
      orderBy: { role: "asc" },
    }),
    prisma.farm.count(),
    prisma.farm.aggregate({ _sum: { capacity: true } }),
    prisma.farm.count({ where: { createdAt: { gte: last30Days } } }),
    prisma.batch.count(),
    prisma.batch.count({ where: { status: BatchStatus.ACTIVE } }),
    prisma.batch.count({ where: { status: BatchStatus.COMPLETED } }),
    prisma.batch.count({ where: { createdAt: { gte: last30Days } } }),
    prisma.batch.aggregate({
      where: { status: BatchStatus.ACTIVE },
      _sum: { initialChicks: true },
    }),
    prisma.mortality.aggregate({
      where: { batch: { status: BatchStatus.ACTIVE } },
      _sum: { count: true },
    }),
    prisma.userOnboardingPayment.count({
      where: { state: UserOnboardingPaymentState.PENDING_PAYMENT },
    }),
    prisma.landingReview.count({ where: { status: "PENDING" } }),
    prisma.demoEnquiry.count({ where: { createdAt: { gte: last30Days } } }),
    prisma.landingContact.count({ where: { createdAt: { gte: last30Days } } }),
    prisma.businessAuditLog.count({ where: { createdAt: { gte: last24Hours } } }),
    prisma.user.findMany({
      where: customerAccounts,
      select: {
        id: true,
        name: true,
        role: true,
        companyName: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.businessAuditLog.findMany({
      select: {
        id: true,
        actorName: true,
        actorRole: true,
        description: true,
        targetType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const placedInActiveBatches = Number(activeBatchBirds._sum.initialChicks ?? 0);
  const mortalityInActiveBatches = Number(activeBatchMortality._sum.count ?? 0);

  return {
    asOf,
    accounts: {
      total: totalAccounts,
      active: activeAccounts,
      newToday: newAccountsToday,
      newLast30Days: newAccountsLast30Days,
      byRole: accountsByRole.map((row) => ({
        role: row.role,
        count: row._count._all,
      })),
    },
    farms: {
      total: totalFarms,
      totalCapacity: Number(farmCapacity._sum.capacity ?? 0),
      newLast30Days: newFarmsLast30Days,
    },
    batches: {
      total: totalBatches,
      active: activeBatches,
      completed: completedBatches,
      newLast30Days: newBatchesLast30Days,
    },
    birds: {
      placedInActiveBatches,
      mortalityInActiveBatches,
      currentInActiveBatches: Math.max(
        0,
        placedInActiveBatches - mortalityInActiveBatches
      ),
    },
    queue: {
      pendingAccountApprovals,
      pendingReviews,
      demoEnquiriesLast30Days,
      contactRequestsLast30Days,
      activityLast24Hours,
    },
    recentAccounts,
    recentActivity,
  };
}
