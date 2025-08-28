import { PrismaClient } from "@/generated/prisma"; // seu output do generator
declare global {
  // Evita instanciar várias vezes em dev (hot reload)
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    // opcional: log: ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
