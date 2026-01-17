/**
 * Replit Auth Integration Service
 * Provides OAuth 2.0 authentication and user management for Replit applications
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getUserInfo } from "./user-info-service";
import { serviceRegistry } from "./service-registry";
import { getEnv } from "@/lib/config/env";

const env = getEnv();

export interface ReplitAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface ReplitUser {
  id: string;
  username: string;
  email: string;
  name?: string;
  image?: string;
  bio?: string;
  url?: string;
}

/**
 * Get Replit OAuth configuration
 */
export function getReplitAuthConfig(): ReplitAuthConfig {
  return {
    clientId: process.env.REPLIT_CLIENT_ID || "",
    clientSecret: process.env.REPLIT_CLIENT_SECRET || "",
    redirectUri: env.CURSOR_REPLIT_CALLBACK_URL || `${env.AD_ID_DOMAIN || ""}/api/auth/replit/callback`,
    scopes: ["identity", "read"],
  };
}

/**
 * Exchange Replit OAuth code for access token
 */
export async function exchangeReplitCode(
  code: string
): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}> {
  try {
    const config = getReplitAuthConfig();

    const response = await fetch("https://replit.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      logger.error("Replit token exchange error", { status: response.status, error });
      return {
        success: false,
        error: error.error || "Failed to exchange code for token",
      };
    }

    const data = await response.json();

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in || 3600,
    };
  } catch (error) {
    logger.error("Replit code exchange error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Code exchange failed",
    };
  }
}

/**
 * Get Replit user information
 */
export async function getReplitUser(accessToken: string): Promise<ReplitUser | null> {
  try {
    const response = await fetch("https://replit.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      logger.error("Replit user fetch error", { status: response.status });
      return null;
    }

    const data = await response.json();

    return {
      id: data.id || data.userId,
      username: data.username,
      email: data.email,
      name: data.name || data.displayName,
      image: data.image || data.avatarUrl,
      bio: data.bio,
      url: data.url,
    };
  } catch (error) {
    logger.error("Error fetching Replit user", error);
    return null;
  }
}

/**
 * Create or update user from Replit authentication
 */
export async function syncReplitUser(
  replitUser: ReplitUser,
  accessToken: string,
  refreshToken?: string
): Promise<{
  success: boolean;
  userId?: string;
  isNewUser?: boolean;
  error?: string;
}> {
  try {
    if (!replitUser.email) {
      return {
        success: false,
        error: "Replit user email is required",
      };
    }

    // Find existing user by email
    let user = await prisma.user.findUnique({
      where: { email: replitUser.email.toLowerCase() },
      include: { accounts: true },
    });

    if (user) {
      // Check if Replit account is already linked
      const replitAccount = user.accounts.find((acc) => acc.provider === "replit");

      if (replitAccount) {
        // Update tokens
        await prisma.account.update({
          where: { id: replitAccount.id },
          data: {
            access_token: accessToken,
            refresh_token: refreshToken,
          },
        });
      } else {
        // Link Replit account
        await prisma.account.create({
          data: {
            userId: user.id,
            type: "oauth",
            provider: "replit",
            providerAccountId: replitUser.id,
            access_token: accessToken,
            refresh_token: refreshToken,
          },
        });
      }

      // Update user info if Replit has better data
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: user.name || replitUser.name,
          image: user.image || replitUser.image,
        },
      });

      return {
        success: true,
        userId: user.id,
        isNewUser: false,
      };
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email: replitUser.email.toLowerCase(),
        name: replitUser.name || replitUser.username,
        image: replitUser.image,
        emailVerified: new Date(),
        accounts: {
          create: {
            type: "oauth",
            provider: "replit",
            providerAccountId: replitUser.id,
            access_token: accessToken,
            refresh_token: refreshToken,
          },
        },
      },
    });

    // Create service link for cursor-replit
    await prisma.serviceLink.create({
      data: {
        userId: newUser.id,
        serviceType: "CURSOR_REPLIT" as any,
        isActive: true,
      },
    });

    return {
      success: true,
      userId: newUser.id,
      isNewUser: true,
    };
  } catch (error) {
    logger.error("Replit user sync error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "User sync failed",
    };
  }
}

/**
 * Generate Replit OAuth authorization URL
 */
export function getReplitAuthUrl(state: string): string {
  const config = getReplitAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
  });

  return `https://replit.com/api/oauth2/authorize?${params.toString()}`;
}

/**
 * Refresh Replit access token
 */
export async function refreshReplitToken(
  refreshToken: string
): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}> {
  try {
    const config = getReplitAuthConfig();

    const response = await fetch("https://replit.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: "Failed to refresh token",
      };
    }

    const data = await response.json();

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in || 3600,
    };
  } catch (error) {
    logger.error("Replit token refresh error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Token refresh failed",
    };
  }
}
