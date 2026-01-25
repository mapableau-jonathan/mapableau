/**
 * NDIS myplace Configuration
 * Configuration for NDIS myplace participant portal integration
 */

import { getEnv } from "./env";

export interface NDISMyplaceConfig {
  apiUrl: string;
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope: string;
  enabled: boolean;
}

/**
 * Get NDIS myplace configuration from environment variables
 */
export function getNDISMyplaceConfig(): NDISMyplaceConfig {
  const env = getEnv();

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.AD_ID_DOMAIN ||
    "http://localhost:3000";

  return {
    apiUrl: env.NDIS_MYPLACE_API_URL || "https://myplace.ndis.gov.au",
    authUrl:
      env.NDIS_MYPLACE_AUTH_URL ||
      env.NDIS_MYPLACE_API_URL + "/oauth/authorize" ||
      "https://myplace.ndis.gov.au/oauth/authorize",
    tokenUrl:
      env.NDIS_MYPLACE_TOKEN_URL ||
      env.NDIS_MYPLACE_API_URL + "/oauth/token" ||
      "https://myplace.ndis.gov.au/oauth/token",
    clientId: env.NDIS_MYPLACE_CLIENT_ID || "",
    clientSecret: env.NDIS_MYPLACE_CLIENT_SECRET || "",
    callbackUrl:
      env.NDIS_MYPLACE_CALLBACK_URL ||
      `${baseUrl}/api/ndis/myplace/oauth/callback`,
    scope:
      env.NDIS_MYPLACE_SCOPE || "openid profile ndis.read ndis.write",
    enabled:
      env.NDIS_MYPLACE_ENABLED === "true" ||
      env.NDIS_MYPLACE_ENABLED === "1",
  };
}

/**
 * Validate NDIS myplace configuration
 */
export function validateNDISMyplaceConfig(config: NDISMyplaceConfig): void {
  if (!config.enabled) {
    return; // Skip validation if disabled
  }

  if (!config.clientId || !config.clientSecret) {
    throw new Error(
      "NDIS_MYPLACE_CLIENT_ID and NDIS_MYPLACE_CLIENT_SECRET are required for NDIS myplace integration"
    );
  }
}
