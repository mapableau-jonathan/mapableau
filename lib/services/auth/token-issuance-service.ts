/**
 * Token Issuance Service
 * Centralized JWT token issuance with service validation and authorization
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { serviceRegistry, ServiceId } from "./service-registry";
import { generateTokenPair, JWTPayload } from "@/lib/auth/jwt-service";
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
        serviceType: request.serviceId.toUpperCase() as any,
        isActive: true,
      },
    });

    // Generate JWT tokens
    const tokens = generateTokenPair({
      sub: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role,
      serviceAccess: [request.serviceId, ...serviceLinks.map((link) => link.serviceType.toLowerCase())],
    });

    // Store token metadata (not the token itself)
    // Note: You may want to create a Token model in Prisma for this
    // For now, we'll log it for audit purposes
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
 * Validate token
 */
export async function validateToken(
  token: string,
  serviceId: ServiceId
): Promise<{
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}> {
  try {
    const { verifyToken } = await import("@/lib/auth/jwt-service");
    const payload = verifyToken(token);

    // Validate service access
    if (!payload.serviceAccess?.includes(serviceId)) {
      return {
        valid: false,
        error: "Token not valid for this service",
      };
    }

    // Check if token is revoked (would need Token model for this)
    // For now, we'll assume tokens are valid if they pass JWT verification

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
 * Revoke token
 */
export async function revokeToken(
  tokenId: string,
  serviceId: ServiceId
): Promise<{ success: boolean; error?: string }> {
  try {
    // Log revocation
    logger.info("Token revoked", {
      tokenId,
      serviceId,
      revokedAt: new Date().toISOString(),
    });

    // In a full implementation, you would:
    // 1. Store revoked tokens in database
    // 2. Check revocation list during validation
    // 3. Clean up expired revoked tokens periodically

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
    const { sub: userId } = verifyRefreshToken(refreshToken);

    // Get user's service links to determine scopes
    const serviceLinks = await prisma.serviceLink.findMany({
      where: {
        userId,
        serviceType: serviceId.toUpperCase() as any,
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
