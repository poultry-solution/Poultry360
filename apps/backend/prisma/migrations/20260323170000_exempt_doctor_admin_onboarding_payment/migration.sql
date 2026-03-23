-- Unlock and auto-approve onboarding payment for non-chargeable roles
UPDATE "public"."UserOnboardingPayment" uop
SET
  "state" = 'PAYMENT_APPROVED',
  "lockedUntilApproved" = false,
  "rejectionReason" = NULL,
  "rejectedAt" = NULL,
  "rejectedBy" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "public"."User" u
WHERE uop."userId" = u."id"
  AND u."role" IN ('DOCTOR', 'SUPER_ADMIN');
