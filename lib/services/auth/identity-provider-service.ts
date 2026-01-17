/**
 * Identity Provider Service
 * Unified service for managing OAuth authentication across multiple providers and services
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { serviceRegistry, type ServiceId } from "./service-registry";
import { normalizeProfile, type NormalizedProfile } from "./profile-normalizer";
import { generateTokenPair } from "@/lib/auth/jwt-service";
import { randomBytes } from "crypto";

export type OAuthProvider = "google" | "facebook" | "microsoft" | "wix";

export interface AuthInitiationResult {
  url: string;
  state: string;
}

export type AuthCallbackResult =
  | {
      user: {
        id: string;
        email: string;
        name: string | null;
        role: string;
        image: string | null;
      };
      token: string;
      refreshToken: string;
      expiresIn: number;
      callbackUrl: string;
      serviceId: ServiceId;
      error: null;
    }
  | {
      user: null;
      token: null;
      refreshToken: null;
      expiresIn: null;
      callbackUrl: null;
      serviceId: null;
      error: string;
    };

class IdentityProviderService {
  /**
   * Initiate OAuth authentication flow
   */
  async initiateAuth(
    provider: OAuthProvider,
    serviceId: ServiceId,
    callbackUrl?: string
  ): Promise<AuthInitiationResult | { error: string }> {
    try {
      // Validate service
      const serviceConfig = serviceRegistry.getServiceConfig(serviceId);
      if (!serviceConfig || !serviceConfig.enabled) {
        return { error: "Service not found or disabled" };
      }

      // Use provided callback URL or service default
      const finalCallbackUrl = callbackUrl || serviceConfig.callbackUrl;

      // Validate callback URL
      if (!serviceRegistry.validateServiceCallback(serviceId, finalCallbackUrl)) {
        return { error: "Invalid callback URL" };
      }

      // Generate secure state token
      const state = this.generateStateToken(serviceId, finalCallbackUrl);

      // Get provider authorization URL
      const authUrl = this.getProviderAuthUrl(provider, state);

      if (!authUrl) {
        return { error: `Provider ${provider} not configured` };
      }

      return {
        url: authUrl,
        state,
      };
    } catch (error) {
      logger.error("Auth initiation error", error);
      return { error: "Failed to initiate authentication" };
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(
    provider: OAuthProvider,
    code: string,
    state: string
  ): Promise<AuthCallbackResult> {
    try {
      // Validate and decode state
      const stateData = this.decodeStateToken(state);
      if (!stateData) {
        return {
          user: null,
          token: null,
          refreshToken: null,
          expiresIn: null,
          callbackUrl: null,
          serviceId: null,
          error: "Invalid state token",
        };
      }

      const { serviceId, callbackUrl } = stateData;

      // Validate service
      const serviceConfig = serviceRegistry.getServiceConfig(serviceId);
      if (!serviceConfig || !serviceConfig.enabled) {
        return {
          user: null,
          token: null,
          refreshToken: null,
          expiresIn: null,
          callbackUrl: null,
          serviceId: null,
          error: "Service not found or disabled",
        };
      }

      // Exchange code for tokens and get user profile
      const profileData = await this.exchangeCodeForProfile(provider, code);
      if (!profileData) {
        return {
          user: null,
          token: null,
          refreshToken: null,
          expiresIn: null,
          callbackUrl: null,
          serviceId: null,
          error: "Failed to get user profile from provider",
        };
      }

      const { profile, accessToken, refreshToken: providerRefreshToken } = profileData;

      // Normalize profile
      const normalizedProfile = normalizeProfile(provider, profile);

      if (!normalizedProfile.email) {
        return {
          user: null,
          token: null,
          refreshToken: null,
          expiresIn: null,
          callbackUrl: null,
          serviceId: null,
          error: "No email found in provider profile",
        };
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: normalizedProfile.email.toLowerCase() },
        include: { accounts: true },
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: normalizedProfile.email.toLowerCase(),
            name: normalizedProfile.name,
            image: normalizedProfile.image,
            emailVerified: normalizedProfile.emailVerified ? new Date() : null,
          },
          include: { accounts: true },
        });
      } else {
        // Update existing user if needed
        const updateData: any = {};
        if (normalizedProfile.name && !user.name) {
          updateData.name = normalizedProfile.name;
        }
        if (normalizedProfile.image && !user.image) {
          updateData.image = normalizedProfile.image;
        }
        if (normalizedProfile.emailVerified && !user.emailVerified) {
          updateData.emailVerified = new Date();
        }

        if (Object.keys(updateData).length > 0) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
            include: { accounts: true },
          });
        }
      }

      // Link or update account
      await this.linkAccount(user.id, provider, {
        providerAccountId: normalizedProfile.providerAccountId,
        accessToken,
        refreshToken: providerRefreshToken,
        profile: normalizedProfile.rawProfile,
      });

      // Sync Wix user data if provider is Wix
      if (provider === "wix" && accessToken) {
        await this.syncWixUserData(user.id, accessToken);
      }

      // Link user to service
      await this.linkUserToService(user.id, serviceId);

      // Generate service-specific token
      const tokenPair = generateTokenPair({
        sub: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role,
        serviceAccess: [serviceId],
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        },
        token: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        callbackUrl,
        serviceId,
        error: null,
      };
    } catch (error) {
      logger.error("Auth callback error", error);
      return {
        user: null,
        token: null,
        refreshToken: null,
        expiresIn: null,
        callbackUrl: null,
        serviceId: null,
        error: "Authentication failed",
      };
    }
  }

  /**
   * Link OAuth account to user
   */
  async linkAccount(
    userId: string,
    provider: string,
    accountData: {
      providerAccountId: string;
      accessToken?: string;
      refreshToken?: string;
      profile?: any;
    }
  ): Promise<void> {
    try {
      const existingAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId: accountData.providerAccountId,
          },
        },
      });

      if (existingAccount) {
        // Update existing account
        await prisma.account.update({
          where: { id: existingAccount.id },
          data: {
            access_token: accountData.accessToken || existingAccount.access_token,
            refresh_token: accountData.refreshToken || existingAccount.refresh_token,
            expires_at: accountData.accessToken ? this.calculateExpiresAt() : existingAccount.expires_at,
          },
        });
      } else {
        // Create new account
        await prisma.account.create({
          data: {
            userId,
            type: "oauth",
            provider,
            providerAccountId: accountData.providerAccountId,
            access_token: accountData.accessToken,
            refresh_token: accountData.refreshToken,
            expires_at: accountData.accessToken ? this.calculateExpiresAt() : null,
          },
        });
      }
    } catch (error) {
      logger.error("Account linking error", error);
      throw error;
    }
  }

  /**
   * Link user to service
   * Maps ServiceId to ServiceType and creates/updates ServiceLink record
   */
  async linkUserToService(userId: string, serviceId: ServiceId): Promise<void> {
    try {
      // Map ServiceId to ServiceType enum value
      // Since ServiceType enum doesn't match our ServiceId, we'll use a mapping
      // For identity provider services, we'll track via a custom field in ServiceLink preferences
      // or create a separate tracking mechanism
      
      // Check if ServiceLink already exists for this user-service combination
      // We'll store the serviceId in the preferences JSON field
      // Note: Prisma JSON filtering is limited, so we'll fetch all and filter in memory
      const allLinks = await prisma.serviceLink.findMany({
        where: { userId },
      });

      const existingLink = allLinks.find((link) => {
        const preferences = link.preferences as any;
        return preferences?.serviceId === serviceId;
      });

      if (existingLink) {
        // Update existing link
        await prisma.serviceLink.update({
          where: { id: existingLink.id },
          data: {
            isActive: true,
            lastAccessed: new Date(),
            preferences: {
              ...(existingLink.preferences as any || {}),
              serviceId,
              lastLinkedAt: new Date().toISOString(),
            },
          },
        });
      } else {
        // Create new link - use MARKETPLACE as default ServiceType since it's the closest match
        // The actual serviceId is stored in preferences
        await prisma.serviceLink.create({
          data: {
            userId,
            serviceType: "MARKETPLACE", // Default type, actual service tracked in preferences
            isActive: true,
            lastAccessed: new Date(),
            preferences: {
              serviceId,
              linkedAt: new Date().toISOString(),
            },
          },
        });
      }

      logger.info("User linked to service", { userId, serviceId });
    } catch (error) {
      logger.error("Service linking error", error);
      // Don't throw - service linking is not critical
    }
  }

  /**
   * Sync Wix user data
   */
  async syncWixUserData(userId: string, wixAccessToken: string): Promise<void> {
    try {
      // Import and use the Wix user sync service
      const { wixUserSync } = await import("./wix-user-sync");
      await wixUserSync.syncUserData(userId, wixAccessToken);
      logger.info("Wix user data synced", { userId });
    } catch (error) {
      logger.error("Wix user data sync error", error);
      throw error;
    }
  }

  /**
   * Get user information for services
   */
  async getUserInfo(userId: string, serviceId: ServiceId): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          accounts: true,
          serviceLinks: true,
        },
      });

      if (!user) {
        return null;
      }

      // Check if user has access to this service
      // ServiceId is stored in ServiceLink preferences
      const hasAccess = user.serviceLinks.some((link) => {
        if (!link.isActive) return false;
        const preferences = link.preferences as any;
        return preferences?.serviceId === serviceId;
      });

      if (!hasAccess) {
        // If no explicit link, allow access (first-time access will create link)
        // This allows new users to access services
        logger.debug("No service link found, allowing access", { userId, serviceId });
      }

      // Get list of services user has access to
      const services = user.serviceLinks
        .filter((link) => link.isActive)
        .map((link) => {
          const preferences = link.preferences as any;
          return preferences?.serviceId;
        })
        .filter((id): id is string => !!id);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: !!user.emailVerified,
        providers: user.accounts.map((acc) => acc.provider),
        services,
      };
    } catch (error) {
      logger.error("Get user info error", error);
      return null;
    }
  }

  /**
   * Generate secure state token
   */
  private generateStateToken(serviceId: ServiceId, callbackUrl: string): string {
    const nonce = randomBytes(16).toString("hex");
    const timestamp = Date.now();
    const data = {
      serviceId,
      callbackUrl,
      nonce,
      timestamp,
    };

    // Encode as base64
    return Buffer.from(JSON.stringify(data)).toString("base64url");
  }

  /**
   * Decode state token
   */
  private decodeStateToken(state: string): { serviceId: ServiceId; callbackUrl: string } | null {
    try {
      const decoded = Buffer.from(state, "base64url").toString("utf-8");
      const data = JSON.parse(decoded);

      // Validate timestamp (state should be used within 10 minutes)
      const age = Date.now() - data.timestamp;
      if (age > 10 * 60 * 1000) {
        return null;
      }

      return {
        serviceId: data.serviceId,
        callbackUrl: data.callbackUrl,
      };
    } catch (error) {
      logger.error("State token decode error", error);
      return null;
    }
  }

  /**
   * Get provider authorization URL
   */
  private getProviderAuthUrl(provider: OAuthProvider, state: string): string | null {
    const baseUrl = process.env.AD_ID_DOMAIN || process.env.NEXTAUTH_URL || "https://ad.id";
    const callbackUrl = `${baseUrl}/api/auth/identity-provider/${provider}/callback`;

    switch (provider) {
      case "google":
        if (!process.env.GOOGLE_CLIENT_ID) return null;
        const googleParams = new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          redirect_uri: callbackUrl,
          response_type: "code",
          scope: "openid profile email",
          state,
          access_type: "offline",
          prompt: "consent",
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${googleParams.toString()}`;

      case "facebook":
        if (!process.env.FACEBOOK_CLIENT_ID) return null;
        const facebookParams = new URLSearchParams({
          client_id: process.env.FACEBOOK_CLIENT_ID,
          redirect_uri: callbackUrl,
          response_type: "code",
          scope: "email public_profile",
          state,
        });
        return `https://www.facebook.com/v18.0/dialog/oauth?${facebookParams.toString()}`;

      case "microsoft":
        if (!process.env.AZURE_AD_CLIENT_ID || !process.env.AZURE_AD_TENANT_ID) return null;
        const tenantId = process.env.AZURE_AD_TENANT_ID;
        const microsoftParams = new URLSearchParams({
          client_id: process.env.AZURE_AD_CLIENT_ID,
          redirect_uri: callbackUrl,
          response_type: "code",
          scope: "openid profile email",
          state,
        });
        return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${microsoftParams.toString()}`;

      case "wix":
        if (!process.env.WIX_CLIENT_ID) return null;
        const wixParams = new URLSearchParams({
          client_id: process.env.WIX_CLIENT_ID,
          redirect_uri: callbackUrl,
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
   * Exchange authorization code for user profile
   */
  private async exchangeCodeForProfile(
    provider: OAuthProvider,
    code: string
  ): Promise<{ profile: any; accessToken: string; refreshToken?: string } | null> {
    const baseUrl = process.env.AD_ID_DOMAIN || process.env.NEXTAUTH_URL || "https://ad.id";
    const callbackUrl = `${baseUrl}/api/auth/identity-provider/${provider}/callback`;

    try {
      switch (provider) {
        case "google": {
          // Exchange code for token
          const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              code,
              grant_type: "authorization_code",
              redirect_uri: callbackUrl,
            }),
          });

          if (!tokenResponse.ok) return null;
          const tokenData = await tokenResponse.json();

          // Get user info
          const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });

          if (!userInfoResponse.ok) return null;
          const profile = await userInfoResponse.json();

          return {
            profile,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
          };
        }

        case "facebook": {
          // Exchange code for token
          const tokenResponse = await fetch("https://graph.facebook.com/v18.0/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.FACEBOOK_CLIENT_ID!,
              client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
              code,
              redirect_uri: callbackUrl,
            }),
          });

          if (!tokenResponse.ok) return null;
          const tokenData = await tokenResponse.json();

          // Get user info
          const userInfoResponse = await fetch(
            `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`
          );

          if (!userInfoResponse.ok) return null;
          const profile = await userInfoResponse.json();

          return {
            profile,
            accessToken: tokenData.access_token,
          };
        }

        case "microsoft": {
          const tenantId = process.env.AZURE_AD_TENANT_ID || "common";
          // Exchange code for token
          const tokenResponse = await fetch(
            `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: process.env.AZURE_AD_CLIENT_ID!,
                client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
                code,
                grant_type: "authorization_code",
                redirect_uri: callbackUrl,
                scope: "openid profile email",
              }),
            }
          );

          if (!tokenResponse.ok) return null;
          const tokenData = await tokenResponse.json();

          // Get user info from ID token or userinfo endpoint
          const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });

          if (!userInfoResponse.ok) return null;
          const profile = await userInfoResponse.json();

          return {
            profile,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
          };
        }

        case "wix": {
          // Exchange code for token
          const tokenResponse = await fetch("https://www.wix.com/oauth/access", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.WIX_CLIENT_ID!,
              client_secret: process.env.WIX_CLIENT_SECRET!,
              code,
              grant_type: "authorization_code",
              redirect_uri: callbackUrl,
            }),
          });

          if (!tokenResponse.ok) return null;
          const tokenData = await tokenResponse.json();

          // Get user info (Wix API endpoint)
          const userInfoResponse = await fetch("https://www.wix.com/api/v1/user", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });

          if (!userInfoResponse.ok) return null;
          const profile = await userInfoResponse.json();

          return {
            profile,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
          };
        }

        default:
          return null;
      }
    } catch (error) {
      logger.error("Code exchange error", error);
      return null;
    }
  }

  /**
   * Calculate token expiration timestamp
   */
  private calculateExpiresAt(): number {
    // Default to 1 hour from now
    return Math.floor(Date.now() / 1000) + 3600;
  }
}

export const identityProviderService = new IdentityProviderService();
