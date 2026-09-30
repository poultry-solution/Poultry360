import "dotenv/config";
import bcrypt from "bcrypt";
import {
  CalendarType,
  Language,
  PurchaseCategory,
  UserOnboardingPaymentState,
  UserRole,
  UserStatus,
} from "@prisma/client";
import prisma from "../utils/prisma";
import { InventoryService } from "../services/inventoryService";

const phone = process.env.P360_DEMO_FARMER_INVENTORY_PHONE || "+9779800360020";
const password = process.env.P360_DEMO_FARMER_INVENTORY_PASSWORD || "Poultry360Test!";

const supplierName = "Demo Feed and Chick Supplier";
const purchaseDate = new Date();

async function seedDemoFarmerInventory(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    throw new Error(
      `A user already uses ${phone}. Refusing to change that account. ` +
        "Choose another P360_DEMO_FARMER_INVENTORY_PHONE.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { user, supplier } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        phone,
        name: "Demo Farmer Inventory",
        password: passwordHash,
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
        isTestAccount: true,
        companyName: "Demo Farmer Inventory Account",
        CompanyFarmLocation: "Local demo account",
        language: Language.ENGLISH,
        calendarType: CalendarType.AD,
      },
    });

    await tx.userOnboardingPayment.create({
      data: {
        userId: user.id,
        state: UserOnboardingPaymentState.PAYMENT_APPROVED,
        lockedUntilApproved: false,
        approvedAt: new Date(),
        approvedBy: "DEMO_SEED",
      },
    });

    const supplier = await tx.dealer.create({
      data: {
        name: supplierName,
        contact: "+9779800360021",
        address: "Local demo supplier",
        classification: "SELF_CREATED",
        userId: user.id,
      },
    });

    return { user, supplier };
  });

  await InventoryService.processSupplierPurchase({
    userId: user.id,
    dealerId: supplier.id,
    itemName: "Day-old Broiler Chicks",
    quantity: 100,
    unit: "birds",
    unitPrice: 80,
    totalAmount: 8000,
    date: purchaseDate,
    purchaseCategory: PurchaseCategory.CHICKS,
    reference: "DEMO-CHICKS-100",
  });

  await InventoryService.processSupplierPurchase({
    userId: user.id,
    dealerId: supplier.id,
    itemName: "Broiler Starter Feed",
    quantity: 100,
    unit: "Bag",
    kgPerUnit: 50,
    unitPrice: 3000,
    totalAmount: 300000,
    date: purchaseDate,
    purchaseCategory: PurchaseCategory.FEED,
    enforceFarmerFeedUnits: true,
    reference: "DEMO-FEED-BAGS-100",
  });

  console.log("Demo farmer inventory account created.");
  console.log(`Phone: ${phone}`);
  console.log(`Password: ${password}`);
  console.log(`User ID: ${user.id}`);
  console.log(`Supplier: ${supplierName} (${supplier.id})`);
  console.log("Created: 100 chicks and 100 feed bags (50 kg per bag).");
  console.log("No farm or batch was created.");
}

seedDemoFarmerInventory()
  .catch((error) => {
    console.error("Demo farmer inventory seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
