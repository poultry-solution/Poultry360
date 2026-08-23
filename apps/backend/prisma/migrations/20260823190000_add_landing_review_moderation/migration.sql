CREATE TYPE "public"."LandingReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "public"."LandingReview"
ADD COLUMN "status" "public"."LandingReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedBy" TEXT,
ADD COLUMN "rejectionReason" TEXT;

CREATE INDEX "LandingReview_status_createdAt_idx"
ON "public"."LandingReview"("status", "createdAt");
