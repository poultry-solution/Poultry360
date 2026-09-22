import "dotenv/config";
import bcrypt from "bcrypt";
import {
  CalendarType,
  Language,
  UserOnboardingPaymentState,
  UserRole,
  UserStatus,
} from "@prisma/client";
import prisma from "../utils/prisma";
import { DEFAULT_DEMO_PASSWORD } from "./demoSeedUtils";

const phone = process.env.P360_CLEAN_DEALER_PHONE || "+9779800360099";
const password = process.env.P360_CLEAN_DEALER_PASSWORD || DEFAULT_DEMO_PASSWORD;

async function seedCleanAccountingDealer() {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    throw new Error(
      `A user already uses ${phone}. Refusing to change that account. Choose a different P360_CLEAN_DEALER_PHONE.`,
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        phone,
        name: "Accounting Check Dealer",
        password: passwordHash,
        role: UserRole.DEALER,
        status: UserStatus.ACTIVE,
        companyName: "Clean Dealer Test Account",
        CompanyFarmLocation: "Local test account",
        language: Language.ENGLISH,
        calendarType: CalendarType.BS,
      },
    });

    await tx.userOnboardingPayment.create({
      data: {
        userId: user.id,
        state: UserOnboardingPaymentState.PAYMENT_APPROVED,
        lockedUntilApproved: false,
        approvedAt: new Date(),
        approvedBy: "LOCAL_CLEAN_SEED",
      },
    });

    await tx.dealer.create({
      data: {
        name: "Clean Dealer Test Account",
        contact: phone,
        address: "Local test account",
        classification: "SELF_CREATED",
        ownerId: user.id,
      },
    });
  });

  console.log("Clean dealer account created with no products, customers, suppliers, sales, or balances.");
  console.log(`Phone: ${phone}`);
  console.log(`Password: ${password}`);
}

seedCleanAccountingDealer()
  .catch((error) => {
    console.error("Clean dealer seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
