/**
 * Rate Limiting Middleware
 * Prevents abuse and ensures fair resource usage
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (for development)
// In production, use Redis for distributed rate limiting
const rateLimitStore: RateLimitStore = {};

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";

  // In production, also consider user ID for authenticated requests
  return ip;
}

/**
 * Clean up expired entries from rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  }
}

/**
 * Rate limit middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const clientId = getClientId(request);
    const now = Date.now();

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to cleanup on each request
      cleanupExpiredEntries();
    }

    // Get or create rate limit entry
    let entry = rateLimitStore[clientId];

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      rateLimitStore[clientId] = entry;
    }

    // Increment request count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      return NextResponse.json(
        {
          error: config.message || "Too many requests",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": config.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(entry.resetTime).toISOString(),
          },
        }
      );
    }

    // Add rate limit headers
    const remaining = Math.max(0, config.maxRequests - entry.count);
    return NextResponse.next({
      headers: {
        "X-RateLimit-Limit": config.maxRequests.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": new Date(entry.resetTime).toISOString(),
      },
    });
  };
}

/**
 * API rate limit (general API endpoints)
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: "Too many API requests. Please try again later.",
});

/**
 * Strict rate limit (sensitive operations like payments)
 */
export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  message: "Too many requests. Please wait before trying again.",
});

/**
 * Authentication rate limit (login attempts)
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: "Too many login attempts. Please try again later.",
});

/**
 * Payment rate limit (payment operations)
 */
export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 payments per minute
  message: "Too many payment requests. Please wait before trying again.",
});

/**
 * Redis-based rate limiter (for production)
 * This would be used when Redis is available
 */
export class RedisRateLimiter {
  private redis: any; // Redis client

  constructor(redisClient: any) {
    this.redis = redisClient;
  }

  async checkLimit(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;
    
    try {
      const count = await this.redis.incr(windowKey);
      await this.redis.expire(windowKey, Math.ceil(windowMs / 1000));

      const remaining = Math.max(0, maxRequests - count);
      const resetTime = (Math.floor(now / windowMs) + 1) * windowMs;

      return {
        allowed: count <= maxRequests,
        remaining,
        resetTime,
      };
    } catch (error) {
      // If Redis fails, allow the request (fail open)
      console.error("Redis rate limit error:", error);
      return {
        allowed: true,
        remaining: maxRequests,
        resetTime: now + windowMs,
      };
    }
  }
}
