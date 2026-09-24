import { StaffPermission, UserRole } from "@prisma/client";
import prisma from "../utils/prisma";
import {
  ACCOUNT_FEATURE_KEYS,
  isAccountFeatureEnabled,
  type AccountFeatureKey,
} from "./accountFeatureService";

type StaffAccountModule = {
  role: UserRole;
  featureKey: AccountFeatureKey;
  businessType: "DEALER" | "HATCHERY" | "FARMER" | "COMPANY";
  displayName: string;
  defaultPermissions: StaffPermission[];
  requiredPermissions: StaffPermission[];
  supportedPermissions: StaffPermission[];
  getBusiness: (ownerId: string) => Promise<StaffBusinessSummary | null>;
};

export type StaffBusinessSummary = {
  id: string;
  name: string;
  contact: string;
  address: string | null;
  ownerId: string | null;
};

/**
 * Central account-staff registry. Adding another business module should be a
 * configuration change here plus its route permissions, not a new identity or
 * authentication implementation.
 */
export const STAFF_ACCOUNT_MODULES = {
  [UserRole.DEALER]: {
    role: UserRole.DEALER,
    featureKey: ACCOUNT_FEATURE_KEYS.DEALER_STAFF_OPERATIONS,
    businessType: "DEALER",
    displayName: "Feed Dealer",
    defaultPermissions: [],
    requiredPermissions: [],
    supportedPermissions: [
      StaffPermission.DEALER_VIEW_FINANCIAL_SUMMARIES,
      StaffPermission.DEALER_VIEW_CASH_HISTORY,
      StaffPermission.DEALER_VIEW_STAFF_MANAGEMENT,
    ],
    getBusiness: (ownerId) => prisma.dealer.findUnique({
      where: { ownerId },
      select: { id: true, name: true, contact: true, address: true, ownerId: true },
    }),
  },
  [UserRole.HATCHERY]: {
    role: UserRole.HATCHERY,
    featureKey: ACCOUNT_FEATURE_KEYS.HATCHERY_STAFF_OPERATIONS,
    businessType: "HATCHERY",
    displayName: "Hatchery",
    defaultPermissions: [StaffPermission.HATCHERY_MANAGE_OPERATIONS],
    requiredPermissions: [StaffPermission.HATCHERY_MANAGE_OPERATIONS],
    supportedPermissions: [
      StaffPermission.HATCHERY_MANAGE_OPERATIONS,
      StaffPermission.HATCHERY_VIEW_ANALYTICS,
      StaffPermission.HATCHERY_VIEW_STAFF_MANAGEMENT,
    ],
    getBusiness: (ownerId) => prisma.hatcheryBusiness.findUnique({
      where: { ownerId },
      select: { id: true, name: true, contact: true, address: true, ownerId: true },
    }),
  },
  [UserRole.OWNER]: {
    role: UserRole.OWNER,
    featureKey: ACCOUNT_FEATURE_KEYS.FARMER_STAFF_OPERATIONS,
    businessType: "FARMER",
    displayName: "Farmer",
    defaultPermissions: [StaffPermission.FARMER_MANAGE_OPERATIONS],
    requiredPermissions: [],
    supportedPermissions: [
      StaffPermission.FARMER_MANAGE_OPERATIONS,
      StaffPermission.FARMER_VIEW_FINANCIAL_SUMMARIES,
      StaffPermission.FARMER_VIEW_CASH_HISTORY,
      StaffPermission.FARMER_VIEW_ANALYTICS,
      StaffPermission.FARMER_VIEW_STAFF_MANAGEMENT,
    ],
    getBusiness: async (ownerId) => {
      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, name: true, phone: true, CompanyFarmLocation: true },
      });
      return owner
        ? {
            id: owner.id,
            name: owner.name,
            contact: owner.phone,
            address: owner.CompanyFarmLocation,
            ownerId: owner.id,
          }
        : null;
    },
  },
  [UserRole.COMPANY]: {
    role: UserRole.COMPANY,
    featureKey: ACCOUNT_FEATURE_KEYS.COMPANY_STAFF_OPERATIONS,
    businessType: "COMPANY",
    displayName: "Company",
    defaultPermissions: [StaffPermission.COMPANY_MANAGE_OPERATIONS],
    requiredPermissions: [StaffPermission.COMPANY_MANAGE_OPERATIONS],
    supportedPermissions: [
      StaffPermission.COMPANY_MANAGE_OPERATIONS,
      StaffPermission.COMPANY_VIEW_FINANCIAL_SUMMARIES,
      StaffPermission.COMPANY_VIEW_ANALYTICS,
      StaffPermission.COMPANY_VIEW_STAFF_MANAGEMENT,
    ],
    getBusiness: async (ownerId) => {
      const company = await prisma.company.findUnique({
        where: { ownerId },
        select: {
          id: true,
          name: true,
          address: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
          owner: { select: { phone: true } },
        },
      });
      return company
        ? {
            id: company.id,
            name: company.name,
            contact: company.owner.phone,
            address: company.address,
            ownerId: company.ownerId,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt,
          }
        : null;
    },
  },
} as const satisfies Partial<Record<UserRole, StaffAccountModule>>;

export type SupportedStaffAccountRole = keyof typeof STAFF_ACCOUNT_MODULES;

export function getStaffAccountModule(role: UserRole | string | undefined) {
  return role ? STAFF_ACCOUNT_MODULES[role as SupportedStaffAccountRole] ?? null : null;
}

export function isSupportedStaffAccountRole(
  role: UserRole | string | undefined
): role is SupportedStaffAccountRole {
  return Boolean(getStaffAccountModule(role));
}

export function getAllowedStaffPermissions(role: UserRole) {
  return getStaffAccountModule(role)?.supportedPermissions ?? [];
}

export async function getAccountBusiness(ownerId: string, role: UserRole) {
  return getStaffAccountModule(role)?.getBusiness(ownerId) ?? null;
}

/**
 * A staff login is usable only while its owner's module feature is enabled.
 * Keep this in the shared staff registry so every module receives the same
 * immediate lockout behavior when an administrator turns its feature off.
 */
export async function isStaffAccountFeatureEnabled(ownerId: string, role: UserRole) {
  const module = getStaffAccountModule(role);
  return module
    ? isAccountFeatureEnabled(ownerId, module.featureKey)
    : false;
}

export async function getOwnerStaffAccountModule(ownerId: string) {
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { role: true },
  });
  return owner && isSupportedStaffAccountRole(owner.role)
    ? getStaffAccountModule(owner.role)
    : null;
}
