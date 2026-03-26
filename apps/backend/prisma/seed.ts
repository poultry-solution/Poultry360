import {
  PrismaClient,
  UserRole,
  UserStatus,
  Language,
  CalendarType,
  HatcherySupplierTxnType,
  HatcheryPurchaseCategory,
  HatcheryInventoryItemType,
  HatcheryInventoryTxnType,
  HatcheryBatchType,
  HatcheryBatchStatus,
  HatcheryEggTxnType,
  HatcheryBatchExpenseType,
  HatcheryIncubationStage,
  HatcheryChickGrade,
  HatcheryChickTxnType,
  HatcheryInventoryItemType,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  // ==================== ONBOARDING PAYMENT SETTINGS ====================
  console.log("Creating onboarding payment settings...");
  await prisma.onboardingPaymentSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ownerAmountNpr: 6999,
      managerAmountNpr: 6999,
      dealerAmountNpr: 7875,
      companyAmountNpr: 30000,
      hatcheryAmountNpr: 9999,
      qrImageUrl: "/payment-qr.png",
      qrText: "Poultry360 Onboarding Payment",
      phoneDisplay: "+977 9809781908",
      accountHint: "Pay the onboarding fee to activate your account.",
    },
    update: {},
  });

  // ==================== SUPER ADMIN ====================
  console.log("Creating SUPER_ADMIN...");
  const superAdmin = await prisma.user.upsert({
    where: { phone: "+9779810000001" },
    create: {
      phone: "+9779810000001",
      name: "System Administrator",
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      language: Language.ENGLISH,
      calendarType: CalendarType.AD,
    },
    update: {},
  });

  // ==================== COMPANY OWNERS ====================
  console.log("Creating Company owners...");
  const companyOwner1 = await prisma.user.upsert({
    where: { phone: "+9779800000010" },
    create: {
      phone: "+9779800000010",
      name: "Rajesh Shrestha",
      companyName: "Nepal Poultry Feeds Pvt. Ltd.",
      CompanyFarmLocation: "Bagmati, Kathmandu",
      password: hashedPassword,
      role: UserRole.COMPANY,
      status: UserStatus.ACTIVE,
      language: Language.ENGLISH,
      calendarType: CalendarType.AD,
    },
    update: {},
  });

  const companyOwner2 = await prisma.user.upsert({
    where: { phone: "+9779800000011" },
    create: {
      phone: "+9779800000011",
      name: "Sita Adhikari",
      companyName: "Himalayan Agro Industries",
      CompanyFarmLocation: "Lumbini, Butwal",
      password: hashedPassword,
      role: UserRole.COMPANY,
      status: UserStatus.ACTIVE,
      language: Language.NEPALI,
      calendarType: CalendarType.BS,
    },
    update: {},
  });

  // ==================== COMPANIES ====================
  console.log("Creating Companies...");
  const company1 = await prisma.company.upsert({
    where: { ownerId: companyOwner1.id },
    create: {
      name: "Nepal Poultry Feeds Pvt. Ltd.",
      address: "Balaju Industrial Area, Kathmandu",
      ownerId: companyOwner1.id,
    },
    update: {},
  });

  const company2 = await prisma.company.upsert({
    where: { ownerId: companyOwner2.id },
    create: {
      name: "Himalayan Agro Industries",
      address: "Butwal Industrial Corridor, Rupandehi",
      ownerId: companyOwner2.id,
    },
    update: {},
  });

  // ==================== DEALER USERS ====================
  console.log("Creating Dealer users...");
  const dealerUser1 = await prisma.user.upsert({
    where: { phone: "+9779800000020" },
    create: {
      phone: "+9779800000020",
      name: "Hari Prasad Thapa",
      companyName: "Thapa Feed House",
      CompanyFarmLocation: "Gandaki, Pokhara",
      password: hashedPassword,
      role: UserRole.DEALER,
      status: UserStatus.ACTIVE,
      language: Language.ENGLISH,
      calendarType: CalendarType.AD,
    },
    update: {},
  });

  const dealerUser2 = await prisma.user.upsert({
    where: { phone: "+9779800000021" },
    create: {
      phone: "+9779800000021",
      name: "Binod Gurung",
      companyName: "Gurung Agro Supplies",
      CompanyFarmLocation: "Bagmati, Bhaktapur",
      password: hashedPassword,
      role: UserRole.DEALER,
      status: UserStatus.ACTIVE,
      language: Language.NEPALI,
      calendarType: CalendarType.BS,
    },
    update: {},
  });

  const dealerUser3 = await prisma.user.upsert({
    where: { phone: "+9779800000022" },
    create: {
      phone: "+9779800000022",
      name: "Kamala Rai",
      companyName: "Rai Poultry Traders",
      CompanyFarmLocation: "Province 1, Biratnagar",
      password: hashedPassword,
      role: UserRole.DEALER,
      status: UserStatus.PENDING_VERIFICATION,
      language: Language.ENGLISH,
      calendarType: CalendarType.AD,
    },
    update: {},
  });

  // ==================== DEALERS ====================
  console.log("Creating Dealers...");
  const dealer1 = await prisma.dealer.upsert({
    where: { ownerId: dealerUser1.id },
    create: {
      name: "Thapa Feed House",
      contact: "+9779800000020",
      address: "Lakeside Road, Pokhara",
      ownerId: dealerUser1.id,
      classification: "SELF_CREATED",
    },
    update: {},
  });

  const dealer2 = await prisma.dealer.upsert({
    where: { ownerId: dealerUser2.id },
    create: {
      name: "Gurung Agro Supplies", 
      contact: "+9779800000021",
      address: "Suryabinayak, Bhaktapur",
      ownerId: dealerUser2.id,
      classification: "SELF_CREATED",
    },
    update: {},
  });

  const dealer3 = await prisma.dealer.upsert({
    where: { ownerId: dealerUser3.id },
    create: {
      name: "Rai Poultry Traders",
      contact: "+9779800000022",
      address: "Main Road, Biratnagar",
      ownerId: dealerUser3.id,
      classification: "SELF_CREATED",
    },
    update: {},
  });

  // ==================== HATCHERY USERS ====================
  console.log("Creating Hatchery user...");
  const hatcheryUser1 = await prisma.user.upsert({
    where: { phone: "+9779800000060" },
    create: {
      phone: "+9779800000060",
      name: "Sunita Karki",
      password: hashedPassword,
      role: UserRole.HATCHERY,
      status: UserStatus.ACTIVE,
      language: Language.ENGLISH,
      calendarType: CalendarType.AD,
    },
    update: {},
  });

  await prisma.hatcheryBusiness.upsert({
    where: { ownerId: hatcheryUser1.id },
    create: {
      name: "Karki Premium Hatchery",
      contact: "+9779800000060",
      address: "Hetauda Industrial Area, Makwanpur",
      ownerId: hatcheryUser1.id,
    },
    update: {},
  });

  // ==================== HATCHERY SAMPLE SUPPLIERS + INVENTORY ====================
  console.log("Creating sample hatchery suppliers and inventory...");

  const hatcheryFeedSupplier = await prisma.hatcherySupplier.upsert({
    where: { hatcheryOwnerId_name: { hatcheryOwnerId: hatcheryUser1.id, name: "Krishna Feeds" } },
    create: {
      hatcheryOwnerId: hatcheryUser1.id,
      name: "Krishna Feeds",
      contact: "+9779811000001",
      address: "Birgunj, Parsa",
      openingBalance: 15000,
      balance: 15000,
    },
    update: {},
  });

  await prisma.hatcherySupplierTxn.upsert({
    where: { id: "seed-hatchery-ob-1" },
    create: {
      id: "seed-hatchery-ob-1",
      supplierId: hatcheryFeedSupplier.id,
      type: HatcherySupplierTxnType.OPENING_BALANCE,
      amount: 15000,
      balanceAfter: 15000,
      date: new Date("2026-01-01"),
      note: "Opening balance",
    },
    update: {},
  });

  const hatcheryMedSupplier = await prisma.hatcherySupplier.upsert({
    where: { hatcheryOwnerId_name: { hatcheryOwnerId: hatcheryUser1.id, name: "Vet Care Pharma" } },
    create: {
      hatcheryOwnerId: hatcheryUser1.id,
      name: "Vet Care Pharma",
      contact: "+9779822000002",
      address: "Kathmandu, Kirtipur",
      openingBalance: 0,
      balance: 8500,
    },
    update: {},
  });

  // Purchase txn for medicine supplier
  const medPurchaseTxn = await prisma.hatcherySupplierTxn.upsert({
    where: { id: "seed-hatchery-med-purchase-1" },
    create: {
      id: "seed-hatchery-med-purchase-1",
      supplierId: hatcheryMedSupplier.id,
      type: HatcherySupplierTxnType.PURCHASE,
      amount: 8500,
      balanceAfter: 8500,
      date: new Date("2026-03-15"),
      purchaseCategory: HatcheryPurchaseCategory.MEDICINE,
      items: {
        create: [
          {
            itemName: "Newcastle Vaccine",
            quantity: 500,
            freeQuantity: 0,
            unit: "doses",
            unitPrice: 17,
            totalAmount: 8500,
          },
        ],
      },
    },
    update: {},
  });

  // Inventory item for the medicine purchased
  await prisma.hatcheryInventoryItem.upsert({
    where: {
      hatcheryOwnerId_itemType_name_unitPrice_supplierKey: {
        hatcheryOwnerId: hatcheryUser1.id,
        itemType: HatcheryInventoryItemType.MEDICINE,
        name: "Newcastle Vaccine",
        unitPrice: 17,
        supplierKey: `HATCHERY_SUPPLIER:${hatcheryMedSupplier.id}`,
      },
    },
    create: {
      hatcheryOwnerId: hatcheryUser1.id,
      itemType: HatcheryInventoryItemType.MEDICINE,
      name: "Newcastle Vaccine",
      unit: "doses",
      unitPrice: 17,
      supplierKey: `HATCHERY_SUPPLIER:${hatcheryMedSupplier.id}`,
      currentStock: 500,
      minStock: 100,
      transactions: {
        create: [
          {
            type: HatcheryInventoryTxnType.PURCHASE,
            quantity: 500,
            unitPrice: 17,
            amount: 8500,
            date: new Date("2026-03-15"),
            sourceSupplierTxnId: medPurchaseTxn.id,
          },
        ],
      },
    },
    update: {},
  });

  // ==================== HATCHERY BATCHES + EGG PRODUCTION ====================
  console.log("Creating hatchery batch sample data...");

  // First: create a CHICKS inventory item so batch placement has stock
  const chicksItem = await prisma.hatcheryInventoryItem.upsert({
    where: {
      hatcheryOwnerId_itemType_name_unitPrice_supplierKey: {
        hatcheryOwnerId: hatcheryUser1.id,
        itemType: HatcheryInventoryItemType.CHICKS,
        name: "Day-Old Chicks",
        unitPrice: 120,
        supplierKey: `HATCHERY_SUPPLIER:${hatcheryFeedSupplier.id}`,
      },
    },
    create: {
      hatcheryOwnerId: hatcheryUser1.id,
      itemType: HatcheryInventoryItemType.CHICKS,
      name: "Day-Old Chicks",
      unit: "chicks",
      unitPrice: 120,
      supplierKey: `HATCHERY_SUPPLIER:${hatcheryFeedSupplier.id}`,
      currentStock: 500,
    },
    update: {},
  });

  // Create a parent flock batch
  const seedBatch = await prisma.hatcheryBatch.upsert({
    where: { hatcheryOwnerId_code: { hatcheryOwnerId: hatcheryUser1.id, code: "PF-001" } },
    create: {
      hatcheryOwnerId: hatcheryUser1.id,
      type: HatcheryBatchType.PARENT_FLOCK,
      status: HatcheryBatchStatus.ACTIVE,
      code: "PF-001",
      startDate: new Date("2026-01-15"),
      initialParents: 200,
      currentParents: 192,
      placedAt: new Date("2026-01-15"),
      notes: "Seed parent flock batch",
    },
    update: {},
  });

  // Placement record
  await prisma.hatcheryBatchPlacement.upsert({
    where: { id: "seed-batch-placement-1" },
    create: {
      id: "seed-batch-placement-1",
      batchId: seedBatch.id,
      inventoryItemId: chicksItem.id,
      quantity: 200,
    },
    update: {},
  });

  // Egg types
  const hatchableType = await prisma.hatcheryEggType.upsert({
    where: { hatcheryOwnerId_name: { hatcheryOwnerId: hatcheryUser1.id, name: "Hatchable" } },
    create: { hatcheryOwnerId: hatcheryUser1.id, name: "Hatchable", isHatchable: true },
    update: {},
  });

  const rejectedType = await prisma.hatcheryEggType.upsert({
    where: { hatcheryOwnerId_name: { hatcheryOwnerId: hatcheryUser1.id, name: "Rejected" } },
    create: { hatcheryOwnerId: hatcheryUser1.id, name: "Rejected", isHatchable: false },
    update: {},
  });

  // Egg production record
  const eggProd = await prisma.hatcheryEggProduction.upsert({
    where: { id: "seed-egg-prod-1" },
    create: {
      id: "seed-egg-prod-1",
      batchId: seedBatch.id,
      date: new Date("2026-03-01"),
      lines: {
        create: [
          { eggTypeId: hatchableType.id, count: 180 },
          { eggTypeId: rejectedType.id, count: 15 },
        ],
      },
    },
    update: {},
  });

  // Egg stock upsert
  await prisma.hatcheryEggStock.upsert({
    where: { batchId_eggTypeId: { batchId: seedBatch.id, eggTypeId: hatchableType.id } },
    create: { batchId: seedBatch.id, eggTypeId: hatchableType.id, currentStock: 180 },
    update: {},
  });
  await prisma.hatcheryEggStock.upsert({
    where: { batchId_eggTypeId: { batchId: seedBatch.id, eggTypeId: rejectedType.id } },
    create: { batchId: seedBatch.id, eggTypeId: rejectedType.id, currentStock: 15 },
    update: {},
  });

  // Mortality records
  await prisma.hatcheryBatchMortality.upsert({
    where: { id: "seed-mortality-1" },
    create: {
      id: "seed-mortality-1",
      batchId: seedBatch.id,
      date: new Date("2026-02-01"),
      count: 5,
      note: "Respiratory issues",
    },
    update: {},
  });
  await prisma.hatcheryBatchMortality.upsert({
    where: { id: "seed-mortality-2" },
    create: {
      id: "seed-mortality-2",
      batchId: seedBatch.id,
      date: new Date("2026-02-15"),
      count: 3,
      note: "Unknown cause",
    },
    update: {},
  });

  // Batch expense (manual - utilities)
  await prisma.hatcheryBatchExpense.upsert({
    where: { id: "seed-expense-1" },
    create: {
      id: "seed-expense-1",
      batchId: seedBatch.id,
      date: new Date("2026-02-01"),
      type: HatcheryBatchExpenseType.MANUAL,
      category: "utilities",
      itemName: "Electricity",
      amount: 3500,
      note: "February electricity bill",
    },
    update: {},
  });

  console.log("✅ Hatchery batch seed data created.");

  // ==================== FARMER OWNERS ====================
  console.log("Creating Farmers...");
  const farmer1 = await prisma.user.upsert({
    where: { phone: "+9779800000030" },
    create: {
      phone: "+9779800000030",
      name: "Ram Bahadur Tamang",
      companyName: "Tamang Poultry Farm",
      CompanyFarmLocation: "Bagmati, Kavrepalanchok",
      password: hashedPassword,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      language: Language.NEPALI,
      calendarType: CalendarType.BS,
    },
    update: {},
  });

  const farmer2 = await prisma.user.upsert({
    where: { phone: "+9779800000031" },
    create: {
      phone: "+9779800000031",
      name: "Gita Sharma",
      companyName: "Sharma Layer Farm",
      CompanyFarmLocation: "Lumbini, Nawalparasi",
      password: hashedPassword,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      language: Language.ENGLISH,
      calendarType: CalendarType.AD,
    },
    update: {},
  });

  const farmer3 = await prisma.user.upsert({
    where: { phone: "+9779800000032" },
    create: {
      phone: "+9779800000032",
      name: "Deepak Magar",
      companyName: "Magar Broiler House",
      CompanyFarmLocation: "Gandaki, Tanahun",
      password: hashedPassword,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      language: Language.NEPALI,
      calendarType: CalendarType.BS,
    },
    update: {},
  });

  const farmer4 = await prisma.user.upsert({
    where: { phone: "+9779800000033" },
    create: {
      phone: "+9779800000033",
      name: "Sunita Pandey",
      companyName: "Pandey Organic Poultry",
      CompanyFarmLocation: "Madhesh, Birgunj",
      password: hashedPassword,
      role: UserRole.OWNER,
      status: UserStatus.INACTIVE,
      language: Language.ENGLISH,
      calendarType: CalendarType.AD,
    },
    update: {},
  });

  // ==================== MANAGER ====================
  console.log("Creating Manager...");
  const manager1 = await prisma.user.upsert({
    where: { phone: "+9779800000040" },
    create: {
      phone: "+9779800000040",
      name: "Bikash KC",
      CompanyFarmLocation: "Bagmati, Kavrepalanchok",
      password: hashedPassword,
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
      language: Language.ENGLISH,
      calendarType: CalendarType.AD,
    },
    update: {},
  });

  // ==================== DOCTORS ====================
  console.log("Creating Doctors...");
  const doctor1 = await prisma.user.upsert({
    where: { phone: "+9779800000050" },
    create: {
      phone: "+9779800000050",
      name: "Dr. Anita Basnet",
      password: hashedPassword,
      role: UserRole.DOCTOR,
      status: UserStatus.ACTIVE,
      language: Language.ENGLISH,
      calendarType: CalendarType.AD,
    },
    update: {},
  });

  const doctor2 = await prisma.user.upsert({
    where: { phone: "+9779800000051" },
    create: {
      phone: "+9779800000051",
      name: "Dr. Sunil Karki",
      password: hashedPassword,
      role: UserRole.DOCTOR,
      status: UserStatus.ACTIVE,
      language: Language.NEPALI,
      calendarType: CalendarType.BS,
    },
    update: {},
  });

  // ==================== FARMS ====================
  console.log("Creating Farms...");
  const farm1 = await prisma.farm.upsert({
    where: { id: "seed-farm-1" },
    create: {
      id: "seed-farm-1",
      name: "Tamang Broiler Farm",
      capacity: 5000,
      description: "Main broiler production facility",
      ownerId: farmer1.id,
    },
    update: {},
  });

  const farm2 = await prisma.farm.upsert({
    where: { id: "seed-farm-2" },
    create: {
      id: "seed-farm-2",
      name: "Sharma Layer Farm - Unit A",
      capacity: 8000,
      description: "Layer egg production unit",
      ownerId: farmer2.id,
    },
    update: {},
  });

  const farm3 = await prisma.farm.upsert({
    where: { id: "seed-farm-3" },
    create: {
      id: "seed-farm-3",
      name: "Magar Broiler Unit 1",
      capacity: 3000,
      description: "Small broiler operation",
      ownerId: farmer3.id,
    },
    update: {},
  });

  const farm4 = await prisma.farm.upsert({
    where: { id: "seed-farm-4" },
    create: {
      id: "seed-farm-4",
      name: "Tamang Layer House",
      capacity: 2000,
      description: "Secondary layer unit",
      ownerId: farmer1.id,
    },
    update: {},
  });

  // ==================== MANAGER -> FARM CONNECTION ====================
  console.log("Connecting manager to farm...");
  await prisma.farm.update({
    where: { id: farm1.id },
    data: {
      managers: { connect: { id: manager1.id } },
    },
  });

  // ==================== DEALER <-> COMPANY CONNECTIONS ====================
  console.log("Connecting Dealers to Companies...");

  // Dealer 1 connected to Company 1
  await prisma.dealerCompany.upsert({
    where: { dealerId_companyId: { dealerId: dealer1.id, companyId: company1.id } },
    create: {
      dealerId: dealer1.id,
      companyId: company1.id,
      connectedVia: "MIGRATION",
    },
    update: {},
  });

  // Dealer 1 also connected to Company 2
  await prisma.dealerCompany.upsert({
    where: { dealerId_companyId: { dealerId: dealer1.id, companyId: company2.id } },
    create: {
      dealerId: dealer1.id,
      companyId: company2.id,
      connectedVia: "VERIFICATION",
    },
    update: {},
  });

  // Dealer 2 connected to Company 1
  await prisma.dealerCompany.upsert({
    where: { dealerId_companyId: { dealerId: dealer2.id, companyId: company1.id } },
    create: {
      dealerId: dealer2.id,
      companyId: company1.id,
      connectedVia: "VERIFICATION",
    },
    update: {},
  });

  // ==================== DEALER <-> FARMER CONNECTIONS ====================
  console.log("Connecting Dealers to Farmers...");

  // Dealer 1 connected to Farmer 1 and Farmer 2
  await prisma.dealerFarmer.upsert({
    where: { dealerId_farmerId: { dealerId: dealer1.id, farmerId: farmer1.id } },
    create: {
      dealerId: dealer1.id,
      farmerId: farmer1.id,
      connectedVia: "VERIFICATION",
    },
    update: {},
  });

  await prisma.dealerFarmer.upsert({
    where: { dealerId_farmerId: { dealerId: dealer1.id, farmerId: farmer2.id } },
    create: {
      dealerId: dealer1.id,
      farmerId: farmer2.id,
      connectedVia: "VERIFICATION",
    },
    update: {},
  });

  // Dealer 2 connected to Farmer 1 and Farmer 3
  await prisma.dealerFarmer.upsert({
    where: { dealerId_farmerId: { dealerId: dealer2.id, farmerId: farmer1.id } },
    create: {
      dealerId: dealer2.id,
      farmerId: farmer1.id,
      connectedVia: "MANUAL",
    },
    update: {},
  });

  await prisma.dealerFarmer.upsert({
    where: { dealerId_farmerId: { dealerId: dealer2.id, farmerId: farmer3.id } },
    create: {
      dealerId: dealer2.id,
      farmerId: farmer3.id,
      connectedVia: "VERIFICATION",
    },
    update: {},
  });

  // Dealer 3 connected to Farmer 3
  await prisma.dealerFarmer.upsert({
    where: { dealerId_farmerId: { dealerId: dealer3.id, farmerId: farmer3.id } },
    create: {
      dealerId: dealer3.id,
      farmerId: farmer3.id,
      connectedVia: "MANUAL",
    },
    update: {},
  });

  // ==================== DOCTOR <-> FARMER CONVERSATIONS ====================
  console.log("Creating Doctor-Farmer conversations...");

  // Doctor 1 has conversations with Farmer 1 and Farmer 2
  await prisma.conversation.upsert({
    where: { farmerId_doctorId: { farmerId: farmer1.id, doctorId: doctor1.id } },
    create: {
      farmerId: farmer1.id,
      doctorId: doctor1.id,
      subject: "Flock health checkup",
    },
    update: {},
  });

  await prisma.conversation.upsert({
    where: { farmerId_doctorId: { farmerId: farmer2.id, doctorId: doctor1.id } },
    create: {
      farmerId: farmer2.id,
      doctorId: doctor1.id,
      subject: "Vaccination schedule review",
    },
    update: {},
  });

  // Doctor 2 has conversation with Farmer 3
  await prisma.conversation.upsert({
    where: { farmerId_doctorId: { farmerId: farmer3.id, doctorId: doctor2.id } },
    create: {
      farmerId: farmer3.id,
      doctorId: doctor2.id,
      subject: "Feed consultation",
    },
    update: {},
  });

  // ==================== HATCHERY INCUBATION SEED ====================
  console.log("Creating sample hatchery incubation batch...");

  // Reduce parent egg stock by 100 for the incubation (simulate 100 eggs already consumed)
  // Only update if the current stock is still >= 100 (idempotent)
  const currentEggStock = await prisma.hatcheryEggStock.findUnique({
    where: { batchId_eggTypeId: { batchId: seedBatch.id, eggTypeId: hatchableType.id } },
  });

  // Create the incubation batch (upsert by code)
  const seedIncubation = await prisma.hatcheryIncubationBatch.upsert({
    where: { hatcheryOwnerId_code: { hatcheryOwnerId: hatcheryUser1.id, code: "IN-001" } },
    create: {
      hatcheryOwnerId: hatcheryUser1.id,
      parentBatchId: seedBatch.id,
      hatchableEggTypeId: hatchableType.id,
      stage: HatcheryIncubationStage.COMPLETED,
      code: "IN-001",
      name: "First Incubation Run",
      startDate: new Date("2026-03-10"),
      eggsSetCount: 100,
      setterAt: new Date("2026-03-10"),
      candledAt: new Date("2026-03-17"),
      transferredAt: new Date("2026-03-28"),
      hatchedAt: new Date("2026-03-31"),
      notes: "Seed incubation batch",
    },
    update: {},
  });

  // Decrement egg stock (only if not already done)
  if (currentEggStock && currentEggStock.currentStock >= 100) {
    await prisma.hatcheryEggStock.update({
      where: { batchId_eggTypeId: { batchId: seedBatch.id, eggTypeId: hatchableType.id } },
      data: { currentStock: { decrement: 100 } },
    });
  }

  // Egg move audit
  await prisma.hatcheryEggMove.upsert({
    where: { id: "seed-egg-move-1" },
    create: {
      id: "seed-egg-move-1",
      incubationBatchId: seedIncubation.id,
      parentBatchId: seedBatch.id,
      eggTypeId: hatchableType.id,
      count: 100,
      date: new Date("2026-03-10"),
    },
    update: {},
  });

  // Candling losses
  await prisma.hatcheryIncubationLoss.upsert({
    where: { id: "seed-incubation-loss-1" },
    create: {
      id: "seed-incubation-loss-1",
      incubationBatchId: seedIncubation.id,
      type: "INFERTILE",
      date: new Date("2026-03-17"),
      count: 8,
      note: "Infertile eggs removed at candling",
    },
    update: {},
  });
  await prisma.hatcheryIncubationLoss.upsert({
    where: { id: "seed-incubation-loss-2" },
    create: {
      id: "seed-incubation-loss-2",
      incubationBatchId: seedIncubation.id,
      type: "EARLY_DEAD",
      date: new Date("2026-03-17"),
      count: 4,
      note: "Early embryo mortality",
    },
    update: {},
  });

  // Hatch result
  const seedHatchResult = await prisma.hatcheryHatchResult.upsert({
    where: { id: "seed-hatch-result-1" },
    create: {
      id: "seed-hatch-result-1",
      incubationBatchId: seedIncubation.id,
      date: new Date("2026-03-31"),
      hatchedA: 60,
      hatchedB: 15,
      cull: 5,
      lateDead: 4,
      unhatched: 4,
      note: "Good hatch rate",
    },
    update: {},
  });

  // Chick stocks (upsert)
  const gradeStocks: Array<{ grade: HatcheryChickGrade; total: number }> = [
    { grade: HatcheryChickGrade.A, total: 60 },
    { grade: HatcheryChickGrade.B, total: 15 },
    { grade: HatcheryChickGrade.CULL, total: 5 },
  ];

  for (const { grade, total } of gradeStocks) {
    await prisma.hatcheryChickStock.upsert({
      where: { incubationBatchId_grade: { incubationBatchId: seedIncubation.id, grade } },
      create: { incubationBatchId: seedIncubation.id, grade, currentStock: total },
      update: {},
    });

    // Chick txn for production
    await prisma.hatcheryChickTxn.upsert({
      where: { id: `seed-chick-txn-prod-${grade}` },
      create: {
        id: `seed-chick-txn-prod-${grade}`,
        incubationBatchId: seedIncubation.id,
        grade,
        type: HatcheryChickTxnType.PRODUCTION,
        count: total,
        date: new Date("2026-03-31"),
        sourceId: seedHatchResult.id,
        note: "Seed hatch production",
      },
      update: {},
    });

    // Inventory lot for sellable chicks
    const supplierKey = `INCUBATION_BATCH:${seedIncubation.id}:${grade}`;
    const lotName = `Hatched Chicks Grade ${grade} (IN-001)`;

    const existingLot = await prisma.hatcheryInventoryItem.findFirst({
      where: { hatcheryOwnerId: hatcheryUser1.id, supplierKey },
    });

    if (!existingLot) {
      await prisma.hatcheryInventoryItem.create({
        data: {
          hatcheryOwnerId: hatcheryUser1.id,
          itemType: HatcheryInventoryItemType.CHICKS,
          name: lotName,
          unit: "chicks",
          unitPrice: 0,
          supplierKey,
          currentStock: total,
        },
      });
    }
  }

  // Seed one chick sale (Grade A, 20 chicks)
  const gradeALot = await prisma.hatcheryInventoryItem.findFirst({
    where: {
      hatcheryOwnerId: hatcheryUser1.id,
      supplierKey: `INCUBATION_BATCH:${seedIncubation.id}:A`,
    },
  });

  if (gradeALot) {
    const existingSale = await prisma.hatcheryChickSale.findFirst({
      where: { id: "seed-chick-sale-1" },
    });
    if (!existingSale) {
      await prisma.hatcheryChickSale.create({
        data: {
          id: "seed-chick-sale-1",
          incubationBatchId: seedIncubation.id,
          grade: HatcheryChickGrade.A,
          date: new Date("2026-04-01"),
          count: 20,
          unitPrice: 55,
          amount: 1100,
          customerName: "Ram Poultry Farm",
          note: "First chick sale",
          inventoryItemId: gradeALot.id,
        },
      });

      // Adjust chick stock
      await prisma.hatcheryChickStock.update({
        where: { incubationBatchId_grade: { incubationBatchId: seedIncubation.id, grade: HatcheryChickGrade.A } },
        data: { currentStock: { decrement: 20 } },
      });

      // Adjust inventory lot
      await prisma.hatcheryInventoryItem.update({
        where: { id: gradeALot.id },
        data: { currentStock: { decrement: 20 } },
      });

      // Chick txn for sale
      await prisma.hatcheryChickTxn.create({
        data: {
          incubationBatchId: seedIncubation.id,
          grade: HatcheryChickGrade.A,
          type: HatcheryChickTxnType.SALE,
          count: -20,
          date: new Date("2026-04-01"),
          sourceId: "seed-chick-sale-1",
          note: "Seed chick sale",
        },
      });
    }
  }

  // ==================== SUMMARY ====================
  console.log("\n✅ Database seeded successfully!");
  console.log("\n📋 Credentials (all use password: password123):");
  console.log(`  Admin:    ${superAdmin.phone}`);
  console.log(`  Company:  ${companyOwner1.phone} (${companyOwner1.name})`);
  console.log(`  Company:  ${companyOwner2.phone} (${companyOwner2.name})`);
  console.log(`  Dealer:   ${dealerUser1.phone} (${dealerUser1.name})`);
  console.log(`  Dealer:   ${dealerUser2.phone} (${dealerUser2.name})`);
  console.log(`  Dealer:   ${dealerUser3.phone} (${dealerUser3.name}) [PENDING]`);
  console.log(`  Farmer:   ${farmer1.phone} (${farmer1.name})`);
  console.log(`  Farmer:   ${farmer2.phone} (${farmer2.name})`);
  console.log(`  Farmer:   ${farmer3.phone} (${farmer3.name})`);
  console.log(`  Farmer:   ${farmer4.phone} (${farmer4.name}) [INACTIVE]`);
  console.log(`  Manager:  ${manager1.phone} (${manager1.name})`);
  console.log(`  Doctor:   ${doctor1.phone} (${doctor1.name})`);
  console.log(`  Doctor:   ${doctor2.phone} (${doctor2.name})`);
  console.log("\n🔗 Connections:");
  console.log("  Dealer 'Thapa Feed House' -> Company 1 & 2, Farmer 1 & 2");
  console.log("  Dealer 'Gurung Agro' -> Company 1, Farmer 1 & 3");
  console.log("  Dealer 'Rai Traders' -> Farmer 3");
  console.log("  Manager 'Bikash KC' -> Farm 'Tamang Broiler Farm'");
  console.log("  Dr. Anita -> conversations with Farmer 1 & 2");
  console.log("  Dr. Sunil -> conversation with Farmer 3");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
