import { PrismaClient, UserRole, UserStatus, Language, CalendarType } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  console.log("Creating SUPER_ADMIN...");
  const superAdmin = await prisma.user.upsert({
    where: { phone: "+9779800000001" },
    create: {
      phone: "+9779800000001",
      name: "System Administrator",
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      language: Language.ENGLISH,
      calendarType: CalendarType.AD,
    },
    update: {},
  });

  console.log("✅ Database seeded successfully!");
  console.log(`\n📋 Admin: ${superAdmin.phone} (password: password123)`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
