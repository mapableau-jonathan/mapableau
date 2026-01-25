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
  WIX_CLIENT_ID: z.string().optional(),
  WIX_CLIENT_SECRET: z.string().optional(),
  WIX_APP_ID: z.string().optional(),
  
  // Replit OAuth
  REPLIT_CLIENT_ID: z.string().optional(),
  REPLIT_CLIENT_SECRET: z.string().optional(),
  
  // MediaWiki OAuth
  MEDIAWIKI_API_URL: z.string().url().optional(),
  MEDIAWIKI_CONSUMER_KEY: z.string().optional(),
  MEDIAWIKI_CONSUMER_SECRET: z.string().optional(),
  
  // Identity Provider Domain (ad.org.au or ad.id)
  AD_ID_DOMAIN: z.string().url().optional(),
  
  // Service Callback URLs (Australian domains)
  MAPABLE_CALLBACK_URL: z.string().url().optional(), // Default: https://mapable.com.au/auth/callback
  ACCESSIBOOKS_CALLBACK_URL: z.string().url().optional(), // Default: https://accessibooks.com.au/auth/callback
  DISAPEDIA_CALLBACK_URL: z.string().url().optional(), // Default: https://disapedia.au/auth/callback
  MEDIAWIKI_CALLBACK_URL: z.string().url().optional(),
  CURSOR_REPLIT_CALLBACK_URL: z.string().url().optional(),
  
  // Data Encryption
  DATA_ENCRYPTION_KEY: z.string().optional(),

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

  // JWT Configuration (optional, defaults to NEXTAUTH_SECRET)
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_ISSUER: z.string().optional(),
  JWT_AUDIENCE: z.string().optional(),
  JWT_EXPIRES_IN: z.string().optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().optional(),

  // OAuth2 SSO Configuration (optional)
  OAUTH2_CLIENT_ID: z.string().optional(),
  OAUTH2_CLIENT_SECRET: z.string().optional(),
  OAUTH2_AUTHORIZATION_URL: z.string().url().optional(),
  OAUTH2_TOKEN_URL: z.string().url().optional(),
  OAUTH2_CALLBACK_URL: z.string().url().optional(),
  OAUTH2_SCOPE: z.string().optional(),

  // SAML SSO Configuration (optional)
  SAML_ENTRY_POINT: z.string().url().optional(),
  SAML_ISSUER: z.string().optional(),
  SAML_CALLBACK_URL: z.string().url().optional(),
  SAML_CERT: z.string().optional(),
  SAML_IDENTIFIER_FORMAT: z.string().optional(),
  SAML_SIGNATURE_ALGORITHM: z.string().optional(),
  SAML_WANT_ASSERTIONS_SIGNED: z.string().optional(),
  SAML_WANT_MESSAGE_SIGNED: z.string().optional(),

  // OAuth2 User Info (optional)
  OAUTH2_USERINFO_URL: z.string().url().optional(),

  // Notion Integration (optional)
  NOTION_API_KEY: z.string().optional(),
  NOTION_WEBHOOK_SECRET: z.string().optional(),
  NOTION_SYNC_ENABLED: z.string().optional(),
  NOTION_CONFLICT_STRATEGY: z.enum(["last-write-wins", "timestamp-based", "manual-review"]).optional(),
  NOTION_PARTICIPANTS_DB_ID: z.string().optional(),
  NOTION_NDIS_PLANS_DB_ID: z.string().optional(),
  NOTION_CARE_PLANS_DB_ID: z.string().optional(),
  NOTION_INCIDENTS_DB_ID: z.string().optional(),
  NOTION_COMPLAINTS_DB_ID: z.string().optional(),
  NOTION_RISKS_DB_ID: z.string().optional(),
  NOTION_PAYMENTS_DB_ID: z.string().optional(),
  NOTION_SYNC_PARTICIPANTS: z.string().optional(),
  NOTION_SYNC_NDIS_PLANS: z.string().optional(),
  NOTION_SYNC_CARE_PLANS: z.string().optional(),
  NOTION_SYNC_INCIDENTS: z.string().optional(),
  NOTION_SYNC_COMPLAINTS: z.string().optional(),
  NOTION_SYNC_RISKS: z.string().optional(),
  NOTION_SYNC_PAYMENTS: z.string().optional(),

  // Salesforce Integration (optional)
  SALESFORCE_CLIENT_ID: z.string().optional(),
  SALESFORCE_CLIENT_SECRET: z.string().optional(),
  SALESFORCE_USERNAME: z.string().optional(),
  SALESFORCE_PASSWORD: z.string().optional(),
  SALESFORCE_SECURITY_TOKEN: z.string().optional(),
  SALESFORCE_LOGIN_URL: z.string().url().optional(), // Default: https://login.salesforce.com
  SALESFORCE_INSTANCE_URL: z.string().url().optional(), // Will be set after OAuth
  SALESFORCE_API_VERSION: z.string().optional(), // Default: v59.0
  SALESFORCE_CALLBACK_URL: z.string().url().optional(),
  SALESFORCE_SYNC_ENABLED: z.string().optional(),
  SALESFORCE_SYNC_PARTICIPANTS: z.string().optional(),
  SALESFORCE_SYNC_NDIS_PLANS: z.string().optional(),
  SALESFORCE_SYNC_CARE_PLANS: z.string().optional(),
  SALESFORCE_SYNC_INCIDENTS: z.string().optional(),
  SALESFORCE_SYNC_COMPLAINTS: z.string().optional(),
  SALESFORCE_SYNC_RISKS: z.string().optional(),
  SALESFORCE_SYNC_PAYMENTS: z.string().optional(),

  // Payment Providers
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_ENABLE_LINK: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_ENVIRONMENT: z.enum(["sandbox", "production"]).optional(),

  // Calendar Integration
  GOOGLE_CALENDAR_CLIENT_ID: z.string().optional(),
  GOOGLE_CALENDAR_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALENDAR_API_KEY: z.string().optional(),
  GOOGLE_CALENDAR_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  OUTLOOK_CALENDAR_CLIENT_ID: z.string().optional(),
  OUTLOOK_CALENDAR_CLIENT_SECRET: z.string().optional(),
  OUTLOOK_CALENDAR_TENANT_ID: z.string().optional(),
  OUTLOOK_CALENDAR_REDIRECT_URI: z.string().url().optional(),

  // AI Assistant Integration (Motion, Reclaim, etc.)
  MOTION_API_KEY: z.string().optional(),
  MOTION_API_URL: z.string().url().optional(),
  MOTION_ENABLED: z.string().optional(),

  // Usage Tracking & Billing
  USAGE_TRACKING_ENABLED: z.string().optional(),
  API_CALL_COST: z.string().optional(),
  HOURLY_RATE_SERVICE_CARE: z.string().optional(),
  HOURLY_RATE_SERVICE_TRANSPORT: z.string().optional(),
  STORAGE_COST_PER_GB: z.string().optional(),
  BILLING_PERIOD_DAYS: z.string().optional(),
  AUTO_GENERATE_INVOICES: z.string().optional(),
  AUTO_CHARGE_INVOICES: z.string().optional(),
  INVOICE_DUE_DAYS: z.string().optional(),
  TAX_RATE: z.string().optional(),

  // Twilio Email (SendGrid)
  TWILIO_SENDGRID_API_KEY: z.string().optional(),
  TWILIO_SENDGRID_FROM_EMAIL: z.string().optional(),
  TWILIO_SENDGRID_FROM_NAME: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(), // Alias for TWILIO_SENDGRID_API_KEY
  FROM_EMAIL: z.string().optional(), // Alias for TWILIO_SENDGRID_FROM_EMAIL
  FROM_NAME: z.string().optional(), // Alias for TWILIO_SENDGRID_FROM_NAME

  // NDIS myplace Integration (optional)
  NDIS_MYPLACE_API_URL: z.string().url().optional(), // Default: https://myplace.ndis.gov.au
  NDIS_MYPLACE_CLIENT_ID: z.string().optional(),
  NDIS_MYPLACE_CLIENT_SECRET: z.string().optional(),
  NDIS_MYPLACE_AUTH_URL: z.string().url().optional(),
  NDIS_MYPLACE_TOKEN_URL: z.string().url().optional(),
  NDIS_MYPLACE_CALLBACK_URL: z.string().url().optional(),
  NDIS_MYPLACE_SCOPE: z.string().optional(), // Default: openid profile ndis.read ndis.write
  NDIS_MYPLACE_ENABLED: z.string().optional(),
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
  // Skip validation if SKIP_ENV_VALIDATION is set (useful for development)
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    console.log("⚠️  Environment validation skipped (SKIP_ENV_VALIDATION=true)");
    return;
  }

  try {
    validateEnv();
    console.log("✅ Environment variables validated successfully");
  } catch (error) {
    console.error("❌ Environment variable validation failed:", error);
    if (process.env.NODE_ENV === "production") {
      process.exit(1); // Fail fast in production
    } else {
      // In development, warn but don't exit
      console.warn("⚠️  Continuing with missing environment variables (development mode)");
    }
  }
}
