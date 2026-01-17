/**
 * Token Lifecycle Manager
 * Manages token expiration, revocation, rotation, and cleanup
 */

import { logger } from "@/lib/logger";
import { ServiceId } from "./service-registry";

export interface TokenLifecycleConfig {
  tokenExpiration: number; // seconds
  refreshTokenExpiration: number; // seconds
  rotationInterval?: number; // seconds - rotate tokens before expiration
  cleanupInterval: number; // seconds - how often to run cleanup
}

/**
 * Token Lifecycle Manager
 * Handles token expiration, revocation, and cleanup
 */
class TokenLifecycleManager {
  private revokedTokens: Set<string> = new Set();
  private cleanupInterval?: NodeJS.Timeout;

  /**
   * Start token lifecycle management
   */
  start(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Stop token lifecycle management
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Add token to revocation list
   */
  revokeToken(tokenId: string): void {
    this.revokedTokens.add(tokenId);
    logger.info("Token added to revocation list", { tokenId });
  }

  /**
   * Check if token is revoked
   */
  isTokenRevoked(tokenId: string): boolean {
    return this.revokedTokens.has(tokenId);
  }

  /**
   * Clean up expired tokens from revocation list
   * In a full implementation, this would clean up database records
   */
  private cleanupExpiredTokens(): void {
    // In a full implementation, you would:
    // 1. Query database for expired tokens
    // 2. Remove them from revocation list
    // 3. Clean up token metadata records
    
    logger.info("Token cleanup completed", {
      revokedTokensCount: this.revokedTokens.size,
    });
  }

  /**
   * Check if token should be rotated
   */
  shouldRotateToken(issuedAt: Date, rotationInterval?: number): boolean {
    if (!rotationInterval) return false;
    const now = Date.now();
    const issued = issuedAt.getTime();
    return now - issued >= rotationInterval * 1000;
  }

  /**
   * Get token expiration date
   */
  getExpirationDate(issuedAt: Date, expirationSeconds: number): Date {
    return new Date(issuedAt.getTime() + expirationSeconds * 1000);
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(expiresAt: Date): boolean {
    return Date.now() >= expiresAt.getTime();
  }
}

// Singleton instance
export const tokenLifecycleManager = new TokenLifecycleManager();

// Start lifecycle management on module load
if (typeof window === "undefined") {
  tokenLifecycleManager.start();
}
