import "dotenv/config";
import prisma from "../utils/prisma";
import {
  DEMO_ACCOUNTS,
  hashDemoPassword,
  printDemoCredentials,
  requireLocalDatabase,
  upsertDemoUser,
} from "./demoSeedUtils";

const account = DEMO_ACCOUNTS.superAdmin;

async function seedDemoSuperAdmin(): Promise<void> {
  // Local only: never create an extra admin login on production.
  requireLocalDatabase("Super Admin seed");
  console.log("Seeding Super Admin demo account (local)...");
  const passwordHash = await hashDemoPassword(account);

  await prisma.$transaction(async (tx) => {
    await upsertDemoUser(tx, account, passwordHash);
  });

  printDemoCredentials("Super Admin", account);
}

seedDemoSuperAdmin()
  .catch((error) => {
    console.error("Super Admin demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
