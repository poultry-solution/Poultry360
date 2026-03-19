import { PrismaClient, UserRole, UserStatus, Language, CalendarType } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  const hashedPassword = await bcrypt.hash("password123", 10);

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
