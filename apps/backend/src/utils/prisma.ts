import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({
  transactionOptions: {
    timeout: 10000, // 10 seconds instead of default 5 seconds
  },
});

if (process.env.NODE_ENV === "development") {
  global.prisma = prisma;
}

export default prisma;
