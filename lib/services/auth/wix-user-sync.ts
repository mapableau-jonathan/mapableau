/**
 * Wix User Sync Service
 * Retrieves and syncs user information from Wix
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { normalizeWixProfile } from "./profile-normalizer";

interface WixUserData {
  id: string;
  email: string;
  name?: string;
  image?: string;
  customFields?: any;
}

class WixUserSync {
  /**
   * Sync user data from Wix
   */
  async syncUserData(userId: string, wixAccessToken: string): Promise<boolean> {
    try {
      // Get user's Wix account
      const account = await prisma.account.findFirst({
        where: {
          userId,
          provider: "wix",
        },
      });

      if (!account || !account.access_token) {
        logger.warn("No Wix account found for user", { userId });
        return false;
      }

      // Use provided token or stored token
      const accessToken = wixAccessToken || account.access_token;

      // Fetch user data from Wix API
      const userData = await this.fetchWixUserData(accessToken);

      if (!userData) {
        logger.warn("Failed to fetch Wix user data", { userId });
        return false;
      }

      // Normalize profile
      const normalizedProfile = normalizeWixProfile(userData);

      // Update user in database
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: normalizedProfile.name || undefined,
          image: normalizedProfile.image || undefined,
          emailVerified: normalizedProfile.emailVerified ? new Date() : undefined,
        },
      });

      // Update account token if new token provided
      if (wixAccessToken && wixAccessToken !== account.access_token) {
        await prisma.account.update({
          where: { id: account.id },
          data: {
            access_token: wixAccessToken,
            expires_at: this.calculateExpiresAt(),
          },
        });
      }

      logger.info("Wix user data synced", { userId });
      return true;
    } catch (error) {
      logger.error("Wix user sync error", error);
      return false;
    }
  }

  /**
   * Fetch user data from Wix API
   */
  private async fetchWixUserData(accessToken: string): Promise<WixUserData | null> {
    try {
      // Wix API endpoint for user info
      // Note: This is a placeholder - actual Wix API endpoint may differ
      const response = await fetch("https://www.wix.com/api/v1/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Try token refresh if expired
        if (response.status === 401) {
          const refreshed = await this.refreshWixToken(accessToken);
          if (refreshed) {
            return await this.fetchWixUserData(refreshed);
          }
        }
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error("Fetch Wix user data error", error);
      return null;
    }
  }

  /**
   * Refresh Wix access token
   */
  private async refreshWixToken(refreshToken: string): Promise<string | null> {
    try {
      const response = await fetch("https://www.wix.com/oauth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.WIX_CLIENT_ID || "",
          client_secret: process.env.WIX_CLIENT_SECRET || "",
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      logger.error("Wix token refresh error", error);
      return null;
    }
  }

  /**
   * Sync all Wix users (scheduled job)
   */
  async syncAllWixUsers(): Promise<void> {
    try {
      // Get all users with Wix accounts
      const accounts = await prisma.account.findMany({
        where: {
          provider: "wix",
          access_token: { not: null },
        },
        include: {
          user: true,
        },
      });

      logger.info("Starting Wix user sync job", { count: accounts.length });

      for (const account of accounts) {
        if (account.access_token) {
          await this.syncUserData(account.userId, account.access_token);
          // Rate limiting - wait 100ms between requests
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      logger.info("Wix user sync job completed", { count: accounts.length });
    } catch (error) {
      logger.error("Sync all Wix users error", error);
    }
  }

  /**
   * Calculate token expiration timestamp
   */
  private calculateExpiresAt(): number {
    return Math.floor(Date.now() / 1000) + 3600; // 1 hour
  }
}

export const wixUserSync = new WixUserSync();
