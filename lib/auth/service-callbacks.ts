/**
 * Service-Specific Callback URL Management
 * Handles callbacks for different Australian Disability Ltd services
 */

import { getEnv } from "@/lib/config/env";

export type ServiceName =
  | "mapable"
  | "accessibooks"
  | "disapedia"
  | "mediawiki"
  | "cursor-replit";

export interface ServiceCallbackConfig {
  serviceName: ServiceName;
  callbackUrl: string;
  defaultUrl: string;
}

/**
 * Get callback URL for a specific service
 */
export function getServiceCallbackUrl(
  serviceName: ServiceName,
  provider: string = "default"
): string {
  const env = getEnv();
  const baseUrl = env.AD_ID_DOMAIN || process.env.NEXTAUTH_URL || "";

  // Service-specific callback URLs
  const serviceCallbacks: Record<ServiceName, string | undefined> = {
    mapable: env.MAPABLE_CALLBACK_URL,
    accessibooks: env.ACCESSIBOOKS_CALLBACK_URL,
    disapedia: env.DISAPEDIA_CALLBACK_URL,
    mediawiki: env.MEDIAWIKI_CALLBACK_URL,
    "cursor-replit": env.CURSOR_REPLIT_CALLBACK_URL,
  };

  // Default callback URLs if not specified
  const defaultCallbacks: Record<ServiceName, string> = {
    mapable: "https://mapable.com.au/auth/callback",
    accessibooks: "https://accessibooks.com.au/auth/callback",
    disapedia: "https://disapedia.au/auth/callback",
    mediawiki: `${baseUrl}/api/auth/callback/mediawiki`,
    "cursor-replit": `${baseUrl}/api/auth/callback/cursor-replit`,
  };

  const callbackUrl = serviceCallbacks[serviceName] || defaultCallbacks[serviceName];

  // Append provider if specified
  if (provider !== "default") {
    return `${callbackUrl}?provider=${provider}`;
  }

  return callbackUrl;
}

/**
 * Get identity provider callback URL based on service
 */
export function getIdentityProviderCallbackUrl(
  provider: "google" | "facebook" | "microsoft" | "oauth2" | "saml",
  serviceName?: ServiceName
): string {
  const env = getEnv();
  const baseUrl = env.AD_ID_DOMAIN || process.env.NEXTAUTH_URL || "";

  const providerCallbacks: Record<string, string> = {
    google: `${baseUrl}/api/auth/identity-provider/google/callback`,
    facebook: `${baseUrl}/api/auth/identity-provider/facebook/callback`,
    microsoft: `${baseUrl}/api/auth/identity-provider/microsoft/callback`,
    oauth2: `${baseUrl}/api/auth/sso/oauth2/callback`,
    saml: `${baseUrl}/api/auth/sso/saml/callback`,
  };

  const callbackUrl = providerCallbacks[provider] || providerCallbacks.oauth2;

  // If service is specified, redirect to service callback after authentication
  if (serviceName) {
    const serviceCallback = getServiceCallbackUrl(serviceName, provider);
    return `${callbackUrl}?service=${serviceName}&serviceCallback=${encodeURIComponent(serviceCallback)}`;
  }

  return callbackUrl;
}

/**
 * Parse service callback from request
 */
export function parseServiceCallback(request: {
  nextUrl: { searchParams: URLSearchParams };
}): { serviceName?: ServiceName; serviceCallback?: string } {
  const serviceName = request.nextUrl.searchParams.get("service") as ServiceName | null;
  const serviceCallback = request.nextUrl.searchParams.get("serviceCallback");

  return {
    serviceName: serviceName || undefined,
    serviceCallback: serviceCallback || undefined,
  };
}
