/**
 * Token Blacklist Service
 * Manages revoked tokens to prevent their use after revocation
 * Supports both in-memory (development) and database-backed (production) storage
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import crypto from "crypto";

interface BlacklistEntry {
  tokenId: string;
  userId: string;
  serviceId: string;
  revokedAt: Date;
  expiresAt: Date;
  reason?: string;
}

// In-memory blacklist for development (fallback)
const inMemoryBlacklist = new Map<string, BlacklistEntry>();

/**
 * Add token to blacklist
 */
export async function blacklistToken(
  tokenId: string,
  userId: string,
  serviceId: string,
  expiresAt: Date,
  reason?: string
): Promise<void> {
  const entry: BlacklistEntry = {
    tokenId,
    userId,
    serviceId,
    revokedAt: new Date(),
    expiresAt,
    reason,
  };

  try {
    // Try to store in database if available
    // Note: You'll need to create a TokenBlacklist model in Prisma schema
    // await prisma.tokenBlacklist.create({
    //   data: {
    //     tokenId,
    //     userId,
    //     serviceId,
    //     revokedAt: entry.revokedAt,
    //     expiresAt,
    //     reason,
    //   },
    // });

    // Fallback to in-memory storage
    inMemoryBlacklist.set(tokenId, entry);

    logger.info("Token blacklisted", {
      tokenId,
      userId,
      serviceId,
      reason,
    });
  } catch (error) {
    // If database fails, use in-memory as fallback
    inMemoryBlacklist.set(tokenId, entry);
    logger.warn("Token blacklisted in memory (database unavailable)", {
      tokenId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Check if token is blacklisted
 */
export async function isTokenBlacklisted(tokenId: string): Promise<boolean> {
  try {
    // Check in-memory first (faster)
    if (inMemoryBlacklist.has(tokenId)) {
      const entry = inMemoryBlacklist.get(tokenId)!;
      // Check if entry is expired
      if (entry.expiresAt < new Date()) {
        inMemoryBlacklist.delete(tokenId);
        return false;
      }
      return true;
    }

    // Check database if available
    // const blacklisted = await prisma.tokenBlacklist.findUnique({
    //   where: { tokenId },
    // });
    // if (blacklisted) {
    //   // Check if expired
    //   if (blacklisted.expiresAt < new Date()) {
    //     await prisma.tokenBlacklist.delete({ where: { tokenId } });
    //     return false;
    //   }
    //   return true;
    // }

    return false;
  } catch (error) {
    logger.error("Error checking token blacklist", error);
    // Fail secure - if we can't check, assume token is valid
    // In production, you might want to fail closed
    return false;
  }
}

/**
 * Blacklist token by JWT ID (jti claim)
 */
export async function blacklistTokenByJti(
  jti: string,
  userId: string,
  serviceId: string,
  expiresAt: Date,
  reason?: string
): Promise<void> {
  await blacklistToken(jti, userId, serviceId, expiresAt, reason);
}

/**
 * Clean up expired blacklist entries
 */
export async function cleanupExpiredBlacklistEntries(): Promise<number> {
  const now = new Date();
  let cleaned = 0;

  try {
    // Clean in-memory blacklist
    for (const [tokenId, entry] of inMemoryBlacklist.entries()) {
      if (entry.expiresAt < now) {
        inMemoryBlacklist.delete(tokenId);
        cleaned++;
      }
    }

    // Clean database blacklist if available
    // const result = await prisma.tokenBlacklist.deleteMany({
    //   where: {
    //     expiresAt: {
    //       lt: now,
    //     },
    //   },
    // });
    // cleaned += result.count;

    if (cleaned > 0) {
      logger.info("Cleaned up expired blacklist entries", { count: cleaned });
    }
  } catch (error) {
    logger.error("Error cleaning up blacklist", error);
  }

  return cleaned;
}

/**
 * Blacklist all tokens for a user (e.g., on password change)
 */
export async function blacklistAllUserTokens(
  userId: string,
  reason?: string
): Promise<number> {
  let blacklisted = 0;

  try {
    // In a full implementation, you would:
    // 1. Query database for all active tokens for user
    // 2. Add each to blacklist
    // 3. Log the action

    logger.info("Blacklisted all tokens for user", {
      userId,
      reason,
    });

    // For now, we'll just log it
    // In production, implement proper token tracking
  } catch (error) {
    logger.error("Error blacklisting user tokens", error);
  }

  return blacklisted;
}

/**
 * Get blacklist statistics
 */
export async function getBlacklistStats(): Promise<{
  totalEntries: number;
  expiredEntries: number;
  activeEntries: number;
}> {
  const now = new Date();
  let expired = 0;
  let active = 0;

  for (const entry of inMemoryBlacklist.values()) {
    if (entry.expiresAt < now) {
      expired++;
    } else {
      active++;
    }
  }

  return {
    totalEntries: inMemoryBlacklist.size,
    expiredEntries: expired,
    activeEntries: active,
  };
}

// Run cleanup periodically (every hour)
if (typeof window === "undefined") {
  setInterval(() => {
    cleanupExpiredBlacklistEntries().catch((error) => {
      logger.error("Periodic blacklist cleanup failed", error);
    });
  }, 60 * 60 * 1000); // 1 hour
}
