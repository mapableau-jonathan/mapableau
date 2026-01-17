/**
 * Enhanced MediaWiki Integration Service
 * Provides OAuth 2.0 extension compatibility and comprehensive user management
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getUserInfo, MediaWikiUserInfo } from "./user-info-service";
import { serviceRegistry } from "./service-registry";
import { getEnv } from "@/lib/config/env";
import crypto from "crypto";

const env = getEnv();

export interface MediaWikiConfig {
  apiUrl: string;
  consumerKey: string;
  consumerSecret: string;
  callbackUrl: string;
}

export interface MediaWikiUser {
  id: number;
  name: string;
  email: string;
  realname: string;
  groups: string[];
}

/**
 * Get MediaWiki configuration
 */
export function getMediaWikiConfig(): MediaWikiConfig {
  return {
    apiUrl: process.env.MEDIAWIKI_API_URL || "",
    consumerKey: process.env.MEDIAWIKI_CONSUMER_KEY || "",
    consumerSecret: process.env.MEDIAWIKI_CONSUMER_SECRET || "",
    callbackUrl: env.MEDIAWIKI_CALLBACK_URL || `${env.AD_ID_DOMAIN || ""}/api/auth/mediawiki/callback`,
  };
}

/**
 * Generate MediaWiki OAuth authorization URL
 */
export function getMediaWikiAuthUrl(state: string): string {
  const config = getMediaWikiConfig();
  const params = new URLSearchParams({
    oauth_consumer_key: config.consumerKey,
    oauth_callback: config.callbackUrl,
    oauth_signature_method: "HMAC-SHA1",
    oauth_version: "1.0",
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    state,
  });

  // In production, you would sign this request properly
  return `${config.apiUrl}/index.php?title=Special:OAuth/authorize&${params.toString()}`;
}

/**
 * Exchange MediaWiki OAuth code for access token
 */
export async function exchangeMediaWikiCode(
  code: string,
  verifier: string
): Promise<{
  success: boolean;
  accessToken?: string;
  accessSecret?: string;
  error?: string;
}> {
  try {
    const config = getMediaWikiConfig();

    // MediaWiki OAuth uses OAuth 1.0a, which requires signing
    // This is a simplified version - in production, use proper OAuth 1.0a signing
    const response = await fetch(`${config.apiUrl}/index.php?title=Special:OAuth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        oauth_consumer_key: config.consumerKey,
        oauth_token: code,
        oauth_verifier: verifier,
        oauth_signature_method: "HMAC-SHA1",
        oauth_version: "1.0",
        oauth_nonce: crypto.randomBytes(16).toString("hex"),
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: "Failed to exchange code for token",
      };
    }

    const data = await response.text();
    const params = new URLSearchParams(data);

    return {
      success: true,
      accessToken: params.get("oauth_token") || undefined,
      accessSecret: params.get("oauth_token_secret") || undefined,
    };
  } catch (error) {
    logger.error("MediaWiki code exchange error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Code exchange failed",
    };
  }
}

/**
 * Get MediaWiki user information via API
 */
export async function getMediaWikiUser(
  accessToken: string,
  accessSecret: string
): Promise<MediaWikiUser | null> {
  try {
    const config = getMediaWikiConfig();

    // MediaWiki API call to get user info
    // This requires proper OAuth 1.0a signing in production
    const params = new URLSearchParams({
      action: "query",
      meta: "userinfo",
      format: "json",
      uiprop: "id|name|email|realname|groups",
    });

    const response = await fetch(`${config.apiUrl}/api.php?${params.toString()}`, {
      headers: {
        Authorization: `OAuth oauth_consumer_key="${config.consumerKey}", oauth_token="${accessToken}"`,
      },
    });

    if (!response.ok) {
      logger.error("MediaWiki user fetch error", { status: response.status });
      return null;
    }

    const data = await response.json();
    const userInfo = data.query?.userinfo;

    if (!userInfo || userInfo.anon) {
      return null;
    }

    return {
      id: userInfo.id,
      name: userInfo.name,
      email: userInfo.email || "",
      realname: userInfo.realname || userInfo.name,
      groups: userInfo.groups || [],
    };
  } catch (error) {
    logger.error("Error fetching MediaWiki user", error);
    return null;
  }
}

/**
 * Create or update MediaWiki user via API
 */
export async function createMediaWikiUser(
  userId: string,
  mediaWikiUserInfo: MediaWikiUserInfo
): Promise<{
  success: boolean;
  mediaWikiUserId?: number;
  error?: string;
}> {
  try {
    const config = getMediaWikiConfig();

    // Use MediaWiki API to create user
    const params = new URLSearchParams({
      action: "createaccount",
      format: "json",
      username: mediaWikiUserInfo.username,
      password: generateRandomPassword(), // MediaWiki requires password
      email: mediaWikiUserInfo.email,
      realname: mediaWikiUserInfo.realname,
      reason: "Account created via ad.id identity provider",
    });

    const response = await fetch(`${config.apiUrl}/api.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      logger.error("MediaWiki user creation error", error);
      return {
        success: false,
        error: error.error?.info || "Failed to create MediaWiki user",
      };
    }

    const data = await response.json();

    if (data.createaccount?.result === "Success") {
      // User created successfully
      // Note: In production, you would need to authenticate and get user ID
      return {
        success: true,
        mediaWikiUserId: data.createaccount?.userid || undefined,
      };
    }

    return {
      success: false,
      error: data.createaccount?.message || "Failed to create user",
    };
  } catch (error) {
    logger.error("MediaWiki user creation error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "User creation failed",
    };
  }
}

/**
 * Update MediaWiki user via API
 */
export async function updateMediaWikiUser(
  mediaWikiUserId: number,
  updates: Partial<MediaWikiUserInfo>
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getMediaWikiConfig();

    const params = new URLSearchParams({
      action: "edit",
      format: "json",
      userid: mediaWikiUserId.toString(),
    });

    if (updates.email) {
      params.append("email", updates.email);
    }

    if (updates.realname) {
      params.append("realname", updates.realname);
    }

    const response = await fetch(`${config.apiUrl}/api.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      return {
        success: false,
        error: "Failed to update MediaWiki user",
      };
    }

    return { success: true };
  } catch (error) {
    logger.error("MediaWiki user update error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}

/**
 * Sync user from ad.id to MediaWiki
 */
export async function syncUserToMediaWiki(
  userId: string
): Promise<{
  success: boolean;
  mediaWikiUserId?: number;
  error?: string;
}> {
  try {
    const userInfo = await getUserInfo(userId, "mediawiki", undefined, "mediawiki") as MediaWikiUserInfo | null;

    if (!userInfo) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Check if MediaWiki account already exists
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: "mediawiki",
      },
    });

    if (account) {
      // Update existing account
      const result = await updateMediaWikiUser(
        parseInt(account.providerAccountId),
        userInfo
      );
      return {
        success: result.success,
        mediaWikiUserId: parseInt(account.providerAccountId),
        error: result.error,
      };
    }

    // Create new MediaWiki account
    const result = await createMediaWikiUser(userId, userInfo);

    if (result.success && result.mediaWikiUserId) {
      // Store MediaWiki account link
      await prisma.account.create({
        data: {
          userId,
          type: "oauth",
          provider: "mediawiki",
          providerAccountId: result.mediaWikiUserId.toString(),
        },
      });
    }

    return result;
  } catch (error) {
    logger.error("MediaWiki user sync error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
}

/**
 * Generate random password for MediaWiki user
 */
function generateRandomPassword(): string {
  return crypto.randomBytes(32).toString("base64");
}
