-- Admin follow-up status for landing page leads: null = New, set = Contacted.
ALTER TABLE "public"."DemoEnquiry" ADD COLUMN "contactedAt" TIMESTAMP(3),
ADD COLUMN "contactedById" TEXT;

ALTER TABLE "public"."LandingContact" ADD COLUMN "contactedAt" TIMESTAMP(3),
ADD COLUMN "contactedById" TEXT;

CREATE INDEX "DemoEnquiry_contactedAt_idx" ON "public"."DemoEnquiry"("contactedAt");
CREATE INDEX "LandingContact_contactedAt_idx" ON "public"."LandingContact"("contactedAt");
