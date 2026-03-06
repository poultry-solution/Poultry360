-- CreateTable
CREATE TABLE "public"."LandingReview" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "business" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "review" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LandingContact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "farmType" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingReview_createdAt_idx" ON "public"."LandingReview"("createdAt");

-- CreateIndex
CREATE INDEX "LandingContact_createdAt_idx" ON "public"."LandingContact"("createdAt");
