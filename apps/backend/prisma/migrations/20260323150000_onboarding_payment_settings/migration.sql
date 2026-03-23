-- CreateTable
CREATE TABLE "public"."OnboardingPaymentSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "ownerAmountNpr" DECIMAL(10,2) NOT NULL DEFAULT 6999,
    "managerAmountNpr" DECIMAL(10,2) NOT NULL DEFAULT 6999,
    "dealerAmountNpr" DECIMAL(10,2) NOT NULL DEFAULT 7875,
    "companyAmountNpr" DECIMAL(10,2) NOT NULL DEFAULT 30000,
    "qrImageUrl" TEXT,
    "qrText" TEXT,
    "phoneDisplay" TEXT NOT NULL DEFAULT '+977 9809781908',
    "accountHint" TEXT NOT NULL DEFAULT 'Pay the onboarding fee to activate your account.',
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingPaymentSettings_pkey" PRIMARY KEY ("id")
);

-- Seed singleton settings row
INSERT INTO "public"."OnboardingPaymentSettings" (
  "id",
  "ownerAmountNpr",
  "managerAmountNpr",
  "dealerAmountNpr",
  "companyAmountNpr",
  "qrImageUrl",
  "qrText",
  "phoneDisplay",
  "accountHint",
  "createdAt",
  "updatedAt"
)
VALUES (
  'default',
  6999,
  6999,
  7875,
  30000,
  '/payment-qr.png',
  'Poultry360 Onboarding Payment',
  '+977 9809781908',
  'Pay the onboarding fee to activate your account.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
