import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

// Explicitly enable fetch-based queries to work in edge environments (Cloudflare Workers, Vercel Edge, etc.)
neonConfig.poolQueryViaFetch = true;

// Configure connection string with parameters
const getConnectionUrl = () => {
  // todo: compare against nick repo -- do i need to add
  const baseUrl =
    process.env.DATABASE_URL || process.env.DATABASE_PRISMA_URL || "";
  // todo: check if these are correct
  const params =
    process.env.VERCEL_ENV === "production"
      ? "?idle_timeout=10&application_name=mapableau" // "&connection_limit=5&pool_timeout=20&idle_timeout=30&application_name=handy-ute"
      : "?idle_timeout=30&application_name=mapableau-dev";

  // Ensure we don't duplicate the ? if it already exists in the URL
  return baseUrl + (baseUrl.includes("?") ? "&" + params.substring(1) : params);
};

// Create Prisma singleton with the adapter
const prismaClientSingleton = () => {
  // Create adapter with connection string
  const neonAdapter = new PrismaNeon({ connectionString: getConnectionUrl() });

  return new PrismaClient({
    adapter: neonAdapter,
    log: ["error", "warn"],
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
