import { Prisma, PrismaClient } from "@prisma/client";

const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);

function isTransientConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_CODES.has(error.code);
  }
  if (error instanceof Error) {
    const msg = error.message || "";
    return (
      msg.includes("Can't reach database server") ||
      msg.includes("Server has closed the connection") ||
      msg.includes("Connection terminated unexpectedly") ||
      msg.includes("Timed out fetching a new connection")
    );
  }
  return false;
}

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // Retry transient connection errors (e.g. when Neon wakes from sleep)
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          let lastError: unknown;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              return await query(args);
            } catch (error) {
              lastError = error;
              if (!isTransientConnectionError(error) || attempt === 3) {
                throw error;
              }
              await new Promise((resolve) => setTimeout(resolve, attempt * 600));
            }
          }
          throw lastError;
        },
      },
    },
  }) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
