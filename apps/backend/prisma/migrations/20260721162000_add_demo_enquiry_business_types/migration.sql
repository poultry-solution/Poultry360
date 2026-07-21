-- Add optional business type selections for landing page demo enquiries.
ALTER TABLE "public"."DemoEnquiry"
ADD COLUMN "businessTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
