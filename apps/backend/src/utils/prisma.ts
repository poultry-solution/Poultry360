import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaDatabaseUrl = (() => {
  const databaseUrl = process.env.DATABASE_URL;
  if (process.env.NODE_ENV !== "test" || !databaseUrl) return databaseUrl;

  // Jest creates one module environment per test file. A default Prisma pool in
  // every environment exhausts local PostgreSQL during a full serial run. Test
  // requests are serial, so one connection per client is enough and does not
  // interrupt fire-and-forget audit writes between assertions.
  const url = new URL(databaseUrl);
  url.searchParams.set("connection_limit", "1");
  url.searchParams.set("pool_timeout", "10");
  return url.toString();
})();

// Enhanced Prisma client configuration for Neon and connection resilience
const prisma: PrismaClient = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  omit: {
    sale: {
      invoiceKey: true,
    },
  },
  transactionOptions: {
    timeout: 10000, // 10 seconds instead of default 5 seconds
  },
  datasources: {
    db: {
      url: prismaDatabaseUrl,
    },
  },
}) as PrismaClient;

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
