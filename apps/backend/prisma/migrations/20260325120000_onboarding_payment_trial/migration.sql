-- Add optional free-trial end time for onboarding payment gate
ALTER TABLE "public"."UserOnboardingPayment"
ADD COLUMN "trialEndsAt" TIMESTAMP(3);

