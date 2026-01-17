/**
 * MediaWiki Integration Service
 * Provides OAuth 2.0 extension compatibility and user synchronization
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getUserInfo, MediaWikiUserInfo } from "./user-info-service";
import { serviceRegistry } from "./service-registry";

export interface MediaWikiUser {
  name: string;
  email: string;
  realname: string;
  groups?: string[];
}

/**
 * Create or update MediaWiki user via API
 */
export async function syncMediaWikiUser(
  userId: string,
  mediaWikiApiUrl: string,
  apiToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userInfo = await getUserInfo(userId, "mediawiki", undefined, "mediawiki") as MediaWikiUserInfo | null;

    if (!userInfo) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // MediaWiki API endpoint for user creation/update
    const apiEndpoint = `${mediaWikiApiUrl}/api.php`;

    // Create user if doesn't exist, or update if exists
    const params = new URLSearchParams({
      action: "createaccount", // or "edit" for updates
      format: "json",
      username: userInfo.username,
      password: generateRandomPassword(), // MediaWiki requires password
      email: userInfo.email,
      realname: userInfo.realname,
      ...(apiToken && { token: apiToken }),
    });

    const response = await fetch(`${apiEndpoint}?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error("MediaWiki API error", error);
      return {
        success: false,
        error: error.error?.info || "MediaWiki API error",
      };
    }

    const result = await response.json();
    
    if (result.error) {
      return {
        success: false,
        error: result.error.info || "Failed to create MediaWiki user",
      };
    }

    logger.info("MediaWiki user synced", { userId, username: userInfo.username });

    return { success: true };
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
 * In production, you might want to use a more secure method
 */
function generateRandomPassword(): string {
  return crypto.randomBytes(32).toString("base64");
}

/**
 * Validate MediaWiki OAuth request
 */
export function validateMediaWikiRequest(
  request: {
    oauth_consumer_key?: string;
    oauth_token?: string;
    oauth_signature?: string;
  }
): boolean {
  // In a full implementation, you would:
  // 1. Validate OAuth signature
  // 2. Check consumer key against registered MediaWiki instances
  // 3. Validate token
  // For now, we'll do basic validation
  return !!(request.oauth_consumer_key && request.oauth_token);
}

/**
 * Get MediaWiki session token
 */
export async function getMediaWikiSession(
  userId: string,
  mediaWikiApiUrl: string
): Promise<string | null> {
  try {
    // This would typically involve:
    // 1. Getting user's MediaWiki credentials
    // 2. Authenticating with MediaWiki API
    // 3. Getting session token
    // For now, we'll return a placeholder
    
    logger.info("MediaWiki session requested", { userId, mediaWikiApiUrl });
    return null;
  } catch (error) {
    logger.error("Error getting MediaWiki session", error);
    return null;
  }
}

// Import crypto
import crypto from "crypto";
