/**
 * Token Lifecycle Manager
 * Manages token expiration, revocation, and rotation
 */

import { logger } from "@/lib/logger";
import { tokenIssuanceService } from "./token-issuance-service";
import type { ServiceId } from "./service-registry";

class TokenLifecycleManager {
  private revocationList: Set<string> = new Set();
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize token lifecycle management
   */
  initialize(): void {
    // Start cleanup job
    this.startCleanupJob();
  }

  /**
   * Check if token is revoked
   */
  isTokenRevoked(tokenId: string): boolean {
    return this.revocationList.has(tokenId);
  }

  /**
   * Revoke a token
   */
  async revokeToken(tokenId: string, serviceId: ServiceId): Promise<boolean> {
    try {
      // Add to revocation list
      this.revocationList.add(tokenId);

      // Call token issuance service to revoke
      await tokenIssuanceService.revokeToken(tokenId, serviceId);

      logger.info("Token revoked", { tokenId, serviceId });
      return true;
    } catch (error) {
      logger.error("Token revocation error", error);
      return false;
    }
  }

  /**
   * Rotate a token (issue new token, revoke old one)
   */
  async rotateToken(
    oldTokenId: string,
    userId: string,
    serviceId: ServiceId,
    scopes: string[]
  ): Promise<{ accessToken: string; refreshToken: string; tokenId: string } | { error: string }> {
    try {
      // Issue new token
      const newTokenResult = await tokenIssuanceService.issueToken({
        userId,
        serviceId,
        scopes,
      });

      if ("error" in newTokenResult) {
        return newTokenResult;
      }

      // Revoke old token
      await this.revokeToken(oldTokenId, serviceId);

      return {
        accessToken: newTokenResult.accessToken,
        refreshToken: newTokenResult.refreshToken,
        tokenId: newTokenResult.tokenId,
      };
    } catch (error) {
      logger.error("Token rotation error", error);
      return { error: "Failed to rotate token" };
    }
  }

  /**
   * Start cleanup job for expired tokens
   */
  private startCleanupJob(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000);
  }

  /**
   * Cleanup expired tokens from revocation list
   */
  private cleanupExpiredTokens(): void {
    try {
      // In production, you would query the database for expired tokens
      // and remove them from the revocation list
      // For now, we'll just log
      logger.debug("Token cleanup job running", {
        revocationListSize: this.revocationList.size,
      });

      // Clear revocation list periodically (tokens should be expired by now)
      // In production, you'd check expiration dates
      if (this.revocationList.size > 10000) {
        this.revocationList.clear();
        logger.info("Revocation list cleared");
      }
    } catch (error) {
      logger.error("Token cleanup error", error);
    }
  }

  /**
   * Stop cleanup job
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const tokenLifecycleManager = new TokenLifecycleManager();

// Initialize on module load
tokenLifecycleManager.initialize();
