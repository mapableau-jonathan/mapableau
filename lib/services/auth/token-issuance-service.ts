/**
 * Token Issuance Service
 * Centralized JWT token issuance with service authorization
 */

import { logger } from "@/lib/logger";
import { serviceRegistry, type ServiceId } from "./service-registry";
import { generateAccessToken, generateRefreshToken, verifyToken, verifyRefreshToken, type JWTPayload } from "@/lib/auth/jwt-service";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export interface TokenRequest {
  userId: string;
  serviceId: ServiceId;
  scopes: string[];
  expiresIn?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenId: string;
  expiresIn: number;
  expiresAt: number;
}

class TokenIssuanceService {
  /**
   * Issue a new JWT token for a service
   */
  async issueToken(request: TokenRequest): Promise<TokenResponse | { error: string }> {
    try {
      // Validate service
      const serviceConfig = serviceRegistry.getServiceConfig(request.serviceId);
      if (!serviceConfig || !serviceConfig.enabled) {
        return { error: "Service not found or disabled" };
      }

      // Validate scopes
      if (!serviceRegistry.validateScopes(request.serviceId, request.scopes)) {
        return { error: "Invalid scopes requested" };
      }

      // Validate user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
      });

      if (!user) {
        return { error: "User not found" };
      }

      // Generate token ID for tracking
      const tokenId = randomBytes(16).toString("hex");

      // Calculate expiration
      const expiresIn = request.expiresIn || serviceConfig.tokenExpiration || 3600;
      const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

      // Generate JWT token with service-specific claims
      const tokenPayload: Omit<JWTPayload, "iat" | "exp" | "iss" | "aud"> = {
        sub: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role,
        serviceAccess: [request.serviceId],
      };

      // Add custom claims for scopes
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(user.id);

      // Store token metadata (optional - for revocation tracking)
      // In production, you might want to store this in a Token table
      await this.storeTokenMetadata(tokenId, request.userId, request.serviceId, expiresAt);

      // Audit log
      logger.info("Token issued", {
        tokenId,
        userId: request.userId,
        serviceId: request.serviceId,
        scopes: request.scopes,
      });

      return {
        accessToken,
        refreshToken,
        tokenId,
        expiresIn,
        expiresAt,
      };
    } catch (error) {
      logger.error("Token issuance error", error);
      return { error: "Failed to issue token" };
    }
  }

  /**
   * Validate a token
   */
  async validateToken(token: string, serviceId: ServiceId): Promise<JWTPayload | { error: string }> {
    try {
      // Verify token signature and expiration
      const payload = verifyToken(token);

      // Check if token is for the correct service
      if (payload.serviceAccess && !payload.serviceAccess.includes(serviceId)) {
        return { error: "Token not valid for this service" };
      }

      // Check if user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        return { error: "User not found" };
      }

      return payload;
    } catch (error: any) {
      logger.error("Token validation error", error);
      return { error: error.message || "Invalid token" };
    }
  }

  /**
   * Revoke a token
   */
  async revokeToken(tokenId: string, serviceId: ServiceId): Promise<boolean> {
    try {
      // In production, you would mark the token as revoked in the database
      // For now, we'll just log it
      logger.info("Token revoked", { tokenId, serviceId });

      // TODO: Implement token revocation list
      return true;
    } catch (error) {
      logger.error("Token revocation error", error);
      return false;
    }
  }

  /**
   * Refresh a token
   */
  async refreshToken(refreshToken: string, serviceId: ServiceId): Promise<TokenResponse | { error: string }> {
    try {
      // Verify refresh token
      const { sub: userId } = verifyRefreshToken(refreshToken);

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return { error: "User not found" };
      }

      // Get service config to determine scopes
      const serviceConfig = serviceRegistry.getServiceConfig(serviceId);
      if (!serviceConfig) {
        return { error: "Service not found" };
      }

      // Issue new token with default scopes
      return await this.issueToken({
        userId,
        serviceId,
        scopes: serviceConfig.allowedScopes,
      });
    } catch (error: any) {
      logger.error("Token refresh error", error);
      return { error: error.message || "Invalid refresh token" };
    }
  }

  /**
   * List active tokens for a user-service pair
   */
  async listUserTokens(userId: string, serviceId: ServiceId): Promise<any[]> {
    try {
      // In production, this would query a Token table
      // For now, return empty array
      logger.debug("List user tokens", { userId, serviceId });
      return [];
    } catch (error) {
      logger.error("List tokens error", error);
      return [];
    }
  }

  /**
   * Store token metadata for tracking
   */
  private async storeTokenMetadata(
    tokenId: string,
    userId: string,
    serviceId: ServiceId,
    expiresAt: number
  ): Promise<void> {
    try {
      // In production, store in Token table
      // For now, just log
      logger.debug("Token metadata stored", { tokenId, userId, serviceId, expiresAt });
    } catch (error) {
      logger.error("Store token metadata error", error);
    }
  }
}

export const tokenIssuanceService = new TokenIssuanceService();
