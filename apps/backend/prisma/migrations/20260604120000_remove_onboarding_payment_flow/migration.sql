-- Remove the onboarding payment flow (receipts, pricing settings, free trial).
-- Account activation is now handled purely as an admin approval gate via
-- UserOnboardingPayment.

-- Normalize any in-flight "receipt submitted" records to "pending approval" so
-- they remain visible (and actionable) in the new admin approval queue.
UPDATE "UserOnboardingPayment" SET "state" = 'PENDING_PAYMENT' WHERE "state" = 'PENDING_REVIEW';

-- Drop payment receipt submissions (must be dropped before its enum type).
DROP TABLE IF EXISTS "UserPaymentSubmission";

-- Drop admin-managed pricing / QR settings.
DROP TABLE IF EXISTS "OnboardingPaymentSettings";

-- Drop the now-unused free-trial column.
ALTER TABLE "UserOnboardingPayment" DROP COLUMN IF EXISTS "trialEndsAt";

-- Drop the enum type that only the submissions table used.
DROP TYPE IF EXISTS "UserPaymentSubmissionStatus";
