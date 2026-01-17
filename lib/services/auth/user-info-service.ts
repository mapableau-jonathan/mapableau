/**
 * User Info Service
 * Provides user information to MediaWiki and Cursor/Replit applications
 */

import { getUserData, UserData } from "./user-data-manager";
import { ServiceId } from "./service-registry";
import { logger } from "@/lib/logger";

export interface UserInfoResponse {
  id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified: boolean;
  providers: string[];
  services: string[];
  wixData?: {
    memberId?: string;
    customFields?: Record<string, any>;
    roles?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface MediaWikiUserInfo {
  username: string;
  email: string;
  realname: string;
  groups?: string[];
}

/**
 * Get user information for service
 */
export async function getUserInfo(
  userId: string,
  requestingService: ServiceId,
  fields?: string[],
  format: "json" | "mediawiki" = "json"
): Promise<UserInfoResponse | MediaWikiUserInfo | null> {
  try {
    const userData = await getUserData(userId, requestingService, fields);

    if (!userData) {
      return null;
    }

    // Get user's providers
    const { prisma } = await import("@/lib/prisma");
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { provider: true },
    });
    const providers = accounts.map((acc) => acc.provider);

    // Get user's services
    const serviceLinks = await prisma.serviceLink.findMany({
      where: { userId, isActive: true },
      select: { serviceType: true },
    });
    const services = serviceLinks.map((link) => link.serviceType.toLowerCase());

    if (format === "mediawiki") {
      // Return MediaWiki-compatible format
      return {
        username: userData.email.split("@")[0], // Use email prefix as username
        email: userData.email,
        realname: userData.name || userData.email,
        groups: userData.role ? [userData.role.toLowerCase()] : [],
      } as MediaWikiUserInfo;
    }

    // Return JSON format
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      image: userData.image,
      emailVerified: !!userData.emailVerified,
      providers,
      services,
      wixData: userData.wixData,
      createdAt: userData.createdAt.toISOString(),
      updatedAt: userData.updatedAt.toISOString(),
    } as UserInfoResponse;
  } catch (error) {
    logger.error("Error getting user info", error);
    return null;
  }
}

/**
 * Get batch user information
 */
export async function getBatchUserInfo(
  userIds: string[],
  requestingService: ServiceId,
  fields?: string[]
): Promise<(UserInfoResponse | null)[]> {
  try {
    const results = await Promise.all(
      userIds.map((userId) => getUserInfo(userId, requestingService, fields))
    );
    return results;
  } catch (error) {
    logger.error("Error getting batch user info", error);
    return userIds.map(() => null);
  }
}
