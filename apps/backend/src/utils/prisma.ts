import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// Enhanced Prisma client configuration for Neon and connection resilience
const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  transactionOptions: {
    timeout: 10000, // 10 seconds instead of default 5 seconds
  },
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Handle connection errors gracefully
prisma.$on("error" as never, (e: any) => {
  console.error("Prisma Client Error:", e);
});

// Connection health check helper
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}

if (process.env.NODE_ENV === "development") {
  global.prisma = prisma;
}

export default prisma;
