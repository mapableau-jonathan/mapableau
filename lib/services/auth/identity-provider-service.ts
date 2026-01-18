/**
 * Identity Provider Service
 * Unified service for managing all OAuth identity providers
 */

import { ServiceId, serviceRegistry } from "./service-registry";
import { normalizeProfile, NormalizedProfile } from "./profile-normalizer";
import { linkAccount, AccountLinkResult } from "./account-linker";
import { issueToken, TokenIssuanceResult } from "./token-issuance-service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export type IdentityProvider = "google" | "facebook" | "microsoft" | "wix";

export interface AuthInitiationResult {
  success: boolean;
  authUrl?: string;
  state?: string;
  error?: string;
}

export interface AuthCallbackResult {
  success: boolean;
  userId?: string;
  tokens?: TokenIssuanceResult;
  callbackUrl?: string;
  error?: string;
}

/**
 * Generate secure state token (optimized: cache base URL)
 */
let cachedBaseUrl: string | null = null;
function getBaseUrl(): string {
  if (!cachedBaseUrl) {
    cachedBaseUrl = process.env.AD_ID_DOMAIN || process.env.NEXTAUTH_URL || "";
  }
  return cachedBaseUrl;
}

/**
 * Generate secure state token
 */
function generateStateToken(serviceId: ServiceId, callbackUrl: string, nonce: string): string {
  // Optimize: use object literal directly instead of intermediate variable
  return Buffer.from(
    JSON.stringify({ serviceId, callbackUrl, nonce, timestamp: Date.now() })
  ).toString("base64url");
}

/**
 * Parse state token (optimized: early return on parse failure)
 */
function parseStateToken(state: string): {
  serviceId?: ServiceId;
  callbackUrl?: string;
  nonce?: string;
  timestamp?: number;
} | null {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return null;
  }
}

/**
 * Initiate OAuth flow for identity provider
 */
export async function initiateAuth(
  provider: IdentityProvider,
  serviceId: ServiceId,
  callbackUrl?: string
): Promise<AuthInitiationResult> {
  try {
    // Validate service (early return for invalid service)
    const service = serviceRegistry.get(serviceId);
    if (!service || !service.enabled) {
      return {
        success: false,
        error: "Service not found or disabled",
      };
    }

    // Use service callback URL if not provided
    const finalCallbackUrl = callbackUrl || service.callbackUrl;

    // Validate callback URL (early return for invalid URL)
    if (!serviceRegistry.validateCallbackUrl(serviceId, finalCallbackUrl)) {
      return {
        success: false,
        error: "Invalid callback URL",
      };
    }

    // Generate secure state token
    const nonce = crypto.randomBytes(16).toString("hex");
    const state = generateStateToken(serviceId, finalCallbackUrl, nonce);

    // Get provider-specific auth URL
    const authUrl = getProviderAuthUrl(provider, state);

    if (!authUrl) {
      return {
        success: false,
        error: `Provider ${provider} not configured`,
      };
    }

    return {
      success: true,
      authUrl,
      state,
    };
  } catch (error) {
    logger.error("Auth initiation error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Auth initiation failed",
    };
  }
}

/**
 * Get provider-specific authentication URL (optimized: use cached base URL)
 */
function getProviderAuthUrl(provider: IdentityProvider, state: string): string | null {
  const env = process.env;
  const baseUrl = getBaseUrl();

  switch (provider) {
    case "google":
      if (!env.GOOGLE_CLIENT_ID) return null;
      const googleParams = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: `${baseUrl}/api/auth/identity-provider/google/callback`,
        response_type: "code",
        scope: "openid profile email",
        state,
        access_type: "offline",
        prompt: "consent",
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${googleParams.toString()}`;

    case "facebook":
      if (!env.FACEBOOK_CLIENT_ID) return null;
      const facebookParams = new URLSearchParams({
        client_id: env.FACEBOOK_CLIENT_ID,
        redirect_uri: `${baseUrl}/api/auth/identity-provider/facebook/callback`,
        response_type: "code",
        scope: "email,public_profile",
        state,
      });
      return `https://www.facebook.com/v18.0/dialog/oauth?${facebookParams.toString()}`;

    case "microsoft":
      if (!env.AZURE_AD_CLIENT_ID || !env.AZURE_AD_TENANT_ID) return null;
      const tenantId = env.AZURE_AD_TENANT_ID;
      const microsoftParams = new URLSearchParams({
        client_id: env.AZURE_AD_CLIENT_ID,
        redirect_uri: `${baseUrl}/api/auth/identity-provider/microsoft/callback`,
        response_type: "code",
        scope: "openid profile email",
        state,
      });
      return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${microsoftParams.toString()}`;

    case "wix":
      if (!env.WIX_CLIENT_ID || !env.WIX_APP_ID) return null;
      const wixParams = new URLSearchParams({
        client_id: env.WIX_CLIENT_ID,
        redirect_uri: `${baseUrl}/api/auth/identity-provider/wix/callback`,
        response_type: "code",
        scope: "openid profile email",
        state,
      });
      return `https://www.wix.com/oauth/authorize?${wixParams.toString()}`;

    default:
      return null;
  }
}

/**
 * Handle OAuth callback
 */
export async function handleCallback(
  provider: IdentityProvider,
  code: string,
  state: string
): Promise<AuthCallbackResult> {
  try {
    // Parse state token
    const stateData = parseStateToken(state);
    if (!stateData || !stateData.serviceId) {
      return {
        success: false,
        error: "Invalid state token",
      };
    }

    const serviceId = stateData.serviceId as ServiceId;
    const callbackUrl = stateData.callbackUrl;

    // Exchange code for tokens and get profile
    const profileResult = await exchangeCodeForProfile(provider, code);
    if (!profileResult.success || !profileResult.profile) {
      return {
        success: false,
        error: profileResult.error || "Failed to get user profile",
      };
    }

    // Normalize profile
    const normalizedProfile = normalizeProfile(provider, profileResult.profile);
    normalizedProfile.rawProfile.accessToken = profileResult.accessToken;
    normalizedProfile.rawProfile.refreshToken = profileResult.refreshToken;

    // Link account
    const service = serviceRegistry.get(serviceId);
    const linkResult = await linkAccount(
      normalizedProfile,
      service?.requiresEmailVerification || false
    );

    if (!linkResult.success) {
      return {
        success: false,
        error: linkResult.error || "Account linking failed",
      };
    }

    // Create service link if doesn't exist (optimized: run in parallel with token issuance prep)
    const serviceLinkPromise = ensureServiceLink(linkResult.userId, serviceId);

    // Issue service token (run in parallel with service link creation)
    const [tokenResult] = await Promise.all([
      issueToken({
        userId: linkResult.userId,
        serviceId,
        scopes: service?.allowedScopes || ["read:profile", "read:email"],
      }),
      serviceLinkPromise, // Ensure service link is created
    ]);

    if (!tokenResult.success) {
      return {
        success: false,
        error: tokenResult.error || "Token issuance failed",
      };
    }

    // Sync Wix user data if provider is Wix (non-blocking - don't wait for it)
    if (provider === "wix" && profileResult.accessToken) {
      const { syncWixUserData } = await import("./wix-user-sync");
      syncWixUserData(linkResult.userId).catch((err) => {
        logger.error("Wix user sync failed (non-blocking)", err);
      });
    }

    return {
      success: true,
      userId: linkResult.userId,
      tokens: tokenResult,
      callbackUrl,
    };
  } catch (error) {
    logger.error("Auth callback error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Callback handling failed",
    };
  }
}

/**
 * Exchange OAuth code for access token and profile
 */
async function exchangeCodeForProfile(
  provider: IdentityProvider,
  code: string
): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  profile?: any;
  error?: string;
}> {
  const env = process.env;
  const baseUrl = getBaseUrl(); // Use cached base URL

  try {
    switch (provider) {
      case "google": {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID!,
            client_secret: env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: `${baseUrl}/api/auth/identity-provider/google/callback`,
            grant_type: "authorization_code",
          }),
        });

        if (!tokenResponse.ok) {
          return { success: false, error: "Failed to exchange code for token" };
        }

        const tokenData = await tokenResponse.json();
        const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!profileResponse.ok) {
          return { success: false, error: "Failed to get user profile" };
        }

        return {
          success: true,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          profile: await profileResponse.json(),
        };
      }

      case "wix": {
        const tokenResponse = await fetch("https://www.wix.com/oauth/access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "authorization_code",
            client_id: env.WIX_CLIENT_ID,
            client_secret: env.WIX_CLIENT_SECRET,
            code,
            redirect_uri: `${baseUrl}/api/auth/identity-provider/wix/callback`,
          }),
        });

        if (!tokenResponse.ok) {
          return { success: false, error: "Failed to exchange code for token" };
        }

        const tokenData = await tokenResponse.json();
        // Wix user info would be retrieved separately
        return {
          success: true,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          profile: { id: tokenData.user_id, email: tokenData.email }, // Simplified
        };
      }

      case "facebook": {
        const tokenResponse = await fetch("https://graph.facebook.com/v18.0/oauth/access_token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: env.FACEBOOK_CLIENT_ID!,
            client_secret: env.FACEBOOK_CLIENT_SECRET!,
            redirect_uri: `${baseUrl}/api/auth/identity-provider/facebook/callback`,
          }),
        });

        if (!tokenResponse.ok) {
          return { success: false, error: "Failed to exchange code for token" };
        }

        const tokenData = await tokenResponse.json();
        const profileResponse = await fetch(
          `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`
        );

        if (!profileResponse.ok) {
          return { success: false, error: "Failed to get user profile" };
        }

        const profile = await profileResponse.json();
        return {
          success: true,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          profile: {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            picture: profile.picture?.data?.url,
          },
        };
      }

      case "microsoft": {
        const tenantId = env.AZURE_AD_TENANT_ID || "common";
        const tokenResponse = await fetch(
          `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              code,
              client_id: env.AZURE_AD_CLIENT_ID!,
              client_secret: env.AZURE_AD_CLIENT_SECRET!,
              redirect_uri: `${baseUrl}/api/auth/identity-provider/microsoft/callback`,
              grant_type: "authorization_code",
              scope: "openid profile email",
            }),
          }
        );

        if (!tokenResponse.ok) {
          return { success: false, error: "Failed to exchange code for token" };
        }

        const tokenData = await tokenResponse.json();
        const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!profileResponse.ok) {
          return { success: false, error: "Failed to get user profile" };
        }

        const profile = await profileResponse.json();
        return {
          success: true,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          profile: {
            id: profile.id,
            email: profile.mail || profile.userPrincipalName,
            name: profile.displayName,
            picture: null, // Microsoft Graph doesn't provide picture in basic profile
          },
        };
      }

      default:
        return { success: false, error: "Provider not implemented" };
    }
  } catch (error) {
    logger.error("Code exchange error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Code exchange failed",
    };
  }
}

/**
 * Ensure service link exists
 */
async function ensureServiceLink(userId: string, serviceId: ServiceId): Promise<void> {
  try {
    await prisma.serviceLink.upsert({
      where: {
        userId_serviceType: {
          userId,
          serviceType: serviceId.toUpperCase() as any,
        },
      },
      create: {
        userId,
        serviceType: serviceId.toUpperCase() as any,
        isActive: true,
      },
      update: {
        isActive: true,
        lastAccessed: new Date(),
      },
    });
  } catch (error) {
    logger.error("Error ensuring service link", error);
  }
}
