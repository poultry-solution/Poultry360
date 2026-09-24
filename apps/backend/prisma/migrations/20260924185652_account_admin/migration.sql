-- CreateTable
CREATE TABLE "public"."AdminExpense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "spentAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminExpense_spentAt_idx" ON "public"."AdminExpense"("spentAt");
