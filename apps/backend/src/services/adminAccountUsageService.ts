import { HatcheryBatchType, UserRole } from "@prisma/client";
import prisma from "../utils/prisma";

export type AdminAccountUsageMetric = {
  key: string;
  label: string;
  total: number;
  last30Days: number;
};

export type AdminAccountUsageSummary = {
  accountId: string;
  role: UserRole;
  asOf: Date;
  recentSince: Date;
  metrics: AdminAccountUsageMetric[];
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function metric(
  key: string,
  label: string,
  totalCount: Promise<number>,
  recentCount: Promise<number>
): Promise<AdminAccountUsageMetric> {
  const [total, last30Days] = await Promise.all([totalCount, recentCount]);
  return { key, label, total, last30Days };
}

async function combinedMetric(
  key: string,
  label: string,
  totalCounts: Promise<number>[],
  recentCounts: Promise<number>[]
): Promise<AdminAccountUsageMetric> {
  const [totals, recents] = await Promise.all([
    Promise.all(totalCounts),
    Promise.all(recentCounts),
  ]);

  return {
    key,
    label,
    total: totals.reduce((sum, count) => sum + count, 0),
    last30Days: recents.reduce((sum, count) => sum + count, 0),
  };
}

export async function getAdminAccountUsageSummary(
  accountId: string
): Promise<AdminAccountUsageSummary | null> {
  const account = await prisma.user.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      role: true,
      dealer: { select: { id: true } },
      company: { select: { id: true } },
    },
  });

  if (!account) {
    return null;
  }

  const asOf = new Date();
  const recentSince = new Date(asOf.getTime() - THIRTY_DAYS_MS);
  const createdInLast30Days = { createdAt: { gte: recentSince } };
  let metrics: Promise<AdminAccountUsageMetric>[] = [];

  switch (account.role) {
    case UserRole.OWNER:
      metrics = [
        metric(
          "farms",
          "Farms",
          prisma.farm.count({ where: { ownerId: account.id } }),
          prisma.farm.count({ where: { ownerId: account.id, ...createdInLast30Days } })
        ),
        metric(
          "batches",
          "Batches",
          prisma.batch.count({ where: { farm: { ownerId: account.id } } }),
          prisma.batch.count({
            where: { farm: { ownerId: account.id }, ...createdInLast30Days },
          })
        ),
        metric(
          "customers",
          "Customers",
          prisma.customer.count({ where: { userId: account.id } }),
          prisma.customer.count({ where: { userId: account.id, ...createdInLast30Days } })
        ),
        metric(
          "inventory_items",
          "Inventory items",
          prisma.inventoryItem.count({ where: { userId: account.id } }),
          prisma.inventoryItem.count({
            where: { userId: account.id, ...createdInLast30Days },
          })
        ),
        metric(
          "listings",
          "Listings",
          prisma.listForSale.count({ where: { userId: account.id } }),
          prisma.listForSale.count({ where: { userId: account.id, ...createdInLast30Days } })
        ),
      ];
      break;

    case UserRole.DEALER: {
      const dealerId = account.dealer?.id;
      if (!dealerId) break;

      metrics = [
        combinedMetric(
          "company_records",
          "Company records",
          [
            prisma.companyDealerAccount.count({ where: { dealerId } }),
            prisma.dealerManualCompany.count({ where: { dealerId } }),
          ],
          [
            prisma.companyDealerAccount.count({ where: { dealerId, ...createdInLast30Days } }),
            prisma.dealerManualCompany.count({ where: { dealerId, ...createdInLast30Days } }),
          ]
        ),
        metric(
          "farmer_accounts",
          "Farmer accounts",
          prisma.dealerFarmerAccount.count({ where: { dealerId } }),
          prisma.dealerFarmerAccount.count({ where: { dealerId, ...createdInLast30Days } })
        ),
        metric(
          "products",
          "Products",
          prisma.dealerProduct.count({ where: { dealerId } }),
          prisma.dealerProduct.count({ where: { dealerId, ...createdInLast30Days } })
        ),
        metric(
          "sales",
          "Sales",
          prisma.dealerSale.count({ where: { dealerId } }),
          prisma.dealerSale.count({ where: { dealerId, ...createdInLast30Days } })
        ),
        metric(
          "staff_logins",
          "Staff logins",
          prisma.staffUser.count({
            where: { ownerId: account.id, accountRole: UserRole.DEALER },
          }),
          prisma.staffUser.count({
            where: {
              ownerId: account.id,
              accountRole: UserRole.DEALER,
              ...createdInLast30Days,
            },
          })
        ),
      ];
      break;
    }

    case UserRole.HATCHERY:
      metrics = [
        metric(
          "suppliers",
          "Suppliers",
          prisma.hatcherySupplier.count({ where: { hatcheryOwnerId: account.id } }),
          prisma.hatcherySupplier.count({
            where: { hatcheryOwnerId: account.id, ...createdInLast30Days },
          })
        ),
        metric(
          "inventory_items",
          "Inventory items",
          prisma.hatcheryInventoryItem.count({ where: { hatcheryOwnerId: account.id } }),
          prisma.hatcheryInventoryItem.count({
            where: { hatcheryOwnerId: account.id, ...createdInLast30Days },
          })
        ),
        metric(
          "parent_batches",
          "Parent batches",
          prisma.hatcheryBatch.count({
            where: { hatcheryOwnerId: account.id, type: HatcheryBatchType.PARENT_FLOCK },
          }),
          prisma.hatcheryBatch.count({
            where: {
              hatcheryOwnerId: account.id,
              type: HatcheryBatchType.PARENT_FLOCK,
              ...createdInLast30Days,
            },
          })
        ),
        metric(
          "incubation_runs",
          "Incubation runs",
          prisma.hatcheryIncubationBatch.count({ where: { hatcheryOwnerId: account.id } }),
          prisma.hatcheryIncubationBatch.count({
            where: { hatcheryOwnerId: account.id, ...createdInLast30Days },
          })
        ),
        metric(
          "parties",
          "Parties",
          prisma.hatcheryParty.count({ where: { hatcheryOwnerId: account.id } }),
          prisma.hatcheryParty.count({
            where: { hatcheryOwnerId: account.id, ...createdInLast30Days },
          })
        ),
      ];
      break;

    case UserRole.COMPANY: {
      const companyId = account.company?.id;
      if (!companyId) break;

      metrics = [
        combinedMetric(
          "dealer_records",
          "Dealer records",
          [
            prisma.companyDealerAccount.count({ where: { companyId } }),
            prisma.dealer.count({ where: { userId: account.id } }),
          ],
          [
            prisma.companyDealerAccount.count({ where: { companyId, ...createdInLast30Days } }),
            prisma.dealer.count({ where: { userId: account.id, ...createdInLast30Days } }),
          ]
        ),
        metric(
          "suppliers",
          "Suppliers",
          prisma.supplier.count({ where: { companyId } }),
          prisma.supplier.count({ where: { companyId, ...createdInLast30Days } })
        ),
        metric(
          "raw_materials",
          "Raw materials",
          prisma.rawMaterial.count({ where: { companyId } }),
          prisma.rawMaterial.count({ where: { companyId, ...createdInLast30Days } })
        ),
        metric(
          "products",
          "Products",
          prisma.product.count({ where: { supplierId: account.id } }),
          prisma.product.count({ where: { supplierId: account.id, ...createdInLast30Days } })
        ),
        metric(
          "purchases",
          "Purchases",
          prisma.companyPurchase.count({ where: { companyId } }),
          prisma.companyPurchase.count({ where: { companyId, ...createdInLast30Days } })
        ),
        metric(
          "production_runs",
          "Production runs",
          prisma.productionRun.count({ where: { companyId } }),
          prisma.productionRun.count({ where: { companyId, ...createdInLast30Days } })
        ),
        metric(
          "sales",
          "Sales",
          prisma.companySale.count({ where: { companyId } }),
          prisma.companySale.count({ where: { companyId, ...createdInLast30Days } })
        ),
      ];
      break;
    }
  }

  return {
    accountId: account.id,
    role: account.role,
    asOf,
    recentSince,
    metrics: await Promise.all(metrics),
  };
}
