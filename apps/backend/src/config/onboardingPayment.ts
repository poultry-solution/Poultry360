import { UserRole } from "@prisma/client";

export const onboardingPaymentPricing: Record<UserRole, number> = {
  // Owners/farmers (OWNER, MANAGER, FARMER depending on your roles usage)
  OWNER: 6999,
  MANAGER: 6999,
  // Connected roles
  DEALER: 7875,
  COMPANY: 30000,
  DOCTOR: 30000,
  SUPER_ADMIN: 0,
};

export const onboardingPaymentQr: {
  qrText: string;
  phoneDisplay: string;
  accountHint: string;
} = {
  // Replace with your real QR payload once you have it.
  qrText: "Poultry360 Onboarding Payment",
  phoneDisplay: "+977 9809781908",
  accountHint: "Pay the onboarding fee to activate your account.",
};

export function getOnboardingAmountForRole(role: UserRole): number {
  return onboardingPaymentPricing[role] ?? onboardingPaymentPricing.OWNER;
}

