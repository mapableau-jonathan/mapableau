/**
 * Salesforce Configuration
 * Manages Salesforce API credentials and OAuth settings for CRM integration
 */

import { getEnv } from "./env";

export interface SalesforceConfig {
  clientId: string;
  clientSecret: string;
  username?: string;
  password?: string;
  securityToken?: string;
  loginUrl: string;
  instanceUrl?: string; // Set after OAuth authentication
  apiVersion: string;
  callbackUrl: string;
  enabled: boolean;
  syncSettings: {
    syncParticipants: boolean;
    syncNDISPlans: boolean;
    syncCarePlans: boolean;
    syncIncidents: boolean;
    syncComplaints: boolean;
    syncRisks: boolean;
    syncPayments: boolean;
  };
}

/**
 * Get Salesforce configuration from environment variables
 */
export function getSalesforceConfig(): SalesforceConfig {
  const env = getEnv();

  const clientId = env.SALESFORCE_CLIENT_ID;
  const clientSecret = env.SALESFORCE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET are required for Salesforce integration"
    );
  }

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.AD_ID_DOMAIN ||
    "http://localhost:3000";

  return {
    clientId,
    clientSecret,
    username: env.SALESFORCE_USERNAME,
    password: env.SALESFORCE_PASSWORD,
    securityToken: env.SALESFORCE_SECURITY_TOKEN,
    loginUrl: env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com",
    instanceUrl: env.SALESFORCE_INSTANCE_URL,
    apiVersion: env.SALESFORCE_API_VERSION || "v59.0",
    callbackUrl:
      env.SALESFORCE_CALLBACK_URL ||
      `${baseUrl}/api/salesforce/oauth/callback`,
    enabled:
      env.SALESFORCE_SYNC_ENABLED === "true" ||
      env.SALESFORCE_SYNC_ENABLED === "1",
    syncSettings: {
      syncParticipants: env.SALESFORCE_SYNC_PARTICIPANTS !== "false",
      syncNDISPlans: env.SALESFORCE_SYNC_NDIS_PLANS !== "false",
      syncCarePlans: env.SALESFORCE_SYNC_CARE_PLANS !== "false",
      syncIncidents: env.SALESFORCE_SYNC_INCIDENTS !== "false",
      syncComplaints: env.SALESFORCE_SYNC_COMPLAINTS !== "false",
      syncRisks: env.SALESFORCE_SYNC_RISKS !== "false",
      syncPayments: env.SALESFORCE_SYNC_PAYMENTS !== "false",
    },
  };
}

/**
 * Validate Salesforce configuration
 */
export function validateSalesforceConfig(config: SalesforceConfig): void {
  if (!config.enabled) {
    return; // Skip validation if sync is disabled
  }

  if (!config.clientId || !config.clientSecret) {
    throw new Error(
      "SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET are required"
    );
  }

  // If using username/password authentication, validate required fields
  if (config.username && (!config.password || !config.securityToken)) {
    throw new Error(
      "SALESFORCE_PASSWORD and SALESFORCE_SECURITY_TOKEN are required when using username authentication"
    );
  }
}
