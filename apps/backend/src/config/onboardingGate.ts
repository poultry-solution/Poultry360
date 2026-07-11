import { UserOnboardingPaymentState } from "@prisma/client";

/**
 * New signups are locked until a SUPER_ADMIN approves the account.
 * A user is blocked whenever their onboarding record is still locked and
 * has not been approved yet.
 */
export function isOnboardingApprovalBlocking(input: {
  state: UserOnboardingPaymentState;
  lockedUntilApproved: boolean;
}): boolean {
  return (
    input.lockedUntilApproved &&
    input.state !== UserOnboardingPaymentState.PAYMENT_APPROVED
  );
}
