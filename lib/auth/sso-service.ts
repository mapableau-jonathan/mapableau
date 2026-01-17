/**
 * SSO Service
 * Centralized Single Sign-On service for all Australian Disability Ltd services
 */

import { prisma } from "@/lib/prisma";
import { generateTokenPair, JWTPayload } from "./jwt-service";
import { logger } from "@/lib/logger";

export interface SSOSession {
  id: string;
  userId: string;
  serviceId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Create SSO session for a user across services
 */
export async function createSSOSession(
  userId: string,
  serviceIds: string[] = ["all"]
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Generate token pair with service access
    const tokenPair = generateTokenPair({
      sub: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role,
      serviceAccess: serviceIds,
    });

    // Store session in database (optional, for session management)
    // You can implement session storage here if needed

    return tokenPair;
  } catch (error) {
    logger.error("SSO session creation error", error);
    throw error;
  }
}

/**
 * Validate SSO session and return user info
 */
export async function validateSSOSession(accessToken: string): Promise<{
  userId: string;
  email: string;
  serviceAccess: string[];
}> {
  try {
    const { verifyToken } = await import("./jwt-service");
    const payload = verifyToken(accessToken);

    return {
      userId: payload.sub,
      email: payload.email,
      serviceAccess: payload.serviceAccess || [],
    };
  } catch (error) {
    logger.error("SSO session validation error", error);
    throw error;
  }
}

/**
 * Get available services for a user
 */
export async function getUserServices(userId: string): Promise<string[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        serviceLinks: {
          where: { isActive: true },
        },
      },
    });

    if (!user) {
      return [];
    }

    // Map service types to service IDs
    const services = user.serviceLinks.map((link) => link.serviceType.toLowerCase());

    // Add "all" if user has admin role
    if (user.role === "NDIA_ADMIN") {
      services.push("all");
    }

    return services;
  } catch (error) {
    logger.error("Get user services error", error);
    return [];
  }
}

/**
 * Check if user has access to a specific service
 */
export async function hasServiceAccess(userId: string, serviceId: string): Promise<boolean> {
  const services = await getUserServices(userId);
  return services.includes(serviceId) || services.includes("all");
}
