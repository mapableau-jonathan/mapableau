/**
 * User Info Service
 * Serves user information to MediaWiki and Cursor/Replit applications
 */

import { userDataManager } from "./user-data-manager";
import { tokenIssuanceService } from "./token-issuance-service";
import { serviceRegistry, type ServiceId } from "./service-registry";
import { logger } from "@/lib/logger";
import { extractTokenFromHeader } from "@/lib/auth/jwt-service";

export interface UserInfoRequest {
  userId: string;
  serviceId: ServiceId;
  fields?: string[];
  format?: "json" | "mediawiki";
}

class UserInfoService {
  /**
   * Get user information for a service
   */
  async getUserInfo(
    request: UserInfoRequest,
    authToken?: string
  ): Promise<any | { error: string }> {
    try {
      // Validate service
      if (!serviceRegistry.isServiceEnabled(request.serviceId)) {
        return { error: "Service not found or disabled" };
      }

      // If auth token provided, validate it
      if (authToken) {
        const validationResult = await tokenIssuanceService.validateToken(
          authToken,
          request.serviceId
        );

        if ("error" in validationResult) {
          return { error: "Invalid or expired token" };
        }

        // Verify token is for the requested user
        if (validationResult.sub !== request.userId) {
          return { error: "Token not valid for this user" };
        }
      }

      // Get user data
      const userData = await userDataManager.getUserData(
        request.userId,
        request.serviceId,
        request.fields
      );

      if (!userData) {
        return { error: "User not found or access denied" };
      }

      // Format response based on requested format
      if (request.format === "mediawiki") {
        return this.formatForMediaWiki(userData);
      }

      return userData;
    } catch (error) {
      logger.error("Get user info error", error);
      return { error: "Failed to get user information" };
    }
  }

  /**
   * Get user information from Authorization header
   */
  async getUserInfoFromToken(authHeader: string | null, serviceId: ServiceId): Promise<any | { error: string }> {
    try {
      const token = extractTokenFromHeader(authHeader);
      if (!token) {
        return { error: "Token required" };
      }

      // Validate token
      const validationResult = await tokenIssuanceService.validateToken(token, serviceId);
      if ("error" in validationResult) {
        return { error: validationResult.error };
      }

      // Get user data
      return await this.getUserInfo(
        {
          userId: validationResult.sub,
          serviceId,
        },
        token
      );
    } catch (error) {
      logger.error("Get user info from token error", error);
      return { error: "Failed to get user information" };
    }
  }

  /**
   * Format user data for MediaWiki
   */
  private formatForMediaWiki(userData: any): any {
    return {
      id: userData.id,
      username: userData.name || userData.email?.split("@")[0] || "user",
      email: userData.email,
      realname: userData.name || "",
      avatar: userData.image || "",
      verified: userData.emailVerified || false,
    };
  }

  /**
   * Batch get user information
   */
  async batchGetUserInfo(
    userIds: string[],
    serviceId: ServiceId,
    fields?: string[]
  ): Promise<any[]> {
    try {
      // Validate service
      if (!serviceRegistry.isServiceEnabled(serviceId)) {
        return [];
      }

      // Limit batch size
      const limitedUserIds = userIds.slice(0, 100);

      // Get user data for each user
      const results = await Promise.all(
        limitedUserIds.map((userId) =>
          userDataManager.getUserData(userId, serviceId, fields)
        )
      );

      return results.filter((result) => result !== null);
    } catch (error) {
      logger.error("Batch get user info error", error);
      return [];
    }
  }
}

export const userInfoService = new UserInfoService();
