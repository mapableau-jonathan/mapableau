/**
 * Environment variable validation
 * Validates all required environment variables at startup
 */

import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // NextAuth
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  // OAuth (optional but validated if provided)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
  AZURE_AD_CLIENT_ID: z.string().optional(),
  AZURE_AD_CLIENT_SECRET: z.string().optional(),
  AZURE_AD_TENANT_ID: z.string().optional(),

  // Blockchain (optional)
  BLOCKCHAIN_PROVIDER: z.enum(["ethereum", "hyperledger", "polygon", "mock"]).optional(),
  BLOCKCHAIN_NETWORK_URL: z.string().url().optional(),
  BLOCKCHAIN_PRIVATE_KEY: z.string().optional(),
  BLOCKCHAIN_CONTRACT_ADDRESS: z.string().optional(),

  // Coinbase (optional)
  COINBASE_API_KEY: z.string().optional(),
  COINBASE_API_SECRET: z.string().optional(),
  COINBASE_API_URL: z.string().url().optional(),
  COINBASE_WEBHOOK_SECRET: z.string().optional(),

  // Node Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  VERCEL_ENV: z.string().optional(),

  // Feature Flags (optional)
  ENABLE_WWCC: z.string().optional(),
  ENABLE_NDIS: z.string().optional(),
  ENABLE_FIRST_AID: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

/**
 * Validate and return environment variables
 * Throws error if validation fails
 */
export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
      throw new Error(
        `Environment variable validation failed:\n${missingVars.join("\n")}`
      );
    }
    throw error;
  }
}

/**
 * Get validated environment variable
 */
export function getEnv(): Env {
  return validateEnv();
}

/**
 * Initialize environment validation
 * Call this at application startup
 */
export function initEnv(): void {
  try {
    validateEnv();
    console.log("✅ Environment variables validated successfully");
  } catch (error) {
    console.error("❌ Environment variable validation failed:", error);
    if (process.env.NODE_ENV === "production") {
      process.exit(1); // Fail fast in production
    }
  }
}
