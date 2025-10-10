import prisma from "../utils/prisma";


const standardVaccinationSchedule = [
  {
    vaccineName: "IB (Infectious Bronchitis)",
    dayFrom: 1,
    dayTo: 1,
    isOptional: false,
    description: "First day vaccination for infectious bronchitis protection",
  },
  {
    vaccineName: "F1/B1 (Ranikhet)",
    dayFrom: 5,
    dayTo: 7,
    isOptional: false,
    description: "Ranikhet vaccination - can be given between day 5-7",
  },
  {
    vaccineName: "IBD Intermediate",
    dayFrom: 10,
    dayTo: 12,
    isOptional: false,
    description: "Infectious Bursal Disease intermediate vaccination",
  },
  {
    vaccineName: "IBH/HPS",
    dayFrom: 12,
    dayTo: 14,
    isOptional: true,
    description:
      "Infectious Bronchitis Hepatitis/Hydropericardium Syndrome - Optional during risk of outbreak",
  },
  {
    vaccineName: "IBD Intermediate Plus",
    dayFrom: 18,
    dayTo: 21,
    isOptional: false,
    description: "Infectious Bursal Disease intermediate plus vaccination",
  },
  {
    vaccineName: "Lasota/Ranikhet",
    dayFrom: 25,
    dayTo: 27,
    isOptional: false,
    description: "Lasota or Ranikhet booster vaccination",
  },
];

async function seedStandardVaccinationSchedule() {
  console.log("🌱 Seeding standard vaccination schedule...");

  try {
    // Clear existing standard vaccination schedules
    await prisma.standardVaccinationSchedule.deleteMany({});
    console.log("✅ Cleared existing standard vaccination schedules");

    // Insert new standard vaccination schedules
    for (const schedule of standardVaccinationSchedule) {
      await prisma.standardVaccinationSchedule.create({
        data: schedule,
      });
      console.log(
        `✅ Created: ${schedule.vaccineName} (Day ${schedule.dayFrom}-${schedule.dayTo})`
      );
    }

    console.log("🎉 Standard vaccination schedule seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding standard vaccination schedule:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function if this file is executed directly
seedStandardVaccinationSchedule()
  .then(() => {
    console.log("✅ Seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
