/**
 * MediaWiki Integration Service
 * Provides OAuth 2.0 extension compatibility and user synchronization
 */

import { logger } from "@/lib/logger";
import { userInfoService } from "./user-info-service";
import { serviceRegistry } from "./service-registry";
import type { ServiceId } from "./service-registry";

class MediaWikiIntegration {
  /**
   * Get user data in MediaWiki-compatible format
   */
  async getUserForMediaWiki(userId: string): Promise<any | null> {
    try {
      const result = await userInfoService.getUserInfo({
        userId,
        serviceId: "mediawiki",
        format: "mediawiki",
      });

      if ("error" in result) {
        return null;
      }

      return result;
    } catch (error) {
      logger.error("Get MediaWiki user error", error);
      return null;
    }
  }

  /**
   * Create or update MediaWiki user via API
   */
  async syncUserToMediaWiki(
    userId: string,
    mediaWikiApiUrl: string,
    apiToken: string
  ): Promise<boolean> {
    try {
      // Get user data
      const userData = await this.getUserForMediaWiki(userId);
      if (!userData) {
        return false;
      }

      // Call MediaWiki API to create/update user
      // This is a placeholder - actual implementation depends on MediaWiki API
      const response = await fetch(`${mediaWikiApiUrl}/api.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${apiToken}`,
        },
        body: new URLSearchParams({
          action: "createuser",
          username: userData.username,
          email: userData.email,
          realname: userData.realname,
          format: "json",
        }),
      });

      if (!response.ok) {
        logger.warn("MediaWiki user sync failed", { userId, status: response.status });
        return false;
      }

      logger.info("MediaWiki user synced", { userId });
      return true;
    } catch (error) {
      logger.error("MediaWiki user sync error", error);
      return false;
    }
  }

  /**
   * Validate MediaWiki OAuth request
   */
  validateMediaWikiRequest(request: any): boolean {
    try {
      // Validate request structure
      // This is a placeholder - actual validation depends on MediaWiki OAuth extension
      return !!request.client_id && !!request.redirect_uri;
    } catch (error) {
      logger.error("MediaWiki request validation error", error);
      return false;
    }
  }

  /**
   * Generate MediaWiki-compatible session token
   */
  generateMediaWikiSession(userId: string): string {
    // Generate a session token compatible with MediaWiki
    // This is a placeholder - actual implementation depends on MediaWiki requirements
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${userId}_${timestamp}_${random}`;
  }
}

export const mediaWikiIntegration = new MediaWikiIntegration();
