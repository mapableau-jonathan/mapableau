/**
 * NDIA API Configuration
 * Configuration for NDIA (National Disability Insurance Agency) API integration
 */

export interface NDIAConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  tokenEndpoint: string;
  planEndpoint: string;
  providerEndpoint: string;
  priceGuideEndpoint: string;
}

export function getNDIAConfig(): NDIAConfig {
  return {
    apiUrl: process.env.NDIA_API_URL || "https://api.ndia.gov.au",
    clientId: process.env.NDIA_CLIENT_ID || "",
    clientSecret: process.env.NDIA_CLIENT_SECRET || "",
    scope: process.env.NDIA_SCOPE || "openid profile ndis.read",
    tokenEndpoint: "/oauth/token",
    planEndpoint: "/api/v1/plans",
    providerEndpoint: "/api/v1/providers",
    priceGuideEndpoint: "/api/v1/price-guide",
  };
}
