import { UserOnboardingPaymentState } from "@prisma/client";

const DEFAULT_TRIAL_DURATION_DAYS = 7;

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

export function getOnboardingTrialDurationDays(): number {
  const fromEnv = parsePositiveInt(
    process.env.ONBOARDING_TRIAL_DURATION_DAYS
  );
  return fromEnv ?? DEFAULT_TRIAL_DURATION_DAYS;
}

export function isTrialAccessActive(trialEndsAt: Date | null): boolean {
  if (!trialEndsAt) return false;
  return trialEndsAt.getTime() > Date.now();
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isOnboardingPaymentGateBlocking(input: {
  state: UserOnboardingPaymentState;
  lockedUntilApproved: boolean;
  trialEndsAt: Date | null;
}): boolean {
  // Existing behavior: any user that is not PAYMENT_APPROVED and is "locked until approved"
  // is blocked by the payment gate (middleware whitelist all that is needed for onboarding).
  //
  // Product rule:
  // - Trial can grant access while the user is still in the unpaid flow (PENDING_PAYMENT or
  //   PAYMENT_REJECTED).
  // - If user submits a receipt, onboarding becomes PENDING_REVIEW and we keep the existing lock
  //   even if trial time is still remaining.
  const lockedByPaymentGate =
    input.lockedUntilApproved &&
    input.state !== UserOnboardingPaymentState.PAYMENT_APPROVED;

  if (!lockedByPaymentGate) return false;

  const trialActive = isTrialAccessActive(input.trialEndsAt);
  if (!trialActive) return true;

  // Trial does not override "receipt submitted" review state.
  if (input.state === UserOnboardingPaymentState.PENDING_REVIEW) return true;

  return false;
}

