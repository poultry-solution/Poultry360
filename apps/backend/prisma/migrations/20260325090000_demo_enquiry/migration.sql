-- CreateTable
CREATE TABLE "public"."DemoEnquiry" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoEnquiry_createdAt_idx" ON "public"."DemoEnquiry"("createdAt");

