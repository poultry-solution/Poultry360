import bcrypt from "bcrypt";
import {
  CalendarType,
  Language,
  Prisma,
  UserOnboardingPaymentState,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { getNepalBsTodayString, prevBsDate } from "../utils/nepalBsDate";

export const DEMO_ACCOUNTS = {
  farmer: {
    id: "p360-demo-user-farmer-v1",
    phone: "+9779800360001",
    role: UserRole.OWNER,
    name: "Aarav Demo Farmer",
    businessName: "Green Valley Poultry Farm",
    location: "Bharatpur-16, Chitwan",
    passwordEnv: "P360_DEMO_FARMER_PASSWORD",
  },
  dealer: {
    id: "p360-demo-user-dealer-v1",
    phone: "+9779800360002",
    role: UserRole.DEALER,
    name: "Suman Demo Dealer",
    businessName: "Narayani Poultry Suppliers",
    location: "Bharatpur-10, Chitwan",
    passwordEnv: "P360_DEMO_DEALER_PASSWORD",
  },
  company: {
    id: "p360-demo-user-company-v1",
    phone: "+9779800360003",
    role: UserRole.COMPANY,
    name: "Pragati Demo Company",
    businessName: "Pragati Feeds Nepal",
    location: "Hetauda Industrial Area, Makwanpur",
    passwordEnv: "P360_DEMO_COMPANY_PASSWORD",
  },
  hatchery: {
    id: "p360-demo-user-hatchery-v1",
    phone: "+9779800360004",
    role: UserRole.HATCHERY,
    name: "Nabin Demo Hatchery",
    businessName: "Narayani Prime Hatchery",
    location: "Ratnanagar-10, Chitwan",
    passwordEnv: "P360_DEMO_HATCHERY_PASSWORD",
  },
} as const;

export const DEFAULT_DEMO_PASSWORD = "Poultry360Demo!";

export type DemoAccount = (typeof DEMO_ACCOUNTS)[keyof typeof DEMO_ACCOUNTS];

export const decimal = (value: number | string) => new Prisma.Decimal(value);

export const daysAgo = (days: number, hour = 9): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

export const daysFromNow = (days: number, hour = 9): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

export const demoPassword = (account: DemoAccount): string =>
  process.env[account.passwordEnv] ||
  process.env.P360_DEMO_PASSWORD ||
  DEFAULT_DEMO_PASSWORD;

export const hashDemoPassword = async (account: DemoAccount): Promise<string> =>
  bcrypt.hash(demoPassword(account), 12);

export const bsDates = (count: number): string[] => {
  const result = [getNepalBsTodayString()];
  while (result.length < count) {
    result.push(prevBsDate(result[result.length - 1]));
  }
  return result;
};

/**
 * Upserts a record by its reserved demo ID. Stable IDs make every seed rerun
 * idempotent without deleting unrelated production rows.
 */
export async function upsertById<T = any>(
  delegate: any,
  id: string,
  data: Record<string, unknown>,
): Promise<T> {
  return delegate.upsert({
    where: { id },
    create: { id, ...data },
    update: data,
  });
}

export async function upsertDemoUser(
  tx: Prisma.TransactionClient,
  account: DemoAccount,
  passwordHash: string,
) {
  const [existingById, existingByPhone] = await Promise.all([
    tx.user.findUnique({ where: { id: account.id } }),
    tx.user.findUnique({ where: { phone: account.phone } }),
  ]);

  if (existingByPhone && existingByPhone.id !== account.id) {
    throw new Error(
      `Refusing to seed: reserved demo phone ${account.phone} belongs to another user (${existingByPhone.id}).`,
    );
  }

  if (
    existingById &&
    (existingById.phone !== account.phone || existingById.role !== account.role)
  ) {
    throw new Error(
      `Refusing to seed: reserved demo ID ${account.id} is already used by a different account.`,
    );
  }

  const user = await tx.user.upsert({
    where: { id: account.id },
    create: {
      id: account.id,
      phone: account.phone,
      name: account.name,
      password: passwordHash,
      role: account.role,
      status: UserStatus.ACTIVE,
      companyName: account.businessName,
      CompanyFarmLocation: account.location,
      language: Language.ENGLISH,
      calendarType: CalendarType.BS,
    },
    update: {
      phone: account.phone,
      name: account.name,
      password: passwordHash,
      role: account.role,
      status: UserStatus.ACTIVE,
      companyName: account.businessName,
      CompanyFarmLocation: account.location,
      language: Language.ENGLISH,
      calendarType: CalendarType.BS,
    },
  });

  await tx.userOnboardingPayment.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      state: UserOnboardingPaymentState.PAYMENT_APPROVED,
      lockedUntilApproved: false,
      approvedAt: daysAgo(120),
      approvedBy: "DEMO_SEED",
    },
    update: {
      state: UserOnboardingPaymentState.PAYMENT_APPROVED,
      lockedUntilApproved: false,
      approvedAt: daysAgo(120),
      approvedBy: "DEMO_SEED",
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
    },
  });

  return user;
}

export function printDemoCredentials(
  label: string,
  account: DemoAccount,
): void {
  console.log(`\n${label} demo account is ready.`);
  console.log(`Phone: ${account.phone}`);
  console.log(`Password: ${demoPassword(account)}`);
  console.log("Seed mode: idempotent upsert (no broad deletes).\n");
}
