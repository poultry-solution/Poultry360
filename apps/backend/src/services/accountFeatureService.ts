import { UserRole } from "@prisma/client";
import prisma from "../utils/prisma";

export const ACCOUNT_FEATURE_KEYS = {
  SELF_FEED_PRODUCTION: "SELF_FEED_PRODUCTION",
  DEALER_STAFF_OPERATIONS: "DEALER_STAFF_OPERATIONS",
  HATCHERY_STAFF_OPERATIONS: "HATCHERY_STAFF_OPERATIONS",
} as const;

export type AccountFeatureKey =
  (typeof ACCOUNT_FEATURE_KEYS)[keyof typeof ACCOUNT_FEATURE_KEYS];

export interface AccountFeatureDefinition {
  key: AccountFeatureKey;
  name: string;
  description: string;
  applicableRoles: UserRole[];
  defaultEnabled: boolean;
}

export const ACCOUNT_FEATURE_DEFINITIONS: Record<
  AccountFeatureKey,
  AccountFeatureDefinition
> = {
  SELF_FEED_PRODUCTION: {
    key: ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION,
    name: "Self-Feed Production",
    description:
      "Create Self Feed products from purchased raw materials in Farmer and Hatchery.",
    applicableRoles: [UserRole.OWNER, UserRole.HATCHERY],
    defaultEnabled: false,
  },
  DEALER_STAFF_OPERATIONS: {
    key: ACCOUNT_FEATURE_KEYS.DEALER_STAFF_OPERATIONS,
    name: "Dealer Staff Operations",
    description:
      "Manage payroll staff, staff login access, and owner-visible business activity history.",
    applicableRoles: [UserRole.DEALER],
    defaultEnabled: true,
  },
  HATCHERY_STAFF_OPERATIONS: {
    key: ACCOUNT_FEATURE_KEYS.HATCHERY_STAFF_OPERATIONS,
    name: "Hatchery Staff Operations",
    description:
      "Manage payroll staff, staff login access, and owner-visible business activity history.",
    applicableRoles: [UserRole.HATCHERY],
    defaultEnabled: true,
  },
};

export const getAccountFeatureDefinition = (featureKey: string) =>
  ACCOUNT_FEATURE_DEFINITIONS[featureKey as AccountFeatureKey] ?? null;

export const getResolvedAccountFeatures = async (
  accountId: string,
  role: UserRole
) => {
  const definitions = Object.values(ACCOUNT_FEATURE_DEFINITIONS).filter(
    (definition) => definition.applicableRoles.includes(role)
  );
  if (definitions.length === 0) return [];

  const records = await prisma.accountFeature.findMany({
    where: {
      accountId,
      featureKey: { in: definitions.map((definition) => definition.key) },
    },
    select: { featureKey: true, enabled: true, updatedAt: true },
  });
  const recordsByKey = new Map(
    records.map((record) => [record.featureKey, record])
  );

  return definitions.map((definition) => {
    const record = recordsByKey.get(definition.key);
    return {
      key: definition.key,
      name: definition.name,
      description: definition.description,
      enabled: record?.enabled ?? definition.defaultEnabled,
      updatedAt: record?.updatedAt ?? null,
    };
  });
};

export const isAccountFeatureEnabled = async (
  accountId: string,
  featureKey: AccountFeatureKey
) => {
  const record = await prisma.accountFeature.findUnique({
    where: { accountId_featureKey: { accountId, featureKey } },
    select: { enabled: true },
  });
  return record?.enabled ?? ACCOUNT_FEATURE_DEFINITIONS[featureKey].defaultEnabled;
};

export const setAccountFeature = async (input: {
  accountId: string;
  featureKey: AccountFeatureKey;
  enabled: boolean;
  updatedById: string;
}) => {
  const record = await prisma.accountFeature.upsert({
    where: {
      accountId_featureKey: {
        accountId: input.accountId,
        featureKey: input.featureKey,
      },
    },
    update: {
      enabled: input.enabled,
      updatedById: input.updatedById,
    },
    create: input,
  });
  const definition = ACCOUNT_FEATURE_DEFINITIONS[input.featureKey];
  return {
    key: definition.key,
    name: definition.name,
    description: definition.description,
    enabled: record.enabled,
    updatedAt: record.updatedAt,
  };
};
