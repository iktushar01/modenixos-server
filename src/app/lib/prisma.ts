import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./prisma-exports";
import { envVars } from "../../config/env";

const connectionString = `${envVars.DATABASE_URL}`;

const createPrismaClient = () => {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
};

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: ReturnType<typeof createPrismaClient>;
};

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (envVars.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma };
