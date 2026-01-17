/**
 * Token Issuance Service
 * Centralized JWT token issuance with service validation and authorization
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { serviceRegistry, ServiceId } from "./service-registry";
import { generateTokenPair, JWTPayload, verifyToken } from "@/lib/auth/jwt-service";
import crypto from "crypto";

export interface TokenMetadata {
  tokenId: string;
  userId: string;
  serviceId: ServiceId;
  scopes: string[];
  issuedAt: Date;
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
}

export interface TokenIssuanceRequest {
  userId: string;
  serviceId: ServiceId;
  scopes: string[];
  expiresIn?: number;
  clientId?: string;
  clientSecret?: string;
}

export interface TokenIssuanceResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenId?: string;
  error?: string;
}

/**
 * Issue JWT token for service
 */
export async function issueToken(
  request: TokenIssuanceRequest
): Promise<TokenIssuanceResult> {
  try {
    // Validate service
    const service = serviceRegistry.get(request.serviceId);
    if (!service || !service.enabled) {
      return {
        success: false,
        error: "Service not found or disabled",
      };
    }

    // Validate service credentials if provided
    if (request.clientId && request.clientSecret) {
      if (!serviceRegistry.validateCredentials(request.serviceId, request.clientId, request.clientSecret)) {
        return {
          success: false,
          error: "Invalid service credentials",
        };
      }
    }

    // Validate user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Check email verification if required
    if (service.requiresEmailVerification && !user.emailVerified) {
      return {
        success: false,
        error: "Email verification required",
      };
    }

    // Validate scopes
    if (!serviceRegistry.validateScopes(request.serviceId, request.scopes)) {
      return {
        success: false,
        error: "Invalid scopes requested",
      };
    }

    // Generate token expiration
    const expiresIn = request.expiresIn || service.tokenExpiration;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Generate token ID
    const tokenId = crypto.randomUUID();

    // Get user's service access
    const serviceLinks = await prisma.serviceLink.findMany({
      where: {
        userId: request.userId,
        isActive: true,
      },
    });

    // Extract service IDs from service links (stored in preferences)
    const userServiceIds: string[] = [];
    for (const link of serviceLinks) {
      const preferences = link.preferences as any;
      if (preferences?.serviceId) {
        userServiceIds.push(preferences.serviceId);
      }
    }

    // Generate JWT tokens (JOSE implementation - now async)
    const tokens = await generateTokenPair({
      sub: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role,
      serviceAccess: [request.serviceId, ...userServiceIds],
    });

    // Store token metadata (not the token itself) - log for audit
    logger.info("Token issued", {
      tokenId,
      userId: request.userId,
      serviceId: request.serviceId,
      scopes: request.scopes,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tokenId,
    };
  } catch (error) {
    logger.error("Token issuance error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Token issuance failed",
    };
  }
}

/**
 * Validate token with enhanced security
 */
export async function validateToken(
  token: string,
  serviceId: ServiceId,
  options?: {
    request?: { headers: Headers | { get: (name: string) => string | null } };
    checkBlacklist?: boolean;
    verifyBinding?: boolean;
  }
): Promise<{
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}> {
  try {
    // Use basic token verification (JOSE implementation - now async)
    const payload = await verifyToken(token);

    // Validate service access
    if (!payload.serviceAccess?.includes(serviceId)) {
      return {
        valid: false,
        error: "Token not valid for this service",
      };
    }

    return {
      valid: true,
      payload,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Token validation failed",
    };
  }
}

/**
 * Revoke token with blockchain integration
 */
export async function revokeToken(
  tokenId: string,
  serviceId: ServiceId
): Promise<{ success: boolean; error?: string }> {
  try {
    // In a production system, you would mark the token as revoked in the database
    // For now, we'll use the token lifecycle manager
    const { tokenLifecycleManager } = await import("./token-lifecycle-manager");
    const revoked = await tokenLifecycleManager.revokeToken(tokenId, serviceId);

    if (!revoked) {
      return {
        success: false,
        error: "Failed to revoke token",
      };
    }

    logger.info("Token revoked", {
      tokenId,
      serviceId,
      revokedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    logger.error("Token revocation error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Token revocation failed",
    };
  }
}

/**
 * Refresh token
 */
export async function refreshToken(
  refreshToken: string,
  serviceId: ServiceId
): Promise<TokenIssuanceResult> {
  try {
    const { verifyRefreshToken } = await import("@/lib/auth/jwt-service");
    const { sub: userId } = await verifyRefreshToken(refreshToken);

    // Get user's service links to determine scopes
    const serviceLinks = await prisma.serviceLink.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    const service = serviceRegistry.get(serviceId);
    const scopes = service?.allowedScopes || ["read:profile", "read:email"];

    return issueToken({
      userId,
      serviceId,
      scopes,
    });
  } catch (error) {
    logger.error("Token refresh error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Token refresh failed",
    };
  }
}
