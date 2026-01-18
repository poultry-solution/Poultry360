/**
 * Migration script to create DealerVerificationRequest records
 * from existing dealer-company relationships
 * 
 * Run this after creating the DealerVerificationRequest model migration
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateExistingDealerCompanyRelationships() {
  console.log("Starting migration of dealer-company relationships...");

  try {
    // Find all dealers with a companyId
    const dealersWithCompanies = await prisma.dealer.findMany({
      where: {
        companyId: {
          not: null,
        },
      },
      include: {
        company: true,
      },
    });

    console.log(`Found ${dealersWithCompanies.length} dealers with company relationships`);

    // Create APPROVED verification requests for existing relationships
    for (const dealer of dealersWithCompanies) {
      if (!dealer.companyId) continue;

      // Check if verification request already exists
      const existingRequest = await prisma.dealerVerificationRequest.findFirst({
        where: {
          dealerId: dealer.id,
          companyId: dealer.companyId,
          status: "APPROVED",
        },
      });

      if (existingRequest) {
        console.log(
          `Verification request already exists for dealer ${dealer.id} and company ${dealer.companyId}`
        );
        continue;
      }

      // Create APPROVED verification request
      await prisma.dealerVerificationRequest.create({
        data: {
          dealerId: dealer.id,
          companyId: dealer.companyId,
          status: "APPROVED",
          rejectedCount: 0,
          // Set acknowledgedAt to now so dealers don't see old messages
          acknowledgedAt: new Date(),
        },
      });

      console.log(
        `Created APPROVED verification request for dealer ${dealer.name} and company ${dealer.company?.name}`
      );
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateExistingDealerCompanyRelationships()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
