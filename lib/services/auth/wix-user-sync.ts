/**
 * Wix User Sync Service
 * Retrieves and syncs user information from Wix API
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/config/env";
import crypto from "crypto";

const env = getEnv();

/**
 * Get encryption key for Wix tokens
 */
function getEncryptionKey(): Buffer {
  const key = process.env.DATA_ENCRYPTION_KEY || env.NEXTAUTH_SECRET;
  return crypto.createHash("sha256").update(key).digest();
}

/**
 * Encrypt Wix access token
 */
function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt Wix access token
 */
function decryptToken(encryptedToken: string): string {
  const key = getEncryptionKey();
  const [ivHex, encrypted] = encryptedToken.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Refresh Wix access token
 */
async function refreshWixToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  try {
    const response = await fetch("https://www.wix.com/oauth/access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: env.WIX_CLIENT_ID,
        client_secret: env.WIX_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      logger.error("Wix token refresh failed", { status: response.status });
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in || 3600,
    };
  } catch (error) {
    logger.error("Wix token refresh error", error);
    return null;
  }
}

/**
 * Get user data from Wix API
 */
async function getWixUserData(accessToken: string): Promise<any | null> {
  try {
    const response = await fetch("https://www.wixapis.com/members/v1/members/current", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, need to refresh
        return null;
      }
      logger.error("Wix API error", { status: response.status });
      return null;
    }

    return await response.json();
  } catch (error) {
    logger.error("Error fetching Wix user data", error);
    return null;
  }
}

/**
 * Sync user data from Wix
 */
export async function syncWixUserData(userId: string): Promise<{
  success: boolean;
  synced: boolean;
  error?: string;
}> {
  try {
    // Get Wix account for user
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: "wix",
      },
    });

    if (!account || !account.access_token) {
      return {
        success: false,
        synced: false,
        error: "Wix account not found or no access token",
      };
    }

    // Decrypt access token
    let accessToken: string;
    try {
      accessToken = decryptToken(account.access_token);
    } catch (error) {
      logger.error("Error decrypting Wix token", error);
      return {
        success: false,
        synced: false,
        error: "Failed to decrypt access token",
      };
    }

    // Get user data from Wix
    let wixData = await getWixUserData(accessToken);

    // If token expired, try to refresh
    if (!wixData && account.refresh_token) {
      const refreshResult = await refreshWixToken(account.refresh_token);
      if (refreshResult) {
        // Update tokens in database
        await prisma.account.update({
          where: { id: account.id },
          data: {
            access_token: encryptToken(refreshResult.accessToken),
            refresh_token: encryptToken(refreshResult.refreshToken),
            expires_at: Math.floor(Date.now() / 1000) + refreshResult.expiresIn,
          },
        });

        // Retry getting user data
        wixData = await getWixUserData(refreshResult.accessToken);
      }
    }

    if (!wixData) {
      return {
        success: false,
        synced: false,
        error: "Failed to retrieve user data from Wix",
      };
    }

    // Extract user information from Wix response
    const member = wixData.member || wixData;
    const email = member.contact?.email || member.email;
    const name = member.contact?.firstName && member.contact?.lastName
      ? `${member.contact.firstName} ${member.contact.lastName}`
      : member.contact?.fullName || member.name;
    const image = member.image?.url || member.photo;

    // Update user in database
    const updateData: any = {};
    if (email) updateData.email = email.toLowerCase();
    if (name) updateData.name = name;
    if (image) updateData.image = image;

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    logger.info("Wix user data synced", { userId, email });

    return {
      success: true,
      synced: true,
    };
  } catch (error) {
    logger.error("Wix user sync error", error);
    return {
      success: false,
      synced: false,
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
}

/**
 * Schedule periodic Wix user sync
 * This would typically be called by a cron job or scheduled task
 */
export async function scheduleWixUserSync(): Promise<void> {
  try {
    // Get all users with Wix accounts
    const wixAccounts = await prisma.account.findMany({
      where: { provider: "wix" },
      select: { userId: true },
    });

    // Sync each user
    for (const account of wixAccounts) {
      await syncWixUserData(account.userId);
      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info("Wix user sync completed", { count: wixAccounts.length });
  } catch (error) {
    logger.error("Wix user sync scheduling error", error);
  }
}
