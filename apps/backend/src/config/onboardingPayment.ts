import { UserRole } from "@prisma/client";
import prisma from "../utils/prisma";

const SETTINGS_ID = "default";

export interface OnboardingPaymentResolvedSettings {
  rolePricing: {
    OWNER: number;
    MANAGER: number;
    DEALER: number;
    COMPANY: number;
    HATCHERY: number;
  };
  qr: {
    qrImageUrl: string | null;
    qrText: string;
    phoneDisplay: string;
    accountHint: string;
  };
}

export async function getOnboardingPaymentSettings(): Promise<OnboardingPaymentResolvedSettings | null> {
  const settings = await prisma.onboardingPaymentSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (!settings) {
    return null;
  }

  return {
    rolePricing: {
      OWNER: Number(settings.ownerAmountNpr),
      MANAGER: Number(settings.managerAmountNpr),
      DEALER: Number(settings.dealerAmountNpr),
      COMPANY: Number(settings.companyAmountNpr),
      HATCHERY: Number(settings.hatcheryAmountNpr),
    },
    qr: {
      qrImageUrl: settings.qrImageUrl || null,
      qrText: settings.qrText || "Poultry360 Onboarding Payment",
      phoneDisplay: settings.phoneDisplay,
      accountHint: settings.accountHint,
    },
  };
}

export function getOnboardingAmountForRole(
  role: UserRole,
  rolePricing: OnboardingPaymentResolvedSettings["rolePricing"]
): number {
  if (role === "DOCTOR" || role === "SUPER_ADMIN") return 0;
  if (role === "OWNER") return rolePricing.OWNER;
  if (role === "MANAGER") return rolePricing.MANAGER;
  if (role === "DEALER") return rolePricing.DEALER;
  if (role === "COMPANY") return rolePricing.COMPANY;
  if (role === "HATCHERY") return rolePricing.HATCHERY;
  return rolePricing.OWNER;
}

