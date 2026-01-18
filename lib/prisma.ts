import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

// Explicitly enable fetch-based queries to work in edge environments
// (Cloudflare Workers, Vercel Edge, etc.)
neonConfig.poolQueryViaFetch = true;

/**
 * Get the database connection URL with appropriate parameters
 * Optimized for different environments (development, production)
 */
const getConnectionUrl = (): string => {
  const baseUrl =
    process.env.DATABASE_URL || process.env.DATABASE_PRISMA_URL || "";

  if (!baseUrl) {
    throw new Error(
      "DATABASE_URL or DATABASE_PRISMA_URL environment variable is required"
    );
  }

  // Configure connection parameters based on environment
  const params =
    process.env.VERCEL_ENV === "production"
      ? "?idle_timeout=10&application_name=mapableau"
      : "?idle_timeout=30&application_name=mapableau-dev";

  // Ensure we don't duplicate query parameters if they already exist
  return baseUrl + (baseUrl.includes("?") ? "&" + params.substring(1) : params);
};

/**
 * Create Prisma client singleton with Neon adapter
 * Prevents multiple instances in development (hot reload)
 */
const prismaClientSingleton = (): PrismaClient => {
  const connectionString = getConnectionUrl();
  const neonAdapter = new PrismaNeon({ connectionString });

  return new PrismaClient({
    adapter: neonAdapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
  });
};

// Type declaration for global Prisma instance (development only)
declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

/**
 * Prisma client instance
 * Uses singleton pattern to prevent multiple instances in development
 */
export const prisma =
  globalThis.prismaGlobal ?? prismaClientSingleton();

// Store in global scope in development to prevent multiple instances during hot reload
if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
